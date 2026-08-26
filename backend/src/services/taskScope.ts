import { Types } from "mongoose";
import { User } from "../models/User.js";
import type { ITask } from "../models/Task.js";
import type { UserRole } from "../models/User.js";

export interface Requester {
  id: string;
  role: UserRole;
}

async function getTeamAgentIds(teamLeadId: string): Promise<string[]> {
  const agents = await User.find({ teamLead: teamLeadId }).select("_id");
  return agents.map((agent) => agent.id as string);
}

export async function buildTaskScopeFilter(
  requester: Requester
): Promise<Record<string, unknown>> {
  if (requester.role === "admin") {
    return {};
  }
  if (requester.role === "team_leader") {
    const teamAgentIds = await getTeamAgentIds(requester.id);
    return { assignedTo: { $in: [requester.id, ...teamAgentIds] } };
  }
  return { assignedTo: requester.id };
}

export async function canAccessTask(requester: Requester, task: ITask): Promise<boolean> {
  if (requester.role === "admin") {
    return true;
  }
  const assignedToId = task.assignedTo.toString();
  if (requester.role === "agent") {
    return assignedToId === requester.id;
  }
  // team_leader
  if (assignedToId === requester.id) {
    return true;
  }
  const teamAgentIds = await getTeamAgentIds(requester.id);
  return teamAgentIds.includes(assignedToId);
}

export async function canAssignTo(requester: Requester, targetUserId: string): Promise<boolean> {
  if (requester.role === "admin") {
    if (!Types.ObjectId.isValid(targetUserId)) {
      return false;
    }
    const exists = await User.exists({ _id: targetUserId });
    return exists !== null;
  }
  if (requester.role === "team_leader") {
    if (targetUserId === requester.id) {
      return true;
    }
    const teamAgentIds = await getTeamAgentIds(requester.id);
    return teamAgentIds.includes(targetUserId);
  }
  return targetUserId === requester.id;
}
