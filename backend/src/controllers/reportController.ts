import type { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getLeadReport, getDealReport, getTaskReport, getAgentPerformance } from "../services/reportService.js";

const reportQuerySchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const leadReport = asyncHandler(async (req: Request, res: Response) => {
  const { dateFrom, dateTo } = reportQuerySchema.parse(req.query);
  res.json(await getLeadReport(req.user!, dateFrom, dateTo));
});

export const dealReport = asyncHandler(async (req: Request, res: Response) => {
  const { dateFrom, dateTo } = reportQuerySchema.parse(req.query);
  res.json(await getDealReport(req.user!, dateFrom, dateTo));
});

export const taskReport = asyncHandler(async (req: Request, res: Response) => {
  const { dateFrom, dateTo } = reportQuerySchema.parse(req.query);
  res.json(await getTaskReport(req.user!, dateFrom, dateTo));
});

export const agentPerformance = asyncHandler(async (req: Request, res: Response) => {
  const { dateFrom, dateTo } = reportQuerySchema.parse(req.query);
  res.json({ items: await getAgentPerformance(req.user!, dateFrom, dateTo) });
});
