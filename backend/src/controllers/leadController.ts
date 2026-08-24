import type { Request, Response } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { Lead } from "../models/Lead.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { buildLeadScopeFilter, canAccessLead, canAssignTo } from "../services/leadScope.js";
import { logActivity } from "../services/activityService.js";

const LEAD_SOURCES = ["Website", "Referral", "Cold Call", "Social Media", "Other"] as const;
const LEAD_STATUSES = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"] as const;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toPublicLead(lead: InstanceType<typeof Lead>) {
  return {
    id: lead.id as string,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    source: lead.source,
    status: lead.status,
    assignedTo: lead.assignedTo.toString(),
    notes: lead.notes,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
}

const listQuerySchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  source: z.enum(LEAD_SOURCES).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const listLeads = asyncHandler(async (req: Request, res: Response) => {
  const query = listQuerySchema.parse(req.query);
  const scopeFilter = await buildLeadScopeFilter(req.user!);

  const filter: Record<string, unknown> = { ...scopeFilter };
  if (query.status) filter.status = query.status;
  if (query.source) filter.source = query.source;
  if (query.dateFrom || query.dateTo) {
    const createdAt: Record<string, Date> = {};
    if (query.dateFrom) createdAt.$gte = new Date(query.dateFrom);
    if (query.dateTo) createdAt.$lte = new Date(query.dateTo);
    filter.createdAt = createdAt;
  }
  if (query.search) {
    const escapedSearch = escapeRegex(query.search);
    filter.$or = [
      { name: { $regex: escapedSearch, $options: "i" } },
      { email: { $regex: escapedSearch, $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    Lead.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    Lead.countDocuments(filter),
  ]);

  res.json({ items: items.map(toPublicLead), total, page: query.page, limit: query.limit });
});

const createLeadSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  source: z.enum(LEAD_SOURCES),
  status: z.enum(LEAD_STATUSES).optional(),
  notes: z.string().optional(),
  assignedTo: z.string().optional(),
});

export const createLead = asyncHandler(async (req: Request, res: Response) => {
  const body = createLeadSchema.parse(req.body);
  const assignedTo = body.assignedTo ?? req.user!.id;

  if (assignedTo !== req.user!.id) {
    const allowed = await canAssignTo(req.user!, assignedTo);
    if (!allowed) {
      throw new AppError("Cannot assign lead to that user", 403, "FORBIDDEN");
    }
  }

  const lead = await Lead.create({ ...body, assignedTo });
  await logActivity({
    lead: lead.id,
    user: req.user!.id,
    assignedTo: lead.assignedTo.toString(),
    type: "created",
    message: `${lead.name} created`,
  });
  res.status(201).json({ lead: toPublicLead(lead) });
});

async function findAccessibleLead(req: Request) {
  if (!Types.ObjectId.isValid(req.params.id)) {
    throw new AppError("Invalid lead id", 400, "VALIDATION_ERROR");
  }
  const lead = await Lead.findById(req.params.id);
  if (!lead || !(await canAccessLead(req.user!, lead))) {
    throw new AppError("Lead not found", 404, "NOT_FOUND");
  }
  return lead;
}

export const getLead = asyncHandler(async (req: Request, res: Response) => {
  const lead = await findAccessibleLead(req);
  res.json({ lead: toPublicLead(lead) });
});

const updateLeadSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(1).optional(),
  source: z.enum(LEAD_SOURCES).optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  notes: z.string().optional(),
});

export const updateLead = asyncHandler(async (req: Request, res: Response) => {
  const body = updateLeadSchema.parse(req.body);
  const lead = await findAccessibleLead(req);

  const previousStatus = lead.status;
  Object.assign(lead, body);
  await lead.save();

  if (body.status && body.status !== previousStatus) {
    await logActivity({
      lead: lead.id,
      user: req.user!.id,
      assignedTo: lead.assignedTo.toString(),
      type: "status_changed",
      message: `moved to ${body.status}`,
      meta: { from: previousStatus, to: body.status },
    });
  } else {
    await logActivity({
      lead: lead.id,
      user: req.user!.id,
      assignedTo: lead.assignedTo.toString(),
      type: "updated",
      message: `${lead.name} updated`,
    });
  }

  res.json({ lead: toPublicLead(lead) });
});

const reassignSchema = z.object({
  assignedTo: z.string().min(1),
});

export const reassignLead = asyncHandler(async (req: Request, res: Response) => {
  const body = reassignSchema.parse(req.body);
  const lead = await findAccessibleLead(req);

  const allowed = await canAssignTo(req.user!, body.assignedTo);
  if (!allowed) {
    throw new AppError("Cannot assign lead to that user", 403, "FORBIDDEN");
  }

  lead.assignedTo = new Types.ObjectId(body.assignedTo);
  await lead.save();
  await logActivity({
    lead: lead.id,
    user: req.user!.id,
    assignedTo: lead.assignedTo.toString(),
    type: "assigned",
    message: `reassigned`,
    meta: { assignedTo: body.assignedTo },
  });
  res.json({ lead: toPublicLead(lead) });
});

export const deleteLead = asyncHandler(async (req: Request, res: Response) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    throw new AppError("Lead not found", 404, "NOT_FOUND");
  }
  await logActivity({
    lead: lead.id,
    user: req.user!.id,
    assignedTo: lead.assignedTo.toString(),
    type: "deleted",
    message: `${lead.name} deleted`,
  });
  await lead.deleteOne();
  res.status(204).send();
});
