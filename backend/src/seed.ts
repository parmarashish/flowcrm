import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "./config/db.js";
import { User } from "./models/User.js";
import { Lead, type LeadSource, type LeadStatus } from "./models/Lead.js";
import { Activity, type ActivityType, type ActivityModule } from "./models/Activity.js";
import { Contact } from "./models/Contact.js";
import { Company } from "./models/Company.js";
import { Deal, type DealStage } from "./models/Deal.js";
import { Task, type TaskType, type TaskPriority, type TaskStatus } from "./models/Task.js";
import { PERMISSION_MODULES } from "./models/User.js";

const LEAD_SOURCES: LeadSource[] = ["Website", "Referral", "Cold Call", "Social Media", "Other"];
const LEAD_STATUSES: LeadStatus[] = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"];

const COMPANIES = [
  {
    name: "Meridian Realty Group",
    industry: "Real Estate",
    website: "https://meridianrealty.example.com",
    address: "500 Market St, Austin, TX",
  },
  {
    name: "Nimbus Cloud Systems",
    industry: "Tech",
    website: "https://nimbuscloud.example.com",
    address: "88 Harbor Blvd, San Francisco, CA",
  },
  {
    name: "Ledgerline Capital",
    industry: "Finance",
    website: "https://ledgerline.example.com",
    address: "12 Wall St, New York, NY",
  },
  {
    name: "Everbright Retail Co.",
    industry: "Retail",
    website: "https://everbrightretail.example.com",
    address: "300 Commerce Ave, Chicago, IL",
  },
  {
    name: "Wellspring Health Partners",
    industry: "Healthcare",
    website: "https://wellspringhealth.example.com",
    address: "77 Medical Plaza, Denver, CO",
  },
];

const DEAL_STAGES: DealStage[] = ["Negotiation", "Proposal", "Contract Sent", "Won", "Lost"];

const DEAL_TYPES = [
  "Annual Contract",
  "Platform License",
  "Support Renewal",
  "Consulting Package",
  "Implementation Services",
  "Expansion Deal",
  "Onboarding Package",
];

const DEAL_NOTE_SNIPPETS = [
  "Had a productive call, client is reviewing the proposal internally.",
  "Sent updated pricing sheet, awaiting feedback from their procurement team.",
  "Client requested a revised timeline before signing off.",
  "Scheduled a follow-up demo for next week.",
  "Legal is reviewing the contract terms now.",
  "Champion confirmed budget is approved for this quarter.",
  "Followed up after no response for a few days.",
];

const TASK_TITLES = [
  "Follow up on proposal",
  "Send contract for signature",
  "Schedule product demo",
  "Check in after onboarding",
  "Confirm renewal terms",
  "Prepare quote for client",
  "Review support ticket",
  "Discuss budget approval",
  "Send meeting notes",
  "Qualify new inbound lead",
  "Coordinate implementation kickoff",
  "Verify billing details",
  "Draft follow-up email",
  "Set up recurring check-in",
  "Escalate to account manager",
];

const DESIGNATIONS = [
  "CEO",
  "VP of Sales",
  "Marketing Director",
  "Procurement Manager",
  "Operations Lead",
  "CFO",
  "IT Director",
  "HR Manager",
];

function randomFrom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function daysAgo(n: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date;
}

function hoursAgo(n: number): Date {
  return new Date(Date.now() - n * 60 * 60 * 1000);
}

function permissionsForRole(role: "admin" | "team_leader" | "agent") {
  const perms: Record<string, { read: boolean; write: boolean; delete: boolean }> = {};
  for (const mod of PERMISSION_MODULES) {
    if (role === "admin") {
      perms[mod] = { read: true, write: true, delete: true };
    } else if (role === "agent") {
      perms[mod] = { read: true, write: true, delete: false };
    } else {
      perms[mod] = { read: true, write: true, delete: true };
    }
  }
  return perms;
}

