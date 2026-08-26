import { Schema, model, type Document, type Types } from "mongoose";

export type TaskType = "Call" | "Email" | "Meeting" | "Follow-up";
export type TaskPriority = "Low" | "Medium" | "High";
export type TaskStatus = "Todo" | "In Progress" | "Done";

export interface ITask extends Document {
  title: string;
  description?: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: Date;
  assignedTo: Types.ObjectId;
  relatedLead: Types.ObjectId | null;
  relatedContact: Types.ObjectId | null;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: {
      type: String,
      enum: ["Call", "Email", "Meeting", "Follow-up"],
      required: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Todo", "In Progress", "Done"],
      default: "Todo",
    },
    dueDate: { type: Date, required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", required: true },
    relatedLead: { type: Schema.Types.ObjectId, ref: "Lead", default: null },
    relatedContact: { type: Schema.Types.ObjectId, ref: "Contact", default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

taskSchema.index({ assignedTo: 1, dueDate: 1 });
taskSchema.index({ status: 1 });

export const Task = model<ITask>("Task", taskSchema);
