const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.signToken = (id) => {
  return jwt.sign({ userId: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_SECRET_EXPIRATION,
  });
};

exports.hashedPassword = async (userPassword) => {
  return await bcrypt.hash(userPassword, 12);
};

exports.validatePassword = async (clientPassword, databasePassword) => {
  return await bcrypt.compare(clientPassword, databasePassword);
};

exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  const token = authHeader && authHeader.split(" ")[1]; // Extract the token from the header

  if (!token) {
    return res.status(401).json({ message: "Access Denied" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res
        .status(403)
        .json({ message: "Invalid token or Expired token" });
    }

    req.user = user;

    next();
  });
};
