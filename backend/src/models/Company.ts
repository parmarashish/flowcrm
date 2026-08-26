import { Schema, model, type Document, type Types } from "mongoose";

export interface ICompany extends Document {
  name: string;
  industry?: string;
  website?: string;
  address?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const companySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true, trim: true },
    industry: { type: String, trim: true },
    website: { type: String, trim: true },
    address: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

companySchema.index({ name: 1 });

export const Company = model<ICompany>("Company", companySchema);
