const { prisma } = require("../db");
const {
  signToken,
  hashedPassword,
  validatePassword,
} = require("../utils/validation");

exports.signup = async (req, res) => {
  const { username, password } = req.body;

  //1.check for existing user
  const existingUser = await prisma.user.findUnique({
    where: { username: username },
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
        username: username,
        password: cryptPassword,
      },
      select: {
        id: true,
        username: true,
      },
    });

    res.status(201).json({
      message: "success",
      data: user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res
      .status(400)
      .json({ status: 400, message: "Please provide a username and password" });

  const user = await prisma.user.findUnique({
    where: { username: username },
  });

  if (!user)
    return res
      .status(401)
      .json({ status: 401, message: "Invalid username. Check again!" });

  const passwordMatch = await validatePassword(password, user.password);

  if (!passwordMatch) {
    return res
      .status(401)
      .json({ status: 401, message: "Invalid password. Check again!" });
  }

  const token = signToken(user.id);

  //eliminate the password field!!
  user.password = undefined;

  res.status(201).json({
    message: "success",
    accesstoken: token,
    data: user,
  });
};
