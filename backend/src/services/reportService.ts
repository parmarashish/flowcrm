import { Types } from "mongoose";
import { Lead } from "../models/Lead.js";
import { Deal } from "../models/Deal.js";
import { Task } from "../models/Task.js";
import { User } from "../models/User.js";
import { buildLeadScopeFilter, type Requester } from "./leadScope.js";
import { buildDealScopeFilter } from "./dealScope.js";
import { buildTaskScopeFilter } from "./taskScope.js";

function toObjectIdScope(filter: Record<string, unknown>): Record<string, unknown> {
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

function buildDateFilter(field: string, dateFrom?: string, dateTo?: string): Record<string, unknown> {
  if (!dateFrom && !dateTo) return {};
  const range: Record<string, Date> = {};
  if (dateFrom) range.$gte = new Date(dateFrom);
  if (dateTo) range.$lte = new Date(dateTo);
  return { [field]: range };
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

async function getScopedUsers(requester: Requester) {
  if (requester.role === "admin") {
    return User.find().select("name role");
  }
  if (requester.role === "team_leader") {
    return User.find({ $or: [{ _id: requester.id }, { teamLead: requester.id }] }).select("name role");
  }
  return User.find({ _id: requester.id }).select("name role");
}

export async function getLeadReport(requester: Requester, dateFrom?: string, dateTo?: string) {
  const scopeFilter = await buildLeadScopeFilter(requester);
  const matchFilter = {
    ...toObjectIdScope(scopeFilter),
    ...buildDateFilter("createdAt", dateFrom, dateTo),
  };

  const [bySource, byStatus, byAgentRows, total] = await Promise.all([
    Lead.aggregate([
      { $match: matchFilter },
      { $group: { _id: "$source", count: { $sum: 1 } } },
      { $project: { _id: 0, source: "$_id", count: 1 } },
      { $sort: { source: 1 } },
    ]),
    Lead.aggregate([
      { $match: matchFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { _id: 0, status: "$_id", count: 1 } },
    ]),
    Lead.aggregate([
      { $match: matchFilter },
      { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      { $project: { _id: 0, agentId: "$_id", agentName: "$user.name", count: 1 } },
      { $sort: { count: -1 } },
    ]),
    Lead.countDocuments(matchFilter),
  ]);

  return { bySource, byStatus, byAgent: byAgentRows, total };
}

export async function getDealReport(requester: Requester, dateFrom?: string, dateTo?: string) {
  const scopeFilter = await buildDealScopeFilter(requester);
  const closingMatchFilter = {
    ...toObjectIdScope(scopeFilter),
    ...buildDateFilter("closingDate", dateFrom, dateTo),
  };
  const stageMatchFilter = {
    ...toObjectIdScope(scopeFilter),
    ...buildDateFilter("createdAt", dateFrom, dateTo),
  };

  const [revenueByMonth, winLossRows, byStage] = await Promise.all([
    Deal.aggregate([
      { $match: { ...closingMatchFilter, stage: "Won" } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$closingDate" } },
          revenue: { $sum: "$value" },
        },
      },
      { $project: { _id: 0, month: "$_id", revenue: 1 } },
      { $sort: { month: 1 } },
    ]),
    Deal.aggregate([
      { $match: { ...closingMatchFilter, stage: { $in: ["Won", "Lost"] } } },
      { $group: { _id: "$stage", count: { $sum: 1 }, value: { $sum: "$value" } } },
    ]),
    Deal.aggregate([
      { $match: stageMatchFilter },
      { $group: { _id: "$stage", count: { $sum: 1 }, value: { $sum: "$value" } } },
      { $project: { _id: 0, stage: "$_id", count: 1, value: 1 } },
    ]),
  ]);

  const wonRow = winLossRows.find((r) => r._id === "Won");
  const lostRow = winLossRows.find((r) => r._id === "Lost");
  const wonCount = wonRow?.count ?? 0;
  const lostCount = lostRow?.count ?? 0;
  const totalRevenue = wonRow?.value ?? 0;
  const winRate = wonCount + lostCount > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 1000) / 10 : 0;
  const avgDealValue = wonCount > 0 ? Math.round(totalRevenue / wonCount) : 0;

  return { revenueByMonth, winRate, avgDealValue, totalRevenue, byStage };
}

export async function getTaskReport(requester: Requester, dateFrom?: string, dateTo?: string) {
  const scopeFilter = await buildTaskScopeFilter(requester);
  const matchFilter = {
    ...toObjectIdScope(scopeFilter),
    ...buildDateFilter("createdAt", dateFrom, dateTo),
  };

  const [statusRows, byAgentRows, total] = await Promise.all([
    Task.aggregate([{ $match: matchFilter }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    Task.aggregate([
      { $match: matchFilter },
      { $group: { _id: { agent: "$assignedTo", status: "$status" }, count: { $sum: 1 } } },
      { $lookup: { from: "users", localField: "_id.agent", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
    ]),
    Task.countDocuments(matchFilter),
  ]);

  const doneCount = statusRows.find((r) => r._id === "Done")?.count ?? 0;
  const completionRate = total > 0 ? Math.round((doneCount / total) * 1000) / 10 : 0;

  const overdueCount = await Task.countDocuments({
    ...matchFilter,
    status: { $ne: "Done" },
    dueDate: { $lt: startOfDay(new Date()) },
  });
  const overdueRate = total > 0 ? Math.round((overdueCount / total) * 1000) / 10 : 0;

  const agentMap = new Map<string, { agentId: string; agentName: string; total: number; done: number }>();
  for (const row of byAgentRows) {
    const id = (row._id.agent as Types.ObjectId).toString();
    const entry = agentMap.get(id) ?? { agentId: id, agentName: row.user.name, total: 0, done: 0 };
    entry.total += row.count;
    if (row._id.status === "Done") entry.done += row.count;
    agentMap.set(id, entry);
  }

  return {
    total,
    completedCount: doneCount,
    completionRate,
    overdueCount,
    overdueRate,
    byAgent: Array.from(agentMap.values()),
  };
}

export async function getAgentPerformance(requester: Requester, dateFrom?: string, dateTo?: string) {
  const users = await getScopedUsers(requester);
  const userObjectIds = users.map((u) => u._id);

  const leadDateFilter = buildDateFilter("createdAt", dateFrom, dateTo);
  const dealDateFilter = buildDateFilter("closingDate", dateFrom, dateTo);
  const taskDateFilter = buildDateFilter("createdAt", dateFrom, dateTo);

  const [leadRows, dealRows, taskRows] = await Promise.all([
    Lead.aggregate([
      { $match: { assignedTo: { $in: userObjectIds }, ...leadDateFilter } },
      { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
    ]),
    Deal.aggregate([
      { $match: { assignedTo: { $in: userObjectIds }, ...dealDateFilter } },
      { $group: { _id: { agent: "$assignedTo", stage: "$stage" }, count: { $sum: 1 }, value: { $sum: "$value" } } },
    ]),
    Task.aggregate([
      { $match: { assignedTo: { $in: userObjectIds }, ...taskDateFilter } },
      { $group: { _id: { agent: "$assignedTo", status: "$status" }, count: { $sum: 1 } } },
    ]),
  ]);

  const leadCountMap = new Map<string, number>();
  for (const row of leadRows) {
    leadCountMap.set((row._id as Types.ObjectId).toString(), row.count);
  }

  const dealMap = new Map<string, { won: number; lost: number; revenue: number }>();
  for (const row of dealRows) {
    const agentId = (row._id.agent as Types.ObjectId).toString();
    const entry = dealMap.get(agentId) ?? { won: 0, lost: 0, revenue: 0 };
    if (row._id.stage === "Won") {
      entry.won += row.count;
      entry.revenue += row.value;
    } else if (row._id.stage === "Lost") {
      entry.lost += row.count;
    }
    dealMap.set(agentId, entry);
  }

  const taskDoneMap = new Map<string, number>();
  for (const row of taskRows) {
    if (row._id.status !== "Done") continue;
    const agentId = (row._id.agent as Types.ObjectId).toString();
    taskDoneMap.set(agentId, (taskDoneMap.get(agentId) ?? 0) + row.count);
  }

  return users.map((user) => {
    const id = user.id as string;
    const deals = dealMap.get(id) ?? { won: 0, lost: 0, revenue: 0 };
    const winRate =
      deals.won + deals.lost > 0 ? Math.round((deals.won / (deals.won + deals.lost)) * 1000) / 10 : 0;
    return {
      agentId: id,
      agentName: user.name,
      role: user.role,
      leadsCount: leadCountMap.get(id) ?? 0,
      dealsWon: deals.won,
      revenue: deals.revenue,
      tasksDone: taskDoneMap.get(id) ?? 0,
      winRate,
    };
  });
}
