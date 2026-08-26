import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
import { verifyToken } from "../utils/jwt.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/User.js";
import type { UserRole } from "../models/User.js";

export const authMiddleware = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError("Missing or invalid Authorization header", 401, "UNAUTHORIZED");
  }
  const token = header.slice("Bearer ".length);

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new AppError("Invalid or expired token", 401, "UNAUTHORIZED");
  }

  const user = await User.findById(payload.sub).select("role status");
  if (!user) {
    throw new AppError("Invalid or expired token", 401, "UNAUTHORIZED");
  }
  if (user.status === "inactive") {
    throw new AppError("This account has been deactivated", 403, "ACCOUNT_DEACTIVATED");
  }

  req.user = { id: payload.sub, role: user.role };
  next();
});

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    next();
  };
}
