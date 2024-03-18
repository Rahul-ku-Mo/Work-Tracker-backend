const { prisma } = require("../db");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const passport = require("passport");
const {
  signToken,
  hashedPassword,
  validatePassword,
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
  const { email, password } = req.body;

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

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "https://work-tracker-backend.onrender.com/api/v1/oauth2/google/callback",
    },
    async function (accessToken, refreshToken, profile, done) {
      const email = profile.emails[0].value;
      const imageUrl = profile.photos[0].value;
      const name = profile.displayName;

      const user = await prisma.user.findUnique({
        where: { email: email },
      });

      if (!user) {
        const newUser = await prisma.user.create({
          data: {
            email: email,
            imageUrl: imageUrl,
            name: name,
          },
          select: {
            id: true,
            email: true,
            name: true,
            imageUrl: true,
          },
        });

        return done(null, newUser);
      }

      return done(null, user);
    }
  )
);

passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    cb(null, { id: user.id, username: user.username, name: user.name });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

exports.oauthGoogleLogin = passport.authenticate("google", {
  scope: ["profile", "email"],
});

const sendScriptResponse = (res, message, url, user) => {
  if (message === "login-success") {
    res.accessToken = signToken(user.id);
  }

  res.send(`
    <script>
      window.opener.postMessage({
        status: '${message}',
        accessToken: '${res.accessToken}',
      }, '${url}');
     
    </script>
  `);
};

const handleLogin = (req, res, next) => (err, user) => {
  if (err) {
    return next(err);
  }

  if (!user) {
    return sendScriptResponse(
      res,
      "login-failure",
      "https://work-tracker-chi.vercel.app/auth",
      user
    );
  }

  req.logIn(user, function (err) {
    if (err) {
      return next(err);
    }

    sendScriptResponse(
      res,
      "login-success",
      "http://localhost:5173/kanban",
      user
    );
  });
};

exports.googleLoginCallback = (req, res, next) => {
  passport.authenticate(
    "google",
    { failureRedirect: "/auth" },
    handleLogin(req, res, next)
  )(req, res, next);
};
