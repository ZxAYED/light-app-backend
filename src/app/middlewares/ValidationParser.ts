import { NextFunction, Request, Response } from "express";
import { AnyZodObject } from "zod";

const validateJSON =
  (schema: AnyZodObject) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.errors,
      });
    }
  };

export default validateJSON;
