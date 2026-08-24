import { Schema, model, type Document, type Types } from "mongoose";

export type ActivityType = "created" | "status_changed" | "assigned" | "updated" | "deleted";

export interface IActivity extends Document {
  lead: Types.ObjectId;
  user: Types.ObjectId;
  type: ActivityType;
  message: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
}

const activitySchema = new Schema<IActivity>(
  {
    lead: { type: Schema.Types.ObjectId, ref: "Lead", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["created", "status_changed", "assigned", "updated", "deleted"],
      required: true,
    },
    message: { type: String, required: true },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Activity = model<IActivity>("Activity", activitySchema);
