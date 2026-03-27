const express = require("express");
const cors = require("cors");
const AppError = require("./utils/AppError");
const globalErrorHandler = require("./controllers/errorController");
const userRouter = require("./routes/userRoutes");
const paymentRouter = require("./routes/paymentRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("UPI API is working!");
});

app.use("/api/v1/users", userRouter);
app.use("/api/v1/payments", paymentRouter);

app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
