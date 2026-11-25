const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

const notFound = require("./middlewares/notFound.middleware");
const errorHandler = require("./middlewares/errorHandler.middleware");
const authRouter = require("./routes/auth.route");
const venueRoutes = require("./routes/venue.route");

const app = express();

app.use(helmet());

const allowedOrigins = [
  "https://el3abha.apidog.io",
  "http://localhost:3000",
  "http://localhost:5000",
];

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

app.get("/api/v1/health", (req, res) => res.status(200).send("Home"));

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/venues", venueRoutes);

app.use(notFound);

app.use(errorHandler);

module.exports = app;
