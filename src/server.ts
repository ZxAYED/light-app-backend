import app from "./app";

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
