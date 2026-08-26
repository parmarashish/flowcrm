import type { Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import {
  User,
  PERMISSION_MODULES,
  defaultPermissions,
  type UserRole,
  type IUserPermissions,
  type IModulePermission,
} from "../models/User.js";
import { Activity } from "../models/Activity.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { logActivity } from "../services/activityService.js";

function toPublicUser(user: InstanceType<typeof User>) {
  return {
    id: user.id as string,
    name: user.name,
    email: user.email,
    role: user.role,
    teamLead: user.teamLead ? user.teamLead.toString() : null,
    status: user.status,
    lastLogin: user.lastLogin,
    permissions: user.permissions,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// Server-side mirror of the UI's locked permission cells — admin is always
// fully permitted, agents can never have delete access, regardless of what a
// direct API call requests. Only team_leader permissions are taken as-is.
function enforceRolePermissions(role: UserRole, requested: IUserPermissions): IUserPermissions {
  const result = {} as IUserPermissions;
  for (const mod of PERMISSION_MODULES) {
    const cell: IModulePermission = requested[mod] ?? { read: false, write: false, delete: false };
    if (role === "admin") {
      result[mod] = { read: true, write: true, delete: true };
    } else if (role === "agent") {
      result[mod] = { read: !!cell.read, write: !!cell.write, delete: false };
    } else {
      result[mod] = { read: !!cell.read, write: !!cell.write, delete: !!cell.delete };
    }
  }
  return result;
}

export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.find().sort({ createdAt: 1 });
  res.json({ users: users.map(toPublicUser) });
});

async function findUserOrThrow(id: string) {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid user id", 400, "VALIDATION_ERROR");
  }
  const user = await User.findById(id);
  if (!user) {
    throw new AppError("User not found", 404, "NOT_FOUND");
  }
  return user;
}

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await findUserOrThrow(req.params.id);
  res.json({ user: toPublicUser(user) });
});

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["admin", "team_leader", "agent"]).default("agent"),
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const body = createUserSchema.parse(req.body);
  const email = body.email.toLowerCase().trim();

  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError("Email already registered", 409, "EMAIL_TAKEN");
  }

  const passwordHash = await bcrypt.hash(body.password, 10);
  const user = await User.create({
    name: body.name,
    email,
    passwordHash,
    role: body.role,
    permissions: enforceRolePermissions(body.role, defaultPermissions()),
  });
  await logActivity({
    user: req.user!.id,
    type: "created",
    message: `${user.name} created`,
    module: "users",
    recordId: user.id as string,
    recordTitle: user.name,
    ipAddress: req.ip,
  });

  res.status(201).json({ user: toPublicUser(user) });
});

const updateUserSchema = z
  .object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    password: z.string().min(8).optional(),
    role: z.enum(["admin", "team_leader", "agent"]).optional(),
    teamLead: z.string().nullable().optional(),
  })
  .refine((body) => Object.values(body).some((v) => v !== undefined), {
    message: "At least one field must be provided",
  });

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const body = updateUserSchema.parse(req.body);
  const user = await findUserOrThrow(req.params.id);

  if (body.name !== undefined) {
    user.name = body.name;
  }

  if (body.email !== undefined) {
    const email = body.email.toLowerCase().trim();
    if (email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing) {
        throw new AppError("Email already registered", 409, "EMAIL_TAKEN");
      }
      user.email = email;
    }
  }

  if (body.password !== undefined) {
    user.passwordHash = await bcrypt.hash(body.password, 10);
  }

  if (body.role !== undefined) {
    user.role = body.role;
    // Re-derive permissions for the new role so locked cells (admin=all-on,
    // agent=delete-off) stay consistent instead of carrying over stale values.
    user.permissions = enforceRolePermissions(body.role, user.permissions);
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
  await logActivity({
    user: req.user!.id,
    type: "updated",
    message: `${user.name} updated`,
    module: "users",
    recordId: user.id as string,
    recordTitle: user.name,
    ipAddress: req.ip,
  });
  res.json({ user: toPublicUser(user) });
});

const statusSchema = z.object({
  status: z.enum(["active", "inactive"]),
});

export const updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const body = statusSchema.parse(req.body);
  const user = await findUserOrThrow(req.params.id);

  if (body.status === "inactive" && req.params.id === req.user!.id) {
    throw new AppError("You cannot deactivate your own account", 400, "SELF_DEACTIVATION");
  }

  user.status = body.status;
  await user.save();
  await logActivity({
    user: req.user!.id,
    type: "updated",
    message: `${user.name} ${body.status === "active" ? "activated" : "deactivated"}`,
    module: "users",
    recordId: user.id as string,
    recordTitle: user.name,
    ipAddress: req.ip,
  });
  res.json({ user: toPublicUser(user) });
});

const permissionCellSchema = z.object({
  read: z.boolean(),
  write: z.boolean(),
  delete: z.boolean(),
});

const permissionsBodySchema = z.object({
  permissions: z.object(
    Object.fromEntries(PERMISSION_MODULES.map((mod) => [mod, permissionCellSchema])) as Record<
      (typeof PERMISSION_MODULES)[number],
      typeof permissionCellSchema
    >
  ),
});

export const updateUserPermissions = asyncHandler(async (req: Request, res: Response) => {
  const body = permissionsBodySchema.parse(req.body);
  const user = await findUserOrThrow(req.params.id);

  user.permissions = enforceRolePermissions(user.role, body.permissions);
  await user.save();
  await logActivity({
    user: req.user!.id,
    type: "updated",
    message: `${user.name} permissions updated`,
    module: "users",
    recordId: user.id as string,
    recordTitle: user.name,
    ipAddress: req.ip,
  });
  res.json({ user: toPublicUser(user) });
});

export const getUserActivity = asyncHandler(async (req: Request, res: Response) => {
  const user = await findUserOrThrow(req.params.id);

  const activity = await Activity.find({ user: user.id })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("lead", "name");

  res.json({
    items: activity.map((a) => ({
      id: a.id as string,
      type: a.type,
      message: a.message,
      lead: a.lead && "name" in (a.lead as unknown as Record<string, unknown>)
        ? { id: (a.lead as unknown as { _id: Types.ObjectId })._id.toString(), name: (a.lead as unknown as { name: string }).name }
        : null,
      createdAt: a.createdAt,
    })),
  });
});
