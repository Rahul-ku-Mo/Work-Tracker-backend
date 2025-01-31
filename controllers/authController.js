const { prisma } = require("../db");
const jwt = require("jsonwebtoken");
const { oAuth2Client } = require("../services/GoogleAuth");
const {
  signToken,
  hashedPassword,
  validatePassword,
  authenticateTokenFromGoogle,
} = require("../utils/validation");

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
  const { email, password, username } = req.body;

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
    const user = await prisma.user.create({
      data: {
        email: email,
        password: cryptPassword,
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
        role: true,
        updatedAt: true,
        password: false,
        isPaidUser: true,
      },
    });

    const accesstoken = this.createSendToken(user, res);

    res.status(201).json({
      message: "success",
      data: user,
      accesstoken,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
  try {
    // Get the tokens from Google
    const { tokens } = await oAuth2Client.getToken(req.body.code);

    // Authenticate the token to get user details
    const user = authenticateTokenFromGoogle(tokens.id_token);

    // Check if the user already exists
    let existingUser = await prisma.user.findUnique({
      where: {
        email: user.email,
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
      },
    });

    // If user does not exist, create a new user
    if (!existingUser) {
      const username = `${user.name}_worktracker`; // Create username

      existingUser = await prisma.user.create({
        data: {
          email: user.email,
          imageUrl: user.picture,
          name: user.name,
          username: username,
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
        },
      });
    }

    // Create and send token
    const accesstoken = this.createSendToken(existingUser, res);

    return res
      .status(200)
      .json({ message: "success", data: existingUser, accesstoken });
  } catch (error) {
    console.error("Error during Google login:", error);
    return res
      .status(500)
      .json({ message: "An error occurred during Google login." });
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
        return res.status(403).json({ message: "Invalid or expired token", data: null });
      }

      const user = await prisma.user.findUnique({
        where: { id: decodedToken.userId },
        select: {
          role: true,
        },
      });

      return res.status(200).json({ message: "success", data: user.role });
    });
  } catch (error) {
    console.error("Error verifying token:", error);
    return res.status(500).json({ message: "Error verifying token" });
  }
};
