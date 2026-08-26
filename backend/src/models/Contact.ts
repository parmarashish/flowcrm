import { Schema, model, type Document, type Types } from "mongoose";

export interface IContact extends Document {
  name: string;
  email: string;
  phone: string;
  company: Types.ObjectId | null;
  designation?: string;
  linkedLeads: Types.ObjectId[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<IContact>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    company: { type: Schema.Types.ObjectId, ref: "Company", default: null },
    designation: { type: String, trim: true },
    linkedLeads: [{ type: Schema.Types.ObjectId, ref: "Lead" }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

contactSchema.index({ company: 1 });
contactSchema.index({ createdAt: -1 });

export const Contact = model<IContact>("Contact", contactSchema);
