const express = require("express");

const app = express();

app.use(express.json());

app.get("/api/health", (req, res) => res.status(200).send("Home"));

app.use((req, res) => {
  res.status(404).json({ error: "Not Found", path: req.originalUrl });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: "Internal Server Error" });
});

app.listen(3000);
