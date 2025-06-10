const { prisma } = require("../db");
const jwt = require("jsonwebtoken");
const {
  signToken,
  hashedPassword,
  validatePassword,
  authenticateTokenFromGoogle,
} = require("../utils/validation");
const axios = require("axios");

exports.createSendToken = (user, res) => {
  const token = signToken(user.id);

  const CookieOptions = {
    expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") {
    CookieOptions.secure = true;
  }

  res.cookie("jwt", token, CookieOptions);

  return token;
};

exports.signup = async (req, res) => {
  const { email, password, username, inviteCode } = req.body;

  //1.check for existing user
  const existingUser = await prisma.user.findUnique({
    where: { email: email },
  });

  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }

  //2.if not an existing user hash the password and store it in the database
  const cryptPassword = await hashedPassword(password);

  //3.create the user and store it in the database
  try {
    // Check if invite code is provided and valid
    let teamToJoin = null;
    if (inviteCode && inviteCode.trim()) {
      teamToJoin = await prisma.team.findUnique({
        where: { joinCode: inviteCode.trim().toUpperCase() }
      });
      
      if (!teamToJoin) {
        return res.status(400).json({ 
          message: "Invalid invite code. Please check the code and try again." 
        });
      }
    }

    const user = await prisma.user.create({
      data: {
        email: email,
        password: cryptPassword,
        username: username,
        role: teamToJoin ? "USER" : "ADMIN", // If joining via invite, make them USER, otherwise ADMIN
        teamId: teamToJoin ? teamToJoin.id : null, // Auto-join team if invite code is valid
      },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        boards: true,
        comments: true,
        imageUrl: true,
        createdAt: true,
        phoneNumber: true,
        state: true,
        address: true,
        zipCode: true,
        company: true,
        role: true,
        updatedAt: true,
        password: false,
        isPaidUser: true,
        team: {
          select: {
            id: true,
            name: true,
            joinCode: true
          }
        }
      },
    });

    const accesstoken = this.createSendToken(user, res);

    let responseMessage = "Account created successfully";
    if (teamToJoin) {
      responseMessage = `Account created successfully and joined team: ${teamToJoin.name}`;
    }

    res.status(201).json({
      message: responseMessage,
      data: user,
      accesstoken,
    });
  } catch (error) {
    console.error('Signup error:', error);
    
    // Handle specific database errors
    if (error.code === 'P2002') {
      if (error.meta?.target?.includes('email')) {
        return res.status(400).json({ 
          message: "An account with this email already exists. Please try logging in instead." 
        });
      }
      if (error.meta?.target?.includes('username')) {
        return res.status(400).json({ 
          message: "This username is already taken. Please choose a different one." 
        });
      }
    }
    
    res.status(500).json({ 
      message: "Account creation failed. Please check your information and try again." 
    });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res
      .status(400)
      .json({ status: 400, message: "Please provide a email and password" });

  const user = await prisma.user.findUnique({
    where: { email: email },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          joinCode: true
        }
      }
    }
  });

  if (!user)
    return res
      .status(401)
      .json({ status: 401, message: "Invalid email. Check again!" });

  const passwordMatch = await validatePassword(password, user.password);

  if (!passwordMatch) {
    return res
      .status(401)
      .json({ status: 401, message: "Invalid password. Check again!" });
  }

  const accesstoken = this.createSendToken(user, res);
  //eliminate the password field!!
  user.password = undefined;

  res.status(200).json({
    message: "success",
    accesstoken,
    data: user,
  });
};

exports.oauthGoogleLogin = async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ message: "Authorization code is required" });
  }

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await axios.post(
      "https://oauth2.googleapis.com/token",
      {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri:
          process.env.GOOGLE_REDIRECT_URI ||
          "http://localhost:5173/auth/google/callback",
        grant_type: "authorization_code",
      }
    );

    // Get Google user info
    const { data: googleUser } = await axios.get(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` },
      }
    );

    // Check if the user already exists
    let existingUser = await prisma.user.findUnique({
      where: {
        email: googleUser.email,
      },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        boards: true,
        comments: true,
        imageUrl: true,
        createdAt: true,
        phoneNumber: true,
        state: true,
        address: true,
        zipCode: true,
        company: true,
        role: true,
        updatedAt: true,
        isPaidUser: true,
        password: false, // Exclude password
        team: {
          select: {
            id: true,
            name: true,
            joinCode: true
          }
        }
      },
    });

    // If user does not exist, create a new user
    if (!existingUser) {
      const username = `${googleUser.name}_worktracker`; // Create username

      existingUser = await prisma.user.create({
        data: {
          email: googleUser.email,
          imageUrl: googleUser.picture,
          name: googleUser.name,
          username: username,
          role: "ADMIN",
        },
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          boards: true,
          comments: true,
          imageUrl: true,
          createdAt: true,
          phoneNumber: true,
          state: true,
          address: true,
          zipCode: true,
          company: true,
          isPaidUser: true,
          role: true,
          updatedAt: true,
          password: false, // Exclude password
          team: {
            select: {
              id: true,
              name: true,
              joinCode: true
            }
          }
        },
      });
    }

    // Create JWT token for our application
    const access_token = this.createSendToken(existingUser, res);
    
    return res.status(200).json({
      message: "success",
      access_token,
    });
  } catch (error) {
    console.error("Error during Google login:", error);
    
    // Handle specific Google OAuth errors
    if (error.response?.status === 400) {
      return res.status(400).json({ 
        message: "Invalid Google authorization code. Please try signing in again." 
      });
    }
    
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        message: "Google authentication failed. Please check your credentials and try again." 
      });
    }
    
    return res.status(500).json({ 
      message: "Google sign-in is temporarily unavailable. Please try again or use email/password." 
    });
  }
};

exports.verifyTokenAndRole = async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No token found", data: null });
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
      if (err) {
        return res
          .status(403)
          .json({ message: "Invalid or expired token", data: null });
      }

      const user = await prisma.user.findUnique({
        where: { id: decodedToken.userId },
        select: {
          role: true,
        },
      });

      if (!user) {
        return res.status(404).json({ message: "User not found", data: null });
      }

      return res.status(200).json({ message: "success", data: user.role });
    });
  } catch (error) {
    console.error("Error verifying token:", error);
    return res.status(500).json({ message: "Error verifying token" });
  }
};

