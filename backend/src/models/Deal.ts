import { Schema, model, type Document, type Types } from "mongoose";

export type DealStage = "Negotiation" | "Proposal" | "Contract Sent" | "Won" | "Lost";

export interface IDealNote {
  text: string;
  author: Types.ObjectId;
  createdAt: Date;
}

export interface IDeal extends Document {
  title: string;
  lead: Types.ObjectId | null;
  contact: Types.ObjectId | null;
  value: number;
  currency: string;
  stage: DealStage;
  closingDate?: Date;
  assignedTo: Types.ObjectId;
  notes: Types.DocumentArray<IDealNote>;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const dealNoteSchema = new Schema<IDealNote>(
  {
    text: { type: String, required: true, trim: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const dealSchema = new Schema<IDeal>(
  {
    title: { type: String, required: true, trim: true },
    lead: { type: Schema.Types.ObjectId, ref: "Lead", default: null },
    contact: { type: Schema.Types.ObjectId, ref: "Contact", default: null },
    value: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "USD", trim: true },
    stage: {
      type: String,
      enum: ["Negotiation", "Proposal", "Contract Sent", "Won", "Lost"],
      default: "Negotiation",
    },
    closingDate: { type: Date },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", required: true },
    notes: { type: [dealNoteSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

dealSchema.index({ assignedTo: 1, createdAt: -1 });
dealSchema.index({ stage: 1 });

export const Deal = model<IDeal>("Deal", dealSchema);