async function main() {
  await connectDB();

  console.log("[seed] clearing existing data...");
  await Promise.all([
    User.deleteMany({}),
    Lead.deleteMany({}),
    Activity.deleteMany({}),
    Contact.deleteMany({}),
    Company.deleteMany({}),
    Deal.deleteMany({}),
    Task.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash("password123", 10);

  console.log("[seed] creating users...");
  const admin = await User.create({
    name: "Admin User",
    email: "admin@minicrm.com",
    passwordHash,
    role: "admin",
    permissions: permissionsForRole("admin"),
    lastLogin: hoursAgo(2),
  });
  const manager = await User.create({
    name: "Manager User",
    email: "manager@minicrm.com",
    passwordHash,
    role: "team_leader",
    permissions: permissionsForRole("team_leader"),
    lastLogin: daysAgo(1),
  });
  const agent = await User.create({
    name: "Agent User",
    email: "agent@minicrm.com",
    passwordHash,
    role: "agent",
    teamLead: manager._id,
    permissions: permissionsForRole("agent"),
    lastLogin: daysAgo(4),
  });

  const assignablePool = [admin, manager, agent];

  const DEMO_IPS = ["203.0.113.42", "198.51.100.17", "192.168.1.104", "10.0.0.23", "172.16.0.55"];

  const activityDocs: {
    lead?: mongoose.Types.ObjectId | null;
    user: mongoose.Types.ObjectId;
    assignedTo?: mongoose.Types.ObjectId | null;
    type: ActivityType;
    message: string;
    meta?: Record<string, unknown>;
    module?: ActivityModule;
    recordId?: mongoose.Types.ObjectId | null;
    recordTitle?: string;
    ipAddress?: string;
    createdAt: Date;
  }[] = [];

  // Users module activity — admin is the only role that can manage users,
  // so admin is the actor for all of these, matching real controller behavior.
  activityDocs.push(
    {
      user: admin._id,
      type: "created",
      message: `${manager.name} created`,
      module: "users",
      recordId: manager._id,
      recordTitle: manager.name,
      ipAddress: randomFrom(DEMO_IPS),
      createdAt: daysAgo(60),
    },
    {
      user: admin._id,
      type: "created",
      message: `${agent.name} created`,
      module: "users",
      recordId: agent._id,
      recordTitle: agent.name,
      ipAddress: randomFrom(DEMO_IPS),
      createdAt: daysAgo(58),
    },
    {
      user: admin._id,
      type: "updated",
      message: `${agent.name} permissions updated`,
      module: "users",
      recordId: agent._id,
      recordTitle: agent.name,
      ipAddress: randomFrom(DEMO_IPS),
      createdAt: daysAgo(40),
    },
    {
      user: admin._id,
      type: "updated",
      message: `${manager.name} updated`,
      module: "users",
      recordId: manager._id,
      recordTitle: manager.name,
      ipAddress: randomFrom(DEMO_IPS),
      createdAt: daysAgo(20),
    }
  );

  console.log("[seed] creating companies...");
  const companies = await Promise.all(
    COMPANIES.map((c) => Company.create({ ...c, createdBy: admin._id }))
  );

  companies.forEach((company, i) => {
    if (i >= 3) return;
    activityDocs.push({
      user: admin._id,
      type: "created",
      message: `${company.name} created`,
      module: "companies",
      recordId: company._id,
      recordTitle: company.name,
      ipAddress: randomFrom(DEMO_IPS),
      createdAt: daysAgo(50 - i * 3),
    });
    if (i < 2) {
      activityDocs.push({
        user: admin._id,
        type: "updated",
        message: `${company.name} updated`,
        module: "companies",
        recordId: company._id,
        recordTitle: company.name,
        ipAddress: randomFrom(DEMO_IPS),
        createdAt: daysAgo(30 - i * 3),
      });
    }
  });

  console.log("[seed] creating contacts...");
  const contactCount = 15;
  const contacts = [];
  for (let i = 0; i < contactCount; i++) {
    const company = companies[i % companies.length];
    const owner = randomFrom(assignablePool);
    const contact = await Contact.create({
      name: `Contact ${i + 1}`,
      email: `contact${i + 1}@example.com`,
      phone: `555-02${String(i).padStart(2, "0")}`,
      company: company._id,
      designation: randomFrom(DESIGNATIONS),
      createdBy: owner._id,
    });
    contacts.push(contact);

    if (i < 4) {
      activityDocs.push({
        user: owner._id,
        type: "created",
        message: `${contact.name} created`,
        module: "contacts",
        recordId: contact._id,
        recordTitle: contact.name,
        ipAddress: randomFrom(DEMO_IPS),
        createdAt: daysAgo(45 - i * 2),
      });
      if (i < 2) {
        activityDocs.push({
          user: owner._id,
          type: "updated",
          message: `${contact.name} updated`,
          module: "contacts",
          recordId: contact._id,
          recordTitle: contact.name,
          ipAddress: randomFrom(DEMO_IPS),
          createdAt: daysAgo(25 - i * 2),
        });
      }
    }
  }

  console.log("[seed] creating leads...");
  const leadCount = 30;
  const createdLeads: { lead: InstanceType<typeof Lead>; owner: typeof admin }[] = [];
  for (let i = 0; i < leadCount; i++) {
    const owner = randomFrom(assignablePool);
    const createdAt = daysAgo(Math.floor(Math.random() * 180));
    const status = randomFrom(LEAD_STATUSES);
    const lead = await Lead.create({
      name: `Lead Prospect ${i + 1}`,
      email: `leadprospect${i + 1}@example.com`,
      phone: `555-03${String(i).padStart(2, "0")}`,
      source: randomFrom(LEAD_SOURCES),
      status,
      assignedTo: owner._id,
      createdAt,
      updatedAt: createdAt,
    });
    createdLeads.push({ lead, owner });
  }

  console.log("[seed] linking contacts to leads...");
  for (const contact of contacts) {
    const linkCount = 1 + Math.floor(Math.random() * 2);
    const linked = new Set<string>();
    for (let j = 0; j < linkCount; j++) {
      const { lead } = randomFrom(createdLeads);
      linked.add(lead.id as string);
    }
    contact.linkedLeads = Array.from(linked).map((id) => new mongoose.Types.ObjectId(id));
    await contact.save();
  }

  console.log("[seed] creating lead activity records...");
  for (const { lead, owner } of createdLeads) {
    activityDocs.push({
      lead: lead._id,
      user: owner._id,
      assignedTo: owner._id,
      type: "created",
      message: `${lead.name} created`,
      createdAt: lead.createdAt,
    });

    if (Math.random() < 0.6) {
      const updatedAt = new Date(
        lead.createdAt.getTime() + 1000 * 60 * 60 * 24 * (1 + Math.floor(Math.random() * 5))
      );
      activityDocs.push({
        lead: lead._id,
        user: owner._id,
        assignedTo: owner._id,
        type: "updated",
        message: `${lead.name} updated`,
        createdAt: updatedAt,
      });
    }

    if (lead.status !== "New") {
      const statusAt = new Date(
        lead.createdAt.getTime() + 1000 * 60 * 60 * 24 * (2 + Math.floor(Math.random() * 10))
      );
      activityDocs.push({
        lead: lead._id,
        user: owner._id,
        assignedTo: owner._id,
        type: "status_changed",
        message: `moved to ${lead.status}`,
        meta: { from: "New", to: lead.status },
        createdAt: statusAt,
      });
    }
  }

  console.log("[seed] creating deals...");
  const dealCount = 14;
  // Guaranteed buckets so revenue-trend/funnel charts always have data at the
  // 30-day and 90-day report presets, instead of relying on random luck.
  const wonInLast30Count = 3;
  const wonInLast90Count = 2; // additional Won deals, closing 31-90 days ago
  let totalDealNotes = 0;
  for (let i = 0; i < dealCount; i++) {
    const owner = randomFrom(assignablePool);
    const company = companies[i % companies.length];
    const value = Math.round((5000 + Math.random() * 145000) / 500) * 500;

    let stage: DealStage;
    let closingDate: Date;
    let createdAt: Date;

    if (i < wonInLast30Count) {
      stage = "Won";
      const closeDaysAgo = 1 + Math.floor(Math.random() * 28);
      closingDate = daysAgo(closeDaysAgo);
      createdAt = daysAgo(closeDaysAgo + 3 + Math.floor(Math.random() * 10));
    } else if (i < wonInLast30Count + wonInLast90Count) {
      stage = "Won";
      const closeDaysAgo = 35 + Math.floor(Math.random() * 50);
      closingDate = daysAgo(closeDaysAgo);
      createdAt = daysAgo(closeDaysAgo + 3 + Math.floor(Math.random() * 10));
    } else {
      stage = DEAL_STAGES[i % DEAL_STAGES.length];
      const isClosed = stage === "Won" || stage === "Lost";
      closingDate = isClosed
        ? daysAgo(5 + Math.floor(Math.random() * 85))
        : new Date(Date.now() + (5 + Math.floor(Math.random() * 85)) * 24 * 60 * 60 * 1000);
      createdAt = daysAgo(Math.floor(Math.random() * 90));
    }

    // Deterministically guarantee at least one non-Won deal has a recent createdAt,
    // so the createdAt-scoped Deal Stage Funnel shows more than a single bar at the
    // 30-day preset. (A conditional "if not already Won" check here would be a no-op:
    // with dealCount=14 and 5 stages, index 13 always cycles to DEAL_STAGES[3] = "Won".)
    if (i === wonInLast30Count + wonInLast90Count) {
      stage = "Negotiation";
      createdAt = daysAgo(Math.floor(Math.random() * 25));
      closingDate = new Date(Date.now() + (5 + Math.floor(Math.random() * 85)) * 24 * 60 * 60 * 1000);
    }

    const linkedLead = Math.random() < 0.7 ? randomFrom(createdLeads).lead : null;
    const linkedContact = Math.random() < 0.7 ? randomFrom(contacts) : null;

    const noteCount = Math.random() < 0.5 ? 2 + Math.floor(Math.random() * 2) : 0;
    const notes = Array.from({ length: noteCount }).map((_, n) => {
      const noteAuthor = randomFrom(assignablePool);
      const noteAt = new Date(
        Math.min(
          createdAt.getTime() + (n + 1) * 1000 * 60 * 60 * 24 * (1 + Math.floor(Math.random() * 4)),
          Date.now()
        )
      );
      return {
        text: randomFrom(DEAL_NOTE_SNIPPETS),
        author: noteAuthor._id,
        createdAt: noteAt,
      };
    });
    totalDealNotes += notes.length;

    const dealTitle = `${company.name} — ${randomFrom(DEAL_TYPES)}`;
    const deal = await Deal.create({
      title: dealTitle,
      lead: linkedLead ? linkedLead._id : null,
      contact: linkedContact ? linkedContact._id : null,
      value,
      currency: "USD",
      stage,
      closingDate,
      assignedTo: owner._id,
      notes,
      createdBy: owner._id,
      createdAt,
      updatedAt: createdAt,
    });

    if (i < 4) {
      activityDocs.push({
        user: owner._id,
        type: "created",
        message: `${dealTitle} created`,
        module: "deals",
        recordId: deal._id,
        recordTitle: dealTitle,
        ipAddress: randomFrom(DEMO_IPS),
        createdAt: daysAgo(35 - i * 2),
      });
      if (i < 3) {
        activityDocs.push({
          user: owner._id,
          type: "updated",
          message: `${dealTitle} updated`,
          module: "deals",
          recordId: deal._id,
          recordTitle: dealTitle,
          ipAddress: randomFrom(DEMO_IPS),
          createdAt: daysAgo(18 - i * 2),
        });
      }
      if (i < 2) {
        activityDocs.push({
          user: owner._id,
          type: "updated",
          message: `Note added to ${dealTitle}`,
          module: "deals",
          recordId: deal._id,
          recordTitle: dealTitle,
          ipAddress: randomFrom(DEMO_IPS),
          createdAt: daysAgo(8 - i * 2),
        });
      }
    }
  }

  console.log("[seed] creating tasks...");
  const TASK_TYPES: TaskType[] = ["Call", "Email", "Meeting", "Follow-up"];
  const TASK_PRIORITIES: TaskPriority[] = ["High", "Medium", "Low"];
  const TASK_STATUSES: TaskStatus[] = ["Todo", "In Progress", "Done"];
  const NOT_DONE_STATUSES: TaskStatus[] = ["Todo", "In Progress"];

  const taskCount = 20;
  const overdueTargetCount = 3;
  const dueTodayTargetCount = 4;

  for (let i = 0; i < taskCount; i++) {
    const owner = assignablePool[i % assignablePool.length];
    const type = TASK_TYPES[i % TASK_TYPES.length];
    const priority = randomFrom(TASK_PRIORITIES);

    let status: TaskStatus;
    let dueDate: Date;

    if (i < overdueTargetCount) {
      // guaranteed overdue: due in the past, never Done
      status = randomFrom(NOT_DONE_STATUSES);
      dueDate = daysAgo(1 + Math.floor(Math.random() * 14));
    } else if (i < overdueTargetCount + dueTodayTargetCount) {
      // guaranteed due today: never Done
      status = randomFrom(NOT_DONE_STATUSES);
      dueDate = new Date();
    } else {
      // remaining: free mix of statuses and due dates (past/present/future)
      status = randomFrom(TASK_STATUSES);
      const offsetDays = Math.floor(Math.random() * 61) - 20; // -20..+40 days
      dueDate = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
    }

    const relatedLead = Math.random() < 0.6 ? randomFrom(createdLeads).lead : null;
    const relatedContact = Math.random() < 0.5 ? randomFrom(contacts) : null;

    const taskTitle = randomFrom(TASK_TITLES);
    const task = await Task.create({
      title: taskTitle,
      type,
      priority,
      status,
      dueDate,
      relatedLead: relatedLead ? relatedLead._id : null,
      relatedContact: relatedContact ? relatedContact._id : null,
      assignedTo: owner._id,
      createdBy: owner._id,
    });

    if (i < 5) {
      activityDocs.push({
        user: owner._id,
        type: "created",
        message: `${taskTitle} created`,
        module: "tasks",
        recordId: task._id,
        recordTitle: taskTitle,
        ipAddress: randomFrom(DEMO_IPS),
        createdAt: daysAgo(15 - i),
      });
      if (i < 3) {
        activityDocs.push({
          user: owner._id,
          type: "updated",
          message: `${taskTitle} updated`,
          module: "tasks",
          recordId: task._id,
          recordTitle: taskTitle,
          ipAddress: randomFrom(DEMO_IPS),
          createdAt: daysAgo(7 - i),
        });
      }
    }
  }

  console.log("[seed] creating activity records...");
  await Promise.all(activityDocs.map((doc) => Activity.create(doc)));

  console.log("[seed] done.");
  console.log(`[seed] created ${companies.length} companies, ${contacts.length} contacts, ${createdLeads.length} leads, ${activityDocs.length} activity entries, ${dealCount} deals, ${totalDealNotes} deal notes, ${taskCount} tasks`);
  console.log(`[seed] admin login: admin@minicrm.com / password123`);
  console.log(`[seed] manager login: manager@minicrm.com / password123`);
  console.log(`[seed] agent login: agent@minicrm.com / password123`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
