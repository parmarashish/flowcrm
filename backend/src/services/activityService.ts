import { Activity, type ActivityType } from "../models/Activity.js";

export interface LogActivityParams {
  lead: string;
  user: string;
  type: ActivityType;
  message: string;
  meta?: Record<string, unknown>;
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  await Activity.create({
    lead: params.lead,
    user: params.user,
    type: params.type,
    message: params.message,
    meta: params.meta,
  });
}
