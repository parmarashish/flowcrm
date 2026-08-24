import type { Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { User, type IUser } from "../models/User.js";
import { signToken } from "../utils/jwt.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function toPublicUser(user: IUser) {
  return {
    id: user.id as string,
    name: user.name,
    email: user.email,
    role: user.role,
    teamLead: user.teamLead ? user.teamLead.toString() : null,
  };
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const body = registerSchema.parse(req.body);

  const existing = await User.findOne({ email: body.email });
  if (existing) {
    throw new AppError("Email already registered", 409, "EMAIL_TAKEN");
  }

  const passwordHash = await bcrypt.hash(body.password, 10);
  const userCount = await User.countDocuments();
  const role = userCount === 0 ? "admin" : "agent";

  const user = await User.create({
    name: body.name,
    email: body.email,
    passwordHash,
    role,
  });

  const token = signToken({ sub: user.id, role: user.role });
  res.status(201).json({ token, user: toPublicUser(user) });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const body = loginSchema.parse(req.body);

  const user = await User.findOne({ email: body.email });
  if (!user) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  const valid = await bcrypt.compare(body.password, user.passwordHash);
  if (!valid) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  const token = signToken({ sub: user.id, role: user.role });
  res.json({ token, user: toPublicUser(user) });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id);
  if (!user) {
    throw new AppError("User not found", 404, "NOT_FOUND");
  }
  res.json({ user: toPublicUser(user) });
});
