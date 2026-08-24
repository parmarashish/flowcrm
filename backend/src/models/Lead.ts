import { Schema, model, type Document, type Types } from "mongoose";

export type LeadSource = "Website" | "Referral" | "Cold Call" | "Social Media" | "Other";
export type LeadStatus = "New" | "Contacted" | "Qualified" | "Proposal" | "Won" | "Lost";

export interface ILead extends Document {
  name: string;
  email: string;
  phone: string;
  source: LeadSource;
  status: LeadStatus;
  assignedTo: Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const leadSchema = new Schema<ILead>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    source: {
      type: String,
      enum: ["Website", "Referral", "Cold Call", "Social Media", "Other"],
      required: true,
    },
    status: {
      type: String,
      enum: ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"],
      default: "New",
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", required: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

export const Lead = model<ILead>("Lead", leadSchema);
