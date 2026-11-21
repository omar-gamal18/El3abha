require("dotenv").config();

const app = require("./app");
const db = require("./prismaClient");

const PORT = process.env.PORT;

function validateAuthConfig() {
  const secrets = [
    ["JWT_ACCESS_SECRET", process.env.JWT_ACCESS_SECRET],
    ["JWT_REFRESH_SECRET", process.env.JWT_REFRESH_SECRET],
    ["RESET_CODE_SECRET", process.env.RESET_CODE_SECRET],
  ];

  for (const [name, value] of secrets) {
    if (!value || value.length < 32 || value.startsWith("replace-with-")) {
      throw new Error(`${name} must be configured with at least 32 characters`);
    }
  }

  if (new Set(secrets.map(([, value]) => value)).size !== secrets.length) {
    throw new Error("JWT and reset-code secrets must all be different");
  }

  const accessMinutes = Number(process.env.JWT_ACCESS_EXPIRES_MINUTES);
  const refreshDays = Number(process.env.JWT_REFRESH_EXPIRES_DAYS);

  if (!Number.isInteger(accessMinutes) || accessMinutes <= 0) {
    throw new Error("JWT_ACCESS_EXPIRES_MINUTES must be a positive integer");
  }
  if (!Number.isInteger(refreshDays) || refreshDays <= 0) {
    throw new Error("JWT_REFRESH_EXPIRES_DAYS must be a positive integer");
  }
}

async function startServer() {
  try {
    validateAuthConfig();
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
