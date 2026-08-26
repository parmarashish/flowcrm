import { Activity, type ActivityType, type ActivityModule } from "../models/Activity.js";

export interface LogActivityParams {
  lead?: string | null;
  user: string;
  assignedTo?: string | null;
  type: ActivityType;
  message: string;
  meta?: Record<string, unknown>;
  module?: ActivityModule;
  recordId?: string | null;
  recordTitle?: string;
  ipAddress?: string;
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  await Activity.create({
    lead: params.lead ?? null,
    user: params.user,
    assignedTo: params.assignedTo ?? null,
    type: params.type,
    message: params.message,
    meta: params.meta,
    module: params.module ?? "leads",
    recordId: params.recordId ?? null,
    recordTitle: params.recordTitle,
    ipAddress: params.ipAddress,
  });
}
