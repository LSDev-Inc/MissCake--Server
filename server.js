const dotenv = require("dotenv");
dotenv.config();

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    app.set("trust proxy", 1);
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Server startup failed: ${error.message}`);
    process.exit(1);
  }
};

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection");
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception");
  process.exit(1);
});

startServer();
