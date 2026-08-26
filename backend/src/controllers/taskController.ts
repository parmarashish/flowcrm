import type { Request, Response } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { Task } from "../models/Task.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { buildTaskScopeFilter, canAccessTask, canAssignTo } from "../services/taskScope.js";
import { logActivity } from "../services/activityService.js";

const TASK_TYPES = ["Call", "Email", "Meeting", "Follow-up"] as const;
const TASK_PRIORITIES = ["Low", "Medium", "High"] as const;
const TASK_STATUSES = ["Todo", "In Progress", "Done"] as const;

const TASK_POPULATE = [
  { path: "relatedLead", select: "name status source" },
  { path: "relatedContact", select: "name email phone designation" },
  { path: "assignedTo", select: "name" },
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

function toPublicTask(task: InstanceType<typeof Task>) {
  return {
    id: task.id as string,
    title: task.title,
    description: task.description,
    type: task.type,
    priority: task.priority,
    status: task.status,
    dueDate: task.dueDate,
    assignedTo: toRefObject(task.assignedTo),
    relatedLead: toRefObject(task.relatedLead, ["status", "source"]),
    relatedContact: toRefObject(task.relatedContact, ["email", "phone", "designation"]),
    createdBy: task.createdBy.toString(),
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

const listQuerySchema = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assignedTo: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  overdue: z.coerce.boolean().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const listTasks = asyncHandler(async (req: Request, res: Response) => {
  const query = listQuerySchema.parse(req.query);
  const scopeFilter = await buildTaskScopeFilter(req.user!);

  const filter: Record<string, unknown> = { ...scopeFilter };
  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
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
    const dueDate: Record<string, Date> = {};
    if (query.dateFrom) dueDate.$gte = new Date(query.dateFrom);
    if (query.dateTo) dueDate.$lte = new Date(query.dateTo);
    filter.dueDate = dueDate;
  }
  if (query.overdue) {
    filter.status = { $ne: "Done" };
    filter.dueDate = {
      ...(filter.dueDate as Record<string, unknown> | undefined),
      $lt: startOfDay(new Date()),
    };
  }
  if (query.search) {
    filter.title = { $regex: escapeRegex(query.search), $options: "i" };
  }

  const [items, total] = await Promise.all([
    Task.find(filter)
      .populate(TASK_POPULATE)
      .sort({ dueDate: 1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    Task.countDocuments(filter),
  ]);

  res.json({ items: items.map(toPublicTask), total, page: query.page, limit: query.limit });
});

const taskBodySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(TASK_TYPES),
  priority: z.enum(TASK_PRIORITIES).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  dueDate: z.string().min(1),
  relatedLead: z.string().nullable().optional(),
  relatedContact: z.string().nullable().optional(),
  assignedTo: z.string().optional(),
});

export const createTask = asyncHandler(async (req: Request, res: Response) => {
  const body = taskBodySchema.parse(req.body);
  const assignedTo = body.assignedTo ?? req.user!.id;

  if (assignedTo !== req.user!.id) {
    const allowed = await canAssignTo(req.user!, assignedTo);
    if (!allowed) {
      throw new AppError("Cannot assign task to that user", 403, "FORBIDDEN");
    }
  }
  if (body.relatedLead && !Types.ObjectId.isValid(body.relatedLead)) {
    throw new AppError("Invalid lead id", 400, "VALIDATION_ERROR");
  }
  if (body.relatedContact && !Types.ObjectId.isValid(body.relatedContact)) {
    throw new AppError("Invalid contact id", 400, "VALIDATION_ERROR");
  }

  const task = await Task.create({
    title: body.title,
    description: body.description,
    type: body.type,
    priority: body.priority || "Medium",
    status: body.status || "Todo",
    dueDate: new Date(body.dueDate),
    relatedLead: body.relatedLead || null,
    relatedContact: body.relatedContact || null,
    assignedTo,
    createdBy: req.user!.id,
  });
  await task.populate(TASK_POPULATE);
  await logActivity({
    user: req.user!.id,
    type: "created",
    message: `${task.title} created`,
    module: "tasks",
    recordId: task.id as string,
    recordTitle: task.title,
    ipAddress: req.ip,
  });
  res.status(201).json({ task: toPublicTask(task) });
});

async function findAccessibleTask(req: Request) {
  if (!Types.ObjectId.isValid(req.params.id)) {
    throw new AppError("Invalid task id", 400, "VALIDATION_ERROR");
  }
  const task = await Task.findById(req.params.id);
  if (!task || !(await canAccessTask(req.user!, task))) {
    throw new AppError("Task not found", 404, "NOT_FOUND");
  }
  return task;
}

export const getTask = asyncHandler(async (req: Request, res: Response) => {
  const task = await findAccessibleTask(req);
  await task.populate(TASK_POPULATE);
  res.json({ task: toPublicTask(task) });
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.enum(TASK_TYPES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  dueDate: z.string().min(1).optional(),
  relatedLead: z.string().nullable().optional(),
  relatedContact: z.string().nullable().optional(),
});

export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  const body = updateTaskSchema.parse(req.body);
  if (body.relatedLead && !Types.ObjectId.isValid(body.relatedLead)) {
    throw new AppError("Invalid lead id", 400, "VALIDATION_ERROR");
  }
  if (body.relatedContact && !Types.ObjectId.isValid(body.relatedContact)) {
    throw new AppError("Invalid contact id", 400, "VALIDATION_ERROR");
  }

  const task = await findAccessibleTask(req);

  if (body.title !== undefined) task.title = body.title;
  if (body.description !== undefined) task.description = body.description;
  if (body.type !== undefined) task.type = body.type;
  if (body.priority !== undefined) task.priority = body.priority;
  if (body.status !== undefined) task.status = body.status;
  if (body.dueDate !== undefined) task.dueDate = new Date(body.dueDate);
  if (body.relatedLead !== undefined) {
    task.relatedLead = body.relatedLead ? new Types.ObjectId(body.relatedLead) : null;
  }
  if (body.relatedContact !== undefined) {
    task.relatedContact = body.relatedContact ? new Types.ObjectId(body.relatedContact) : null;
  }

  await task.save();
  await task.populate(TASK_POPULATE);
  await logActivity({
    user: req.user!.id,
    type: "updated",
    message: `${task.title} updated`,
    module: "tasks",
    recordId: task.id as string,
    recordTitle: task.title,
    ipAddress: req.ip,
  });
  res.json({ task: toPublicTask(task) });
});

const reassignSchema = z.object({
  assignedTo: z.string().min(1),
});

export const reassignTask = asyncHandler(async (req: Request, res: Response) => {
  const body = reassignSchema.parse(req.body);
  const task = await findAccessibleTask(req);

  const allowed = await canAssignTo(req.user!, body.assignedTo);
  if (!allowed) {
    throw new AppError("Cannot assign task to that user", 403, "FORBIDDEN");
  }

  task.assignedTo = new Types.ObjectId(body.assignedTo);
  await task.save();
  await task.populate(TASK_POPULATE);
  res.json({ task: toPublicTask(task) });
});

export const deleteTask = asyncHandler(async (req: Request, res: Response) => {
  const task = await findAccessibleTask(req);
  await task.deleteOne();
  await logActivity({
    user: req.user!.id,
    type: "deleted",
    message: `${task.title} deleted`,
    module: "tasks",
    recordId: task.id as string,
    recordTitle: task.title,
    ipAddress: req.ip,
  });
  res.status(204).send();
});

export const taskSummary = asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const [overdueCount, dueTodayCount] = await Promise.all([
    Task.countDocuments({
      assignedTo: req.user!.id,
      status: { $ne: "Done" },
      dueDate: { $lt: todayStart },
    }),
    Task.countDocuments({
      assignedTo: req.user!.id,
      status: { $ne: "Done" },
      dueDate: { $gte: todayStart, $lt: tomorrowStart },
    }),
  ]);

  res.json({ overdueCount, dueTodayCount });
});
