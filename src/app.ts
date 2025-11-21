import cors from "cors";
import express, { Application, NextFunction, Request, Response } from "express";

import cookieParser from "cookie-parser";
import status from "http-status";
import swaggerUi from "swagger-ui-express";
import { openapiSpec } from "./app/docs/swagger";
import globalErrorHandler from "./app/middlewares/globalErrorHandler";
import router from "./app/routes";

const app: Application = express();

app.use(cors({
  origin: ["*","http://localhost:5173"],
  credentials: true,
}));

app.use(cookieParser());

// parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);
// Swagger UI
app.use("", swaggerUi.serve, swaggerUi.setup(openapiSpec, { explorer: true }));
// Raw JSON spec
app.get("/api-docs.json", (_req, res) => {
  res.json(openapiSpec);
});
app.use(globalErrorHandler);

app.get("/", (req: Request, res: Response) => {
  res.send("Shalana Server  is running  🎉🎉");
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
