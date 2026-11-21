const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

const notFound = require("./middleware/notFound.middleware");
const errorHandler = require("./middleware/errorHandler.middleware");
const authRoutes = require("./routes/user.route");

const app = express();

app.use(helmet());

const allowedOrigin = process.env.FRONTEND_URL;

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || (allowedOrigin && origin === allowedOrigin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin is not allowed by CORS"));
    },
  }),
);

app.use(express.json());
app.use(cookieParser());

app.get("/api/v1/health", (req, res) => res.status(200).send("Home"));
app.use("/api/v1/auth", authRoutes);

app.use(notFound);

app.use(errorHandler);

module.exports = app;
