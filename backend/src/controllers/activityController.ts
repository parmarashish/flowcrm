import type { Request, Response } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { Activity, ACTIVITY_MODULES } from "../models/Activity.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const listQuerySchema = z.object({
  module: z.enum(ACTIVITY_MODULES).optional(),
  userId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const listActivity = asyncHandler(async (req: Request, res: Response) => {
  const query = listQuerySchema.parse(req.query);

  const filter: Record<string, unknown> = {};

  if (req.user!.role === "admin") {
    if (query.userId) {
      if (!Types.ObjectId.isValid(query.userId)) {
        throw new AppError("Invalid user id", 400, "VALIDATION_ERROR");
      }
      filter.user = query.userId;
    }
  } else {
    // Non-admins only ever see their own activity — the userId query param
    // (admin-only per spec) is silently ignored rather than honored here.
    filter.user = req.user!.id;
  }

  if (query.module) filter.module = query.module;
  if (query.dateFrom || query.dateTo) {
    const createdAt: Record<string, Date> = {};
    if (query.dateFrom) createdAt.$gte = new Date(query.dateFrom);
    if (query.dateTo) createdAt.$lte = new Date(query.dateTo);
    filter.createdAt = createdAt;
  }
  if (query.search) {
    filter.recordTitle = { $regex: escapeRegex(query.search), $options: "i" };
  }

  const [items, total] = await Promise.all([
    Activity.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate("user", "name"),
    Activity.countDocuments(filter),
  ]);

  res.json({
    items: items.map((a) => {
      const populatedUser = a.user as unknown as { _id: Types.ObjectId; name: string };
      return {
        id: a.id as string,
        type: a.type,
        message: a.message,
        module: a.module,
        recordId: a.recordId ? a.recordId.toString() : null,
        recordTitle: a.recordTitle ?? null,
        ipAddress: a.ipAddress ?? null,
        user: { id: populatedUser._id.toString(), name: populatedUser.name },
        createdAt: a.createdAt,
      };
    }),
    total,
    page: query.page,
    limit: query.limit,
  });
});
