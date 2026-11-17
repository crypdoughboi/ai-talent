import { sqliteTable, text, integer, blob, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const now = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;
const createdAt = () => integer("created_at", { mode: "timestamp_ms" }).notNull().default(now);

export type Role = "company" | "operator" | "admin";

/* ───────────────────────────── Identity ───────────────────────────── */

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").$type<Role>().notNull(),
    referralCode: text("referral_code").notNull(),
    referredById: text("referred_by_id"),
    disabled: integer("disabled", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email), uniqueIndex("users_ref_idx").on(t.referralCode)],
);

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(), // sha256 of the cookie token
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: createdAt(),
});

export const companies = sqliteTable("companies", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  website: text("website"),
  size: text("size"),
  industry: text("industry"),
  createdAt: createdAt(),
});

/* ───────────────────────────── Operators ───────────────────────────── */

export type OperatorStatus = "draft" | "pending" | "approved" | "rejected" | "suspended";
export type Availability = "available" | "limited" | "booked";

export const operators = sqliteTable(
  "operators",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    handle: text("handle").notNull(),
    name: text("name").notNull(),
    headline: text("headline").notNull().default(""),
    bio: text("bio").notNull().default(""),
    location: text("location").notNull().default(""),
    timezone: text("timezone").notNull().default(""),
    avatarFileId: text("avatar_file_id"),
    specializations: text("specializations", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    functions: text("functions", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    industries: text("industries", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    tools: text("tools", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    links: text("links", { mode: "json" }).$type<{ label: string; url: string }[]>().notNull().default(sql`'[]'`),
    hourlyRateCents: integer("hourly_rate_cents"),
    minProjectCents: integer("min_project_cents"),
    availability: text("availability").$type<Availability>().notNull().default("available"),
    hoursPerWeek: integer("hours_per_week"),
    yearsExperience: integer("years_experience"),
    experienceLevel: text("experience_level").$type<"emerging" | "proven" | "expert">().notNull().default("proven"),
    status: text("status").$type<OperatorStatus>().notNull().default("draft"),
    statusNote: text("status_note"),
    isSample: integer("is_sample", { mode: "boolean" }).notNull().default(false),
    featured: integer("featured", { mode: "boolean" }).notNull().default(false),
    submittedAt: integer("submitted_at", { mode: "timestamp_ms" }),
    approvedAt: integer("approved_at", { mode: "timestamp_ms" }),
    stripeAccountId: text("stripe_account_id"),
    createdAt: createdAt(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
  },
  (t) => [uniqueIndex("operators_handle_idx").on(t.handle), index("operators_status_idx").on(t.status)],
);

export type Metric = { label: string; before: string; after: string };

export const portfolioItems = sqliteTable("portfolio_items", {
  id: text("id").primaryKey(),
  operatorId: text("operator_id").notNull().references(() => operators.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  summary: text("summary").notNull().default(""),
  problem: text("problem").notNull().default(""),
  solution: text("solution").notNull().default(""),
  tools: text("tools", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  demoUrl: text("demo_url"),
  metrics: text("metrics", { mode: "json" }).$type<Metric[]>().notNull().default(sql`'[]'`),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

export type VerificationKind = "identity" | "deployment" | "skill" | "reference";
export type ReviewStatus = "pending" | "approved" | "rejected";

export const verifications = sqliteTable("verifications", {
  id: text("id").primaryKey(),
  operatorId: text("operator_id").notNull().references(() => operators.id, { onDelete: "cascade" }),
  kind: text("kind").$type<VerificationKind>().notNull(),
  title: text("title").notNull(),
  evidenceUrl: text("evidence_url"),
  details: text("details").notNull().default(""),
  status: text("status").$type<ReviewStatus>().notNull().default("pending"),
  reviewerId: text("reviewer_id"),
  reviewNote: text("review_note"),
  reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }),
  createdAt: createdAt(),
});

/* ─────────────────────────── Catalog / packages ─────────────────────────── */

export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    kind: text("kind").$type<"specialization" | "function">().notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("categories_kind_slug_idx").on(t.kind, t.slug)],
);

export type PackageMilestone = { title: string; description: string; share: number };

export const packages = sqliteTable(
  "packages",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    tagline: text("tagline").notNull(),
    function: text("function").notNull(),
    specializations: text("specializations", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    scope: text("scope").notNull(),
    deliverables: text("deliverables", { mode: "json" }).$type<string[]>().notNull(),
    inputs: text("inputs", { mode: "json" }).$type<string[]>().notNull(),
    milestones: text("milestones", { mode: "json" }).$type<PackageMilestone[]>().notNull(),
    timelineMinWeeks: integer("timeline_min_weeks").notNull(),
    timelineMaxWeeks: integer("timeline_max_weeks").notNull(),
    startingPriceCents: integer("starting_price_cents").notNull(),
    outcome: text("outcome").notNull().default(""),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("packages_slug_idx").on(t.slug)],
);

/** An operator's fixed-price offering, optionally tied to a catalog package. */
export const services = sqliteTable("services", {
  id: text("id").primaryKey(),
  operatorId: text("operator_id").notNull().references(() => operators.id, { onDelete: "cascade" }),
  packageId: text("package_id").references(() => packages.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  deliverables: text("deliverables", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  priceCents: integer("price_cents").notNull(),
  timelineDays: integer("timeline_days").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: createdAt(),
});

/* ───────────────────────────── Demand side ───────────────────────────── */

export type BriefApproach = { title: string; description: string; tools: string[] };
export type BriefMilestone = { title: string; description: string; weeks: number };
export type BriefStatus = "draft" | "open" | "hired" | "closed";

export const briefs = sqliteTable(
  "briefs",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    problemStatement: text("problem_statement").notNull(),
    businessProblem: text("business_problem").notNull(),
    approaches: text("approaches", { mode: "json" }).$type<BriefApproach[]>().notNull(),
    capabilities: text("capabilities", { mode: "json" }).$type<string[]>().notNull(),
    functions: text("functions", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    industry: text("industry"),
    tools: text("tools", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    milestones: text("milestones", { mode: "json" }).$type<BriefMilestone[]>().notNull(),
    assumptions: text("assumptions", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    budgetMinCents: integer("budget_min_cents").notNull(),
    budgetMaxCents: integer("budget_max_cents").notNull(),
    timelineWeeks: integer("timeline_weeks").notNull(),
    hoursSavedLow: integer("hours_saved_low"),
    hoursSavedHigh: integer("hours_saved_high"),
    generatedBy: text("generated_by").$type<"ai" | "rules" | "package">().notNull(),
    visibility: text("visibility").$type<"invite_only" | "network">().notNull().default("invite_only"),
    packageId: text("package_id"),
    status: text("status").$type<BriefStatus>().notNull().default("open"),
    createdAt: createdAt(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(now),
  },
  (t) => [index("briefs_company_idx").on(t.companyId)],
);

export const invitations = sqliteTable(
  "invitations",
  {
    id: text("id").primaryKey(),
    briefId: text("brief_id").notNull().references(() => briefs.id, { onDelete: "cascade" }),
    operatorId: text("operator_id").notNull().references(() => operators.id, { onDelete: "cascade" }),
    serviceId: text("service_id"),
    message: text("message").notNull().default(""),
    status: text("status").$type<"invited" | "declined" | "proposed" | "accepted">().notNull().default("invited"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("invitations_brief_operator_idx").on(t.briefId, t.operatorId)],
);

export type ProposalMilestone = { title: string; description: string; amountCents: number; days: number };

export const proposals = sqliteTable(
  "proposals",
  {
    id: text("id").primaryKey(),
    briefId: text("brief_id").notNull().references(() => briefs.id, { onDelete: "cascade" }),
    operatorId: text("operator_id").notNull().references(() => operators.id, { onDelete: "cascade" }),
    coverNote: text("cover_note").notNull(),
    approach: text("approach").notNull(),
    milestones: text("milestones", { mode: "json" }).$type<ProposalMilestone[]>().notNull(),
    totalCents: integer("total_cents").notNull(),
    timelineDays: integer("timeline_days").notNull(),
    projectedHoursSaved: integer("projected_hours_saved"),
    status: text("status").$type<"submitted" | "withdrawn" | "accepted" | "declined">().notNull().default("submitted"),
    createdAt: createdAt(),
  },
  (t) => [index("proposals_brief_idx").on(t.briefId)],
);

/* ───────────────────────────── Delivery ───────────────────────────── */

export type EngagementStatus = "awaiting_payment" | "active" | "completed" | "cancelled";

export type Impact = { hoursPerWeek: number | null; note: string };

export const engagements = sqliteTable(
  "engagements",
  {
    id: text("id").primaryKey(),
    briefId: text("brief_id").notNull().references(() => briefs.id),
    proposalId: text("proposal_id").notNull().references(() => proposals.id),
    companyId: text("company_id").notNull().references(() => companies.id),
    operatorId: text("operator_id").notNull().references(() => operators.id),
    threadId: text("thread_id").notNull(),
    title: text("title").notNull(),
    status: text("status").$type<EngagementStatus>().notNull().default("awaiting_payment"),
    billingModel: text("billing_model").$type<"fixed" | "hourly">().notNull().default("fixed"),
    totalCents: integer("total_cents").notNull(),
    platformFeeBps: integer("platform_fee_bps").notNull(),
    projectedImpact: text("projected_impact", { mode: "json" }).$type<Impact>(),
    documentedImpact: text("documented_impact", { mode: "json" }).$type<Impact>(),
    impactConfirmedAt: integer("impact_confirmed_at", { mode: "timestamp_ms" }),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (t) => [index("engagements_company_idx").on(t.companyId), index("engagements_operator_idx").on(t.operatorId)],
);

export type MilestoneStatus = "awaiting_payment" | "in_progress" | "submitted" | "revision_requested" | "approved";

export const milestones = sqliteTable("milestones", {
  id: text("id").primaryKey(),
  engagementId: text("engagement_id").notNull().references(() => engagements.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  amountCents: integer("amount_cents").notNull(),
  dueDays: integer("due_days").notNull(),
  sortOrder: integer("sort_order").notNull(),
  status: text("status").$type<MilestoneStatus>().notNull().default("awaiting_payment"),
  deliverableNote: text("deliverable_note"),
  deliverableUrl: text("deliverable_url"),
  feedback: text("feedback"),
  submittedAt: integer("submitted_at", { mode: "timestamp_ms" }),
  approvedAt: integer("approved_at", { mode: "timestamp_ms" }),
});

/** Invoices double as the transaction ledger. Hourly billing will add kind = "hourly". */
export const invoices = sqliteTable(
  "invoices",
  {
    id: text("id").primaryKey(),
    number: text("number").notNull(),
    engagementId: text("engagement_id").notNull().references(() => engagements.id, { onDelete: "cascade" }),
    milestoneId: text("milestone_id"),
    kind: text("kind").$type<"milestone" | "hourly">().notNull().default("milestone"),
    amountCents: integer("amount_cents").notNull(),
    platformFeeCents: integer("platform_fee_cents").notNull(),
    payoutCents: integer("payout_cents").notNull(),
    status: text("status").$type<"open" | "processing" | "paid" | "void">().notNull().default("open"),
    provider: text("provider").$type<"stripe" | "simulated">(),
    stripeSessionId: text("stripe_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    paidAt: integer("paid_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("invoices_number_idx").on(t.number)],
);

export const threads = sqliteTable(
  "threads",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    operatorId: text("operator_id").notNull().references(() => operators.id, { onDelete: "cascade" }),
    briefId: text("brief_id"),
    subject: text("subject").notNull(),
    lastMessageAt: integer("last_message_at", { mode: "timestamp_ms" }).notNull().default(now),
    companyReadAt: integer("company_read_at", { mode: "timestamp_ms" }),
    operatorReadAt: integer("operator_read_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (t) => [index("threads_company_idx").on(t.companyId), index("threads_operator_idx").on(t.operatorId)],
);

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    threadId: text("thread_id").notNull().references(() => threads.id, { onDelete: "cascade" }),
    senderId: text("sender_id"), // null = system event
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("messages_thread_idx").on(t.threadId)],
);

/** Binary storage kept in the database for portability (avatars, project files). */
export const files = sqliteTable("files", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  engagementId: text("engagement_id"),
  purpose: text("purpose").$type<"avatar" | "project">().notNull(),
  name: text("name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  data: blob("data", { mode: "buffer" }).notNull(),
  createdAt: createdAt(),
});

export const reviews = sqliteTable("reviews", {
  id: text("id").primaryKey(),
  engagementId: text("engagement_id").notNull().references(() => engagements.id, { onDelete: "cascade" }),
  operatorId: text("operator_id").notNull().references(() => operators.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull(),
  authorLabel: text("author_label").notNull(),
  rating: integer("rating").notNull(),
  body: text("body").notNull(),
  createdAt: createdAt(),
});

export const caseStudies = sqliteTable(
  "case_studies",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    engagementId: text("engagement_id"),
    operatorId: text("operator_id").references(() => operators.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    clientLabel: text("client_label").notNull(),
    function: text("function").notNull(),
    before: text("before", { mode: "json" }).$type<string[]>().notNull(),
    after: text("after", { mode: "json" }).$type<string[]>().notNull(),
    metrics: text("metrics", { mode: "json" }).$type<Metric[]>().notNull(),
    tools: text("tools", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    quote: text("quote"),
    status: text("status").$type<"draft" | "pending_client" | "published" | "hidden">().notNull().default("draft"),
    isSample: integer("is_sample", { mode: "boolean" }).notNull().default(false),
    clientApprovedAt: integer("client_approved_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("case_studies_slug_idx").on(t.slug)],
);

/* ───────────────────────────── Growth ───────────────────────────── */

export const diagnostics = sqliteTable("diagnostics", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  referrerId: text("referrer_id"),
  companyLabel: text("company_label").notNull(),
  answers: text("answers", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  report: text("report", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  views: integer("views").notNull().default(0),
  createdAt: createdAt(),
});

export const waitlist = sqliteTable("waitlist", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  kind: text("kind").$type<"company" | "operator">().notNull(),
  interest: text("interest").notNull().default(""),
  createdAt: createdAt(),
});

export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    path: text("path"),
    userId: text("user_id"),
    props: text("props", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [index("events_name_idx").on(t.name, t.createdAt)],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
