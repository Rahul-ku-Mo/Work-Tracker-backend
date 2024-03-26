const { prisma } = require("../db");

// const GoogleStrategy = require("passport-google-oauth20").Strategy;
// const passport = require("passport");
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
      },
      select: {
        id: true,
        email: true,
      },
    });

    const token = this.createSendToken(user, res);

    res.status(201).json({
      message: "success",
      data: user,
      token,
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

  const token = this.createSendToken(user, res);
  //eliminate the password field!!
  user.password = undefined;

  res.status(200).json({
    message: "success",
    accesstoken: token,
    data: user,
  });
};

exports.oauthGoogleLogin = async (req, res) => {
  const { tokens } = await oAuth2Client.getToken(req.body.code);
  const user = authenticateTokenFromGoogle(tokens.id_token);

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
      password: false, // Exclude password
    },
  });

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
        "*": true,
        password: false,
      },
    });
  }

  const token = this.createSendToken(existingUser, res);

  return res
    .status(200)
    .json({ message: "success", data: existingUser, token });
};
