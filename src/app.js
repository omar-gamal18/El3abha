const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const authRoutes = require("./routes/user.route");

const app = express();

app.use(helmet());

app.use(cors());

app.use(express.json());

app.get("/api/v1/health", (req, res) => res.status(200).send("Home"));
app.use("/api/v1/auth", authRoutes);

app.use(notFound);

app.use(errorHandler);

module.exports = app;
