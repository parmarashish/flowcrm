import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        details: err.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { message: err.message, code: err.code },
    });
    return;
  }

  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({
      error: { message: "Malformed JSON body", code: "INVALID_JSON" },
    });
    return;
  }

  const mongoErr = err as { name?: string; code?: number };

  if (mongoErr?.name === "CastError") {
    res.status(400).json({
      error: { message: "Invalid identifier or field value", code: "VALIDATION_ERROR" },
    });
    return;
  }

  if (mongoErr?.name === "ValidationError") {
    res.status(400).json({
      error: { message: "Validation failed", code: "VALIDATION_ERROR" },
    });
    return;
  }

  if (mongoErr?.code === 11000) {
    res.status(409).json({
      error: { message: "Duplicate value", code: "DUPLICATE" },
    });
    return;
  }

  console.error("[error]", err);
  res.status(500).json({
    error: { message: "Internal server error", code: "INTERNAL_ERROR" },
  });
}
