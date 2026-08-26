import { Schema, model, type Document, type Types } from "mongoose";

export type ActivityType = "created" | "status_changed" | "assigned" | "updated" | "deleted";

export const ACTIVITY_MODULES = [
  "leads",
  "contacts",
  "companies",
  "deals",
  "tasks",
  "users",
] as const;
export type ActivityModule = (typeof ACTIVITY_MODULES)[number];

export interface IActivity extends Document {
  lead: Types.ObjectId | null;
  user: Types.ObjectId;
  assignedTo: Types.ObjectId | null;
  type: ActivityType;
  message: string;
  meta?: Record<string, unknown>;
  module: ActivityModule;
  recordId: Types.ObjectId | null;
  recordTitle?: string;
  ipAddress?: string;
  createdAt: Date;
}

const activitySchema = new Schema<IActivity>(
  {
    // Optional now: only lead-sourced activity (module: "leads") populates this.
    // Kept for backward compatibility with the existing lead activity feed/scoping.
    lead: { type: Schema.Types.ObjectId, ref: "Lead", default: null },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
    type: {
      type: String,
      enum: ["created", "status_changed", "assigned", "updated", "deleted"],
      required: true,
    },
    message: { type: String, required: true },
    meta: { type: Schema.Types.Mixed },
    module: {
      type: String,
      enum: ACTIVITY_MODULES,
      default: "leads",
      required: true,
    },
    // No `ref` — recordId points at a different collection depending on `module`,
    // so it's a plain id snapshot rather than a populatable reference.
    recordId: { type: Schema.Types.ObjectId, default: null },
    recordTitle: { type: String, trim: true },
    ipAddress: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activitySchema.index({ module: 1, createdAt: -1 });
activitySchema.index({ user: 1, createdAt: -1 });

export const Activity = model<IActivity>("Activity", activitySchema);
