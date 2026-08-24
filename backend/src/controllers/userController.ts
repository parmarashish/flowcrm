import type { Request, Response } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function toPublicUser(user: InstanceType<typeof User>) {
  return {
    id: user.id as string,
    name: user.name,
    email: user.email,
    role: user.role,
    teamLead: user.teamLead ? user.teamLead.toString() : null,
  };
}

export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.find().sort({ createdAt: 1 });
  res.json({ users: users.map(toPublicUser) });
});

const updateUserSchema = z
  .object({
    role: z.enum(["admin", "team_leader", "agent"]).optional(),
    teamLead: z.string().nullable().optional(),
  })
  .refine((body) => body.role !== undefined || body.teamLead !== undefined, {
    message: "At least one of role or teamLead must be provided",
  });

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const body = updateUserSchema.parse(req.body);

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError("User not found", 404, "NOT_FOUND");
  }

  if (body.role !== undefined) {
    user.role = body.role;
  }

  if (body.teamLead !== undefined) {
    if (body.teamLead === null) {
      user.teamLead = null;
    } else {
      if (!Types.ObjectId.isValid(body.teamLead)) {
        throw new AppError("Invalid teamLead id", 400, "VALIDATION_ERROR");
      }
      const teamLeadUser = await User.findById(body.teamLead);
      if (!teamLeadUser || teamLeadUser.role !== "team_leader") {
        throw new AppError("teamLead must reference an existing team_leader user", 400, "VALIDATION_ERROR");
      }
      user.teamLead = teamLeadUser._id;
    }
  }

  await user.save();
  res.json({ user: toPublicUser(user) });
});
