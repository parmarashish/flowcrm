import type { Request, Response } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { Company } from "../models/Company.js";
import { Contact } from "../models/Contact.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { logActivity } from "../services/activityService.js";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toPublicCompany(company: InstanceType<typeof Company>) {
  return {
    id: company.id as string,
    name: company.name,
    industry: company.industry,
    website: company.website,
    address: company.address,
    createdBy: company.createdBy.toString(),
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
  };
}

const listQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const listCompanies = asyncHandler(async (req: Request, res: Response) => {
  const query = listQuerySchema.parse(req.query);

  const filter: Record<string, unknown> = {};
  if (query.search) {
    const escapedSearch = escapeRegex(query.search);
    filter.$or = [
      { name: { $regex: escapedSearch, $options: "i" } },
      { industry: { $regex: escapedSearch, $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    Company.aggregate([
      { $match: filter },
      { $sort: { createdAt: -1 } },
      { $skip: (query.page - 1) * query.limit },
      { $limit: query.limit },
      {
        $lookup: {
          from: "contacts",
          localField: "_id",
          foreignField: "company",
          as: "contactDocs",
        },
      },
      {
        $project: {
          name: 1,
          industry: 1,
          website: 1,
          address: 1,
          createdBy: 1,
          createdAt: 1,
          updatedAt: 1,
          contactsCount: { $size: "$contactDocs" },
        },
      },
    ]),
    Company.countDocuments(filter),
  ]);

  res.json({
    items: items.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      industry: c.industry,
      website: c.website,
      address: c.address,
      createdBy: c.createdBy.toString(),
      contactsCount: c.contactsCount,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
    total,
    page: query.page,
    limit: query.limit,
  });
});

const companyBodySchema = z.object({
  name: z.string().min(1),
  industry: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
});

export const createCompany = asyncHandler(async (req: Request, res: Response) => {
  const body = companyBodySchema.parse(req.body);
  const company = await Company.create({ ...body, createdBy: req.user!.id });
  await logActivity({
    user: req.user!.id,
    type: "created",
    message: `${company.name} created`,
    module: "companies",
    recordId: company.id as string,
    recordTitle: company.name,
    ipAddress: req.ip,
  });
  res.status(201).json({ company: toPublicCompany(company) });
});

async function findCompanyOrThrow(id: string) {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid company id", 400, "VALIDATION_ERROR");
  }
  const company = await Company.findById(id);
  if (!company) {
    throw new AppError("Company not found", 404, "NOT_FOUND");
  }
  return company;
}

export const getCompany = asyncHandler(async (req: Request, res: Response) => {
  const company = await findCompanyOrThrow(req.params.id);
  const contacts = await Contact.find({ company: company.id })
    .select("name email phone designation")
    .sort({ name: 1 });

  res.json({
    company: toPublicCompany(company),
    contacts: contacts.map((c) => ({
      id: c.id as string,
      name: c.name,
      email: c.email,
      phone: c.phone,
      designation: c.designation,
    })),
  });
});

const updateCompanySchema = companyBodySchema.partial();

export const updateCompany = asyncHandler(async (req: Request, res: Response) => {
  const body = updateCompanySchema.parse(req.body);
  const company = await findCompanyOrThrow(req.params.id);

  Object.assign(company, body);
  await company.save();
  await logActivity({
    user: req.user!.id,
    type: "updated",
    message: `${company.name} updated`,
    module: "companies",
    recordId: company.id as string,
    recordTitle: company.name,
    ipAddress: req.ip,
  });
  res.json({ company: toPublicCompany(company) });
});

export const deleteCompany = asyncHandler(async (req: Request, res: Response) => {
  const company = await findCompanyOrThrow(req.params.id);
  await Contact.updateMany({ company: company.id }, { $set: { company: null } });
  await company.deleteOne();
  await logActivity({
    user: req.user!.id,
    type: "deleted",
    message: `${company.name} deleted`,
    module: "companies",
    recordId: company.id as string,
    recordTitle: company.name,
    ipAddress: req.ip,
  });
  res.status(204).send();
});
