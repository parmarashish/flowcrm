import type { Request, Response } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { Deal } from "../models/Deal.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { buildDealScopeFilter, canAccessDeal, canAssignTo } from "../services/dealScope.js";
import { logActivity } from "../services/activityService.js";

const DEAL_STAGES = ["Negotiation", "Proposal", "Contract Sent", "Won", "Lost"] as const;

const DEAL_POPULATE = [
  { path: "lead", select: "name status source" },
  { path: "contact", select: "name email phone designation" },
  { path: "assignedTo", select: "name" },
  { path: "notes.author", select: "name" },
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toRefObject(
  value: unknown,
  extraFields: string[] = []
): { id: string; name: string | null; [key: string]: unknown } | null {
  if (!value) return null;
  if (typeof value === "object" && value !== null && "name" in (value as Record<string, unknown>)) {
    const v = value as { _id: Types.ObjectId; name: string; [key: string]: unknown };
    const extra: Record<string, unknown> = {};
    for (const field of extraFields) extra[field] = v[field];
    return { id: v._id.toString(), name: v.name, ...extra };
  }
  return { id: (value as Types.ObjectId).toString(), name: null };
}

function toPublicDeal(deal: InstanceType<typeof Deal>) {
  return {
    id: deal.id as string,
    title: deal.title,
    lead: toRefObject(deal.lead, ["status", "source"]),
    contact: toRefObject(deal.contact, ["email", "phone", "designation"]),
    value: deal.value,
    currency: deal.currency,
    stage: deal.stage,
    closingDate: deal.closingDate,
    assignedTo: toRefObject(deal.assignedTo),
    notes: deal.notes.map((note) => ({
      id: note._id!.toString(),
      text: note.text,
      author: toRefObject(note.author),
      createdAt: note.createdAt,
    })),
    createdBy: deal.createdBy.toString(),
    createdAt: deal.createdAt,
    updatedAt: deal.updatedAt,
  };
}

const listQuerySchema = z.object({
  stage: z.enum(DEAL_STAGES).optional(),
  assignedTo: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const listDeals = asyncHandler(async (req: Request, res: Response) => {
  const query = listQuerySchema.parse(req.query);
  const scopeFilter = await buildDealScopeFilter(req.user!);

  const filter: Record<string, unknown> = { ...scopeFilter };
  if (query.stage) filter.stage = query.stage;
  if (query.assignedTo) {
    // Validate the requested assignee is within the requester's own visibility scope
    // before applying it — otherwise this would overwrite (not narrow) the scope filter.
    const allowed = await canAssignTo(req.user!, query.assignedTo);
    if (!allowed) {
      throw new AppError("Cannot filter by that assignee", 403, "FORBIDDEN");
    }
    filter.assignedTo = query.assignedTo;
  }
  if (query.dateFrom || query.dateTo) {
    const closingDate: Record<string, Date> = {};
    if (query.dateFrom) closingDate.$gte = new Date(query.dateFrom);
    if (query.dateTo) closingDate.$lte = new Date(query.dateTo);
    filter.closingDate = closingDate;
  }
  if (query.search) {
    filter.title = { $regex: escapeRegex(query.search), $options: "i" };
  }

  const [items, total] = await Promise.all([
    Deal.find(filter)
      .populate(DEAL_POPULATE)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    Deal.countDocuments(filter),
  ]);

  res.json({ items: items.map(toPublicDeal), total, page: query.page, limit: query.limit });
});

const dealBodySchema = z.object({
  title: z.string().min(1),
  lead: z.string().nullable().optional(),
  contact: z.string().nullable().optional(),
  value: z.coerce.number().min(0),
  currency: z.string().min(1).optional(),
  stage: z.enum(DEAL_STAGES).optional(),
  closingDate: z.string().nullable().optional(),
  assignedTo: z.string().optional(),
});

export const createDeal = asyncHandler(async (req: Request, res: Response) => {
  const body = dealBodySchema.parse(req.body);
  const assignedTo = body.assignedTo ?? req.user!.id;

  if (assignedTo !== req.user!.id) {
    const allowed = await canAssignTo(req.user!, assignedTo);
    if (!allowed) {
      throw new AppError("Cannot assign deal to that user", 403, "FORBIDDEN");
    }
  }
  if (body.lead && !Types.ObjectId.isValid(body.lead)) {
    throw new AppError("Invalid lead id", 400, "VALIDATION_ERROR");
  }
  if (body.contact && !Types.ObjectId.isValid(body.contact)) {
    throw new AppError("Invalid contact id", 400, "VALIDATION_ERROR");
  }

  const deal = await Deal.create({
    title: body.title,
    lead: body.lead || null,
    contact: body.contact || null,
    value: body.value,
    currency: body.currency || "USD",
    stage: body.stage || "Negotiation",
    closingDate: body.closingDate ? new Date(body.closingDate) : undefined,
    assignedTo,
    createdBy: req.user!.id,
  });
  await deal.populate(DEAL_POPULATE);
  await logActivity({
    user: req.user!.id,
    type: "created",
    message: `${deal.title} created`,
    module: "deals",
    recordId: deal.id as string,
    recordTitle: deal.title,
    ipAddress: req.ip,
  });
  res.status(201).json({ deal: toPublicDeal(deal) });
});

async function findAccessibleDeal(req: Request) {
  if (!Types.ObjectId.isValid(req.params.id)) {
    throw new AppError("Invalid deal id", 400, "VALIDATION_ERROR");
  }
  const deal = await Deal.findById(req.params.id);
  if (!deal || !(await canAccessDeal(req.user!, deal))) {
    throw new AppError("Deal not found", 404, "NOT_FOUND");
  }
  return deal;
}

export const getDeal = asyncHandler(async (req: Request, res: Response) => {
  const deal = await findAccessibleDeal(req);
  await deal.populate(DEAL_POPULATE);
  res.json({ deal: toPublicDeal(deal) });
});

const updateDealSchema = z.object({
  title: z.string().min(1).optional(),
  lead: z.string().nullable().optional(),
  contact: z.string().nullable().optional(),
  value: z.coerce.number().min(0).optional(),
  currency: z.string().min(1).optional(),
  stage: z.enum(DEAL_STAGES).optional(),
  closingDate: z.string().nullable().optional(),
});

export const updateDeal = asyncHandler(async (req: Request, res: Response) => {
  const body = updateDealSchema.parse(req.body);
  if (body.lead && !Types.ObjectId.isValid(body.lead)) {
    throw new AppError("Invalid lead id", 400, "VALIDATION_ERROR");
  }
  if (body.contact && !Types.ObjectId.isValid(body.contact)) {
    throw new AppError("Invalid contact id", 400, "VALIDATION_ERROR");
  }

  const deal = await findAccessibleDeal(req);

  if (body.title !== undefined) deal.title = body.title;
  if (body.lead !== undefined) deal.lead = body.lead ? new Types.ObjectId(body.lead) : null;
  if (body.contact !== undefined) deal.contact = body.contact ? new Types.ObjectId(body.contact) : null;
  if (body.value !== undefined) deal.value = body.value;
  if (body.currency !== undefined) deal.currency = body.currency;
  if (body.stage !== undefined) deal.stage = body.stage;
  if (body.closingDate !== undefined) {
    deal.closingDate = body.closingDate ? new Date(body.closingDate) : undefined;
  }

  await deal.save();
  await deal.populate(DEAL_POPULATE);
  await logActivity({
    user: req.user!.id,
    type: "updated",
    message: `${deal.title} updated`,
    module: "deals",
    recordId: deal.id as string,
    recordTitle: deal.title,
    ipAddress: req.ip,
  });
  res.json({ deal: toPublicDeal(deal) });
});

const reassignSchema = z.object({
  assignedTo: z.string().min(1),
});

export const reassignDeal = asyncHandler(async (req: Request, res: Response) => {
  const body = reassignSchema.parse(req.body);
  const deal = await findAccessibleDeal(req);

  const allowed = await canAssignTo(req.user!, body.assignedTo);
  if (!allowed) {
    throw new AppError("Cannot assign deal to that user", 403, "FORBIDDEN");
  }

  deal.assignedTo = new Types.ObjectId(body.assignedTo);
  await deal.save();
  await deal.populate(DEAL_POPULATE);
  res.json({ deal: toPublicDeal(deal) });
});

const addNoteSchema = z.object({
  text: z.string().min(1),
});

export const addDealNote = asyncHandler(async (req: Request, res: Response) => {
  const body = addNoteSchema.parse(req.body);
  const deal = await findAccessibleDeal(req);

  deal.notes.push({
    text: body.text,
    author: new Types.ObjectId(req.user!.id),
    createdAt: new Date(),
  });
  await deal.save();
  await deal.populate(DEAL_POPULATE);
  await logActivity({
    user: req.user!.id,
    type: "updated",
    message: `Note added to ${deal.title}`,
    module: "deals",
    recordId: deal.id as string,
    recordTitle: deal.title,
    ipAddress: req.ip,
  });
  res.status(201).json({ deal: toPublicDeal(deal) });
});

export const deleteDeal = asyncHandler(async (req: Request, res: Response) => {
  const deal = await findAccessibleDeal(req);
  await deal.deleteOne();
  await logActivity({
    user: req.user!.id,
    type: "deleted",
    message: `${deal.title} deleted`,
    module: "deals",
    recordId: deal.id as string,
    recordTitle: deal.title,
    ipAddress: req.ip,
  });
  res.status(204).send();
});

function toObjectIdFilter(filter: Record<string, unknown>): Record<string, unknown> {
  const converted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filter)) {
    if (key !== "assignedTo") {
      converted[key] = value;
      continue;
    }
    if (typeof value === "string") {
      converted[key] = new Types.ObjectId(value);
    } else if (typeof value === "object" && value !== null && "$in" in value) {
      const inArray = (value as { $in: unknown[] }).$in;
      converted[key] = { $in: inArray.map((id) => (typeof id === "string" ? new Types.ObjectId(id) : id)) };
    } else {
      converted[key] = value;
    }
  }
  return converted;
}

export const dealSummary = asyncHandler(async (req: Request, res: Response) => {
  const scopeFilter = await buildDealScopeFilter(req.user!);
  const matchFilter = toObjectIdFilter(scopeFilter);

  const rows = await Deal.aggregate([
    { $match: matchFilter },
    { $group: { _id: "$stage", count: { $sum: 1 }, value: { $sum: "$value" } } },
  ]);

  const byStage: Record<string, { count: number; value: number }> = {};
  let totalCount = 0;
  let totalValue = 0;
  let activeValue = 0;

  for (const row of rows) {
    byStage[row._id as string] = { count: row.count, value: row.value };
    totalCount += row.count;
    totalValue += row.value;
    if (row._id !== "Won" && row._id !== "Lost") {
      activeValue += row.value;
    }
  }

  res.json({ totalCount, totalValue, activeValue, byStage });
});
