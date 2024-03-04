const express = require("express");
const userRouter = require("./routes/userRoutes");
const boardRouter = require("./routes/boardRoutes");
const authRouter = require("./routes/authRoutes");
const commentRouter = require("./routes/commentRoutes");
const columnRouter = require("./routes/columnRoutes");
const cardRouter = require("./routes/cardRoutes");

const app = express();
const port = 8000 || process.env.PORT;

app.use(express.json());

app.use("/api/v1/auth", authRouter);

app.use("/api/v1/users", userRouter);
app.use("/api/v1/boards", boardRouter);
app.use("/api/v1/columns", columnRouter);
app.use("/api/v1/cards", cardRouter);
app.use("/api/v1/comments", commentRouter);

app.listen(port, () => {
  console.log(`Work-Tracker backend app listening on port ${port}`);
});
