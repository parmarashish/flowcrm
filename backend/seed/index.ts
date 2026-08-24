import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "../src/config/db.js";
import { User } from "../src/models/User.js";
import { Lead, type LeadSource, type LeadStatus } from "../src/models/Lead.js";
import { Activity } from "../src/models/Activity.js";

const SOURCES: LeadSource[] = ["Website", "Referral", "Cold Call", "Social Media", "Other"];
const STATUSES: LeadStatus[] = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"];

function randomFrom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function daysAgo(n: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date;
}

async function main() {
  await connectDB();

  console.log("[seed] clearing existing data...");
  await Promise.all([
    User.deleteMany({}),
    Lead.deleteMany({}),
    Activity.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash("password123", 10);

  console.log("[seed] creating users...");
  const admin = await User.create({
    name: "Demo Admin",
    email: "admin@example.com",
    passwordHash,
    role: "admin",
  });

  const teamLead = await User.create({
    name: "Demo Team Leader",
    email: "leader@example.com",
    passwordHash,
    role: "team_leader",
  });

  const agentNames = ["Alice Agent", "Bob Agent", "Cara Agent"];
  const agents = await Promise.all(
    agentNames.map((name, i) =>
      User.create({
        name,
        email: `agent${i + 1}@example.com`,
        passwordHash,
        role: "agent",
        teamLead: teamLead._id,
      })
    )
  );

  const assignablePool = [admin, teamLead, ...agents];

  console.log("[seed] creating leads...");
  const leadCount = 25;
  const createdLeads = [];
  for (let i = 0; i < leadCount; i++) {
    const owner = randomFrom(assignablePool);
    const createdAt = daysAgo(Math.floor(Math.random() * 180));
    const lead = await Lead.create({
      name: `Prospect ${i + 1}`,
      email: `prospect${i + 1}@example.com`,
      phone: `555-01${String(i).padStart(2, "0")}`,
      source: randomFrom(SOURCES),
      status: randomFrom(STATUSES),
      assignedTo: owner._id,
      createdAt,
      updatedAt: createdAt,
    });
    createdLeads.push({ lead, owner });
  }

  console.log("[seed] creating activity records...");
  await Promise.all(
    createdLeads.map(({ lead, owner }) =>
      Activity.create({
        lead: lead._id,
        user: owner._id,
        type: "created",
        message: `${lead.name} created`,
        createdAt: lead.createdAt,
      })
    )
  );

  console.log("[seed] done.");
  console.log(`[seed] admin login: admin@example.com / password123`);
  console.log(`[seed] team leader login: leader@example.com / password123`);
  console.log(`[seed] agent logins: agent1@example.com, agent2@example.com, agent3@example.com / password123`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
