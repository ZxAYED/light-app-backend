import { NextFunction, Request, Response } from "express";
import { AnyZodObject } from "zod";

const validateResource =
  (schema: AnyZodObject) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(
        req.body,
       
      );

      return next();
    } catch (error: any) {
      return res.status(400).json({
        status: "failed",
        success:false ,
        errors: error.errors,
      });
    }
  };

export default validateResource;
