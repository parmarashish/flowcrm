import { User } from "../models/User.js";
import type { ILead } from "../models/Lead.js";
import type { UserRole } from "../models/User.js";

export interface Requester {
  id: string;
  role: UserRole;
}

async function getTeamAgentIds(teamLeadId: string): Promise<string[]> {
  const agents = await User.find({ teamLead: teamLeadId }).select("_id");
  return agents.map((agent) => agent.id as string);
}

export async function buildLeadScopeFilter(
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

export async function canAccessLead(requester: Requester, lead: ILead): Promise<boolean> {
  if (requester.role === "admin") {
    return true;
  }
  const assignedToId = lead.assignedTo.toString();
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
    return true;
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
