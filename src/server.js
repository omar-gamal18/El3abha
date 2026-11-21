require("./config/env");
const app = require("./app");
const db = require("./prismaClient");

const PORT = process.env.PORT;

async function startServer() {
  try {
    await db.connect();
    console.log("Database connected successfully");

    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    server.on("error", (err) => {
      console.error("HTTP server error:", err);
      process.exit(1);
    });
  } catch (error) {
    console.error("Failed to start the server:", error.message || error);
    process.exit(1);
  }
}

startServer();
