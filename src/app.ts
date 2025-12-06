import cors from "cors";
import express, { Application, NextFunction, Request, Response } from "express";
import path from "path";

import cookieParser from "cookie-parser";
import status from "http-status";
import globalErrorHandler from "./app/middlewares/globalErrorHandler";
import router from "./app/routes";

const app: Application = express();
const publicDir = path.join(__dirname, "..", "public");


app.use(cors({
  origin: ["*","http://localhost:5173","https://shalana07-backend.onrender.com","https://ligth-backend.up.railway.app"],
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDir, { index: false }));

app.use("/api", router);


app.use(globalErrorHandler);

app.get("/", (req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(status.NOT_FOUND).json({
    success: false,
    message: "API NOT FOUND",
    error: {
      path: req.originalUrl,
      message: "Your requested path is not found",
    },
  });
});

export default app;
