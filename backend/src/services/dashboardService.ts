import { Lead } from "../models/Lead.js";
import { Activity } from "../models/Activity.js";
import { buildLeadScopeFilter, type Requester } from "./leadScope.js";
import { Types } from "mongoose";

function convertScopeFilterToObjectIds(filter: Record<string, unknown>): Record<string, unknown> {
  const converted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filter)) {
    if (key === "assignedTo") {
      if (typeof value === "string") {
        converted[key] = new Types.ObjectId(value);
      } else if (Array.isArray(value)) {
        converted[key] = value;
      } else if (typeof value === "object" && value !== null && "$in" in value) {
        const inArray = (value as { $in: unknown[] }).$in;
        converted[key] = { $in: inArray.map((id) => (typeof id === "string" ? new Types.ObjectId(id) : id)) };
      } else {
        converted[key] = value;
      }
    } else {
      converted[key] = value;
    }
  }
  return converted;
}

export async function getSummary(requester: Requester) {
  const scopeFilter = await buildLeadScopeFilter(requester);
  const [total, won, lost] = await Promise.all([
    Lead.countDocuments(scopeFilter),
    Lead.countDocuments({ ...scopeFilter, status: "Won" }),
    Lead.countDocuments({ ...scopeFilter, status: "Lost" }),
  ]);
  const conversionRate = total > 0 ? Math.round((won / total) * 1000) / 10 : 0;
  return { total, won, lost, conversionRate };
}

export async function getBySource(requester: Requester) {
  const scopeFilter = await buildLeadScopeFilter(requester);
  const matchFilter = convertScopeFilterToObjectIds(scopeFilter);
  const aggregation = Lead.aggregate([
    { $match: matchFilter },
    { $group: { _id: "$source", count: { $sum: 1 } } },
    { $project: { _id: 0, source: "$_id", count: 1 } },
    { $sort: { source: 1 } },
  ]);
  const rows = await aggregation;
  return rows;
}

export async function getTrend(requester: Requester) {
  const scopeFilter = await buildLeadScopeFilter(requester);
  const matchFilter = convertScopeFilterToObjectIds(scopeFilter);
  const aggregation = Lead.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $project: { _id: 0, month: "$_id", count: 1 } },
    { $sort: { month: 1 } },
  ]);
  const rows = await aggregation;
  return rows;
}

export async function getRecentActivity(requester: Requester, limit = 20) {
  const scopeFilter = await buildLeadScopeFilter(requester);
  const activities = await Activity.find(scopeFilter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("user", "name")
    .populate("lead", "name");
  return activities;
}
