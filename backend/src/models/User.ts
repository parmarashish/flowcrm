import { Schema, model, type Document, type Types } from "mongoose";

export type UserRole = "admin" | "team_leader" | "agent";
export type UserStatus = "active" | "inactive";

export const PERMISSION_MODULES = [
  "leads",
  "contacts",
  "companies",
  "deals",
  "tasks",
  "reports",
] as const;
export type PermissionModule = (typeof PERMISSION_MODULES)[number];

export interface IModulePermission {
  read: boolean;
  write: boolean;
  delete: boolean;
}

export type IUserPermissions = Record<PermissionModule, IModulePermission>;

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  teamLead: Types.ObjectId | null;
  status: UserStatus;
  lastLogin: Date | null;
  permissions: IUserPermissions;
  createdAt: Date;
  updatedAt: Date;
}

const modulePermissionSchema = new Schema<IModulePermission>(
  {
    read: { type: Boolean, default: true },
    write: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
  },
  { _id: false }
);

function defaultModulePermission(): IModulePermission {
  return { read: true, write: false, delete: false };
}

export function defaultPermissions(): IUserPermissions {
  const perms = {} as IUserPermissions;
  for (const mod of PERMISSION_MODULES) {
    perms[mod] = defaultModulePermission();
  }
  return perms;
}

const permissionsSchemaPaths = PERMISSION_MODULES.reduce(
  (paths, mod) => {
    paths[mod] = { type: modulePermissionSchema, default: defaultModulePermission };
    return paths;
  },
  {} as Record<PermissionModule, { type: typeof modulePermissionSchema; default: () => IModulePermission }>
);

const permissionsSchema = new Schema<IUserPermissions>(permissionsSchemaPaths, { _id: false });

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
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    lastLogin: { type: Date, default: null },
    permissions: { type: permissionsSchema, default: defaultPermissions },
  },
  { timestamps: true }
);

userSchema.index({ teamLead: 1 });

export const User = model<IUser>("User", userSchema);
