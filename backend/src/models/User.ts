import { Schema, model, type Document, type Types } from "mongoose";

export type UserRole = "admin" | "team_leader" | "agent";

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  teamLead: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "team_leader", "agent"],
      default: "agent",
    },
    teamLead: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

userSchema.index({ teamLead: 1 });

export const User = model<IUser>("User", userSchema);
