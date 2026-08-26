import type { Request, Response } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { Contact } from "../models/Contact.js";
import { Lead } from "../models/Lead.js";
import { Activity } from "../models/Activity.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { logActivity } from "../services/activityService.js";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toPublicContact(contact: InstanceType<typeof Contact>) {
  const populatedCompany = contact.company as unknown as
    | { _id: Types.ObjectId; name: string }
    | Types.ObjectId
    | null;

  return {
    id: contact.id as string,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    company:
      populatedCompany && "name" in populatedCompany
        ? { id: populatedCompany._id.toString(), name: populatedCompany.name }
        : populatedCompany
          ? { id: populatedCompany.toString(), name: null }
          : null,
    designation: contact.designation,
    linkedLeads: contact.linkedLeads.map((id) => id.toString()),
    leadsCount: contact.linkedLeads.length,
    createdBy: contact.createdBy.toString(),
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  };
}

const listQuerySchema = z.object({
  search: z.string().optional(),
  company: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const listContacts = asyncHandler(async (req: Request, res: Response) => {
  const query = listQuerySchema.parse(req.query);

  const filter: Record<string, unknown> = {};
  if (query.company) {
    if (!Types.ObjectId.isValid(query.company)) {
      throw new AppError("Invalid company id", 400, "VALIDATION_ERROR");
    }
    filter.company = query.company;
  }
  if (query.search) {
    const escapedSearch = escapeRegex(query.search);
    filter.$or = [
      { name: { $regex: escapedSearch, $options: "i" } },
      { email: { $regex: escapedSearch, $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    Contact.find(filter)
      .populate("company", "name")
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    Contact.countDocuments(filter),
  ]);

  res.json({ items: items.map(toPublicContact), total, page: query.page, limit: query.limit });
});

const contactBodySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  company: z.string().nullable().optional(),
  designation: z.string().optional(),
  linkedLeads: z.array(z.string()).optional(),
});

export const createContact = asyncHandler(async (req: Request, res: Response) => {
  const body = contactBodySchema.parse(req.body);
  if (body.company && !Types.ObjectId.isValid(body.company)) {
    throw new AppError("Invalid company id", 400, "VALIDATION_ERROR");
  }

  const contact = await Contact.create({
    name: body.name,
    email: body.email,
    phone: body.phone,
    company: body.company || null,
    designation: body.designation,
    linkedLeads: body.linkedLeads ?? [],
    createdBy: req.user!.id,
  });
  await contact.populate("company", "name");
  await logActivity({
    user: req.user!.id,
    type: "created",
    message: `${contact.name} created`,
    module: "contacts",
    recordId: contact.id as string,
    recordTitle: contact.name,
    ipAddress: req.ip,
  });
  res.status(201).json({ contact: toPublicContact(contact) });
});

async function findContactOrThrow(id: string) {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid contact id", 400, "VALIDATION_ERROR");
  }
  const contact = await Contact.findById(id).populate("company", "name");
  if (!contact) {
    throw new AppError("Contact not found", 404, "NOT_FOUND");
  }
  return contact;
}

export const getContact = asyncHandler(async (req: Request, res: Response) => {
  const contact = await findContactOrThrow(req.params.id);

  const [leads, activity] = await Promise.all([
    Lead.find({ _id: { $in: contact.linkedLeads } }).select("name status source"),
    Activity.find({ lead: { $in: contact.linkedLeads } })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("user", "name"),
  ]);

  res.json({
    contact: toPublicContact(contact),
    linkedLeads: leads.map((l) => ({
      id: l.id as string,
      name: l.name,
      status: l.status,
      source: l.source,
    })),
    activity: activity.map((a) => ({
      id: a.id as string,
      type: a.type,
      message: a.message,
      user: (a.user as unknown as { name?: string } | null)?.name ?? "Unknown",
      createdAt: a.createdAt,
    })),
  });
});

const updateContactSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(1).optional(),
  company: z.string().nullable().optional(),
  designation: z.string().optional(),
  linkedLeads: z.array(z.string()).optional(),
});

export const updateContact = asyncHandler(async (req: Request, res: Response) => {
  const body = updateContactSchema.parse(req.body);
  if (body.company && !Types.ObjectId.isValid(body.company)) {
    throw new AppError("Invalid company id", 400, "VALIDATION_ERROR");
  }
  if (!Types.ObjectId.isValid(req.params.id)) {
    throw new AppError("Invalid contact id", 400, "VALIDATION_ERROR");
  }

  const contact = await Contact.findById(req.params.id);
  if (!contact) {
    throw new AppError("Contact not found", 404, "NOT_FOUND");
  }

  Object.assign(contact, body);
  await contact.save();
  await contact.populate("company", "name");
  await logActivity({
    user: req.user!.id,
    type: "updated",
    message: `${contact.name} updated`,
    module: "contacts",
    recordId: contact.id as string,
    recordTitle: contact.name,
    ipAddress: req.ip,
  });
  res.json({ contact: toPublicContact(contact) });
});

export const deleteContact = asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    throw new AppError("Invalid contact id", 400, "VALIDATION_ERROR");
  }
  const contact = await Contact.findById(req.params.id);
  if (!contact) {
    throw new AppError("Contact not found", 404, "NOT_FOUND");
  }
  await contact.deleteOne();
  await logActivity({
    user: req.user!.id,
    type: "deleted",
    message: `${contact.name} deleted`,
    module: "contacts",
    recordId: contact.id as string,
    recordTitle: contact.name,
    ipAddress: req.ip,
  });
  res.status(204).send();
});
