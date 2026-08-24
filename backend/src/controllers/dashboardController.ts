import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getSummary, getBySource, getTrend, getRecentActivity } from "../services/dashboardService.js";

export const summary = asyncHandler(async (req: Request, res: Response) => {
  res.json(await getSummary(req.user!));
});

export const bySource = asyncHandler(async (req: Request, res: Response) => {
  res.json({ items: await getBySource(req.user!) });
});

export const trend = asyncHandler(async (req: Request, res: Response) => {
  res.json({ items: await getTrend(req.user!) });
});

export const activity = asyncHandler(async (req: Request, res: Response) => {
  res.json({ items: await getRecentActivity(req.user!) });
});
