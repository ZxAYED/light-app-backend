import app from "./app";
import "./helpers/CronJobs";

const port = 5000;

async function main() {

// const httpServer: HTTPServer = 
  app.listen(port, () => {
    console.log("🚀 Server is running on port", port);
  });
}

main().catch((err) => {
  console.error("❌ Server failed to start:", err);
  process.exit(1);
});
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION 💥", err);
});
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION 💥", err);
});
