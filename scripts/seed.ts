/**
 * Seeds categories, the outcome-package catalog, the admin account, and clearly-labeled
 * SAMPLE operator listings for demos. Sample listings are flagged `is_sample` and rendered
 * with a "Sample listing" badge everywhere; admins can hide them all from /admin.
 * Idempotent: safe to run repeatedly.
 */
import "dotenv/config";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import { randomBytes, scryptSync } from "node:crypto";
import * as schema from "../src/lib/db/schema";
import { SPECIALIZATIONS, FUNCTIONS } from "../src/lib/taxonomy";
import { PACKAGE_SEEDS } from "../src/lib/catalog";
import { newId } from "../src/lib/utils";

const client = createClient({ url: process.env.DATABASE_URL ?? "file:data/operators.db", authToken: process.env.DATABASE_AUTH_TOKEN });
const db = drizzle(client, { schema });

function hashPassword(pw: string) {
  const salt = randomBytes(16);
  const key = scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$${salt.toString("base64")}$${key.toString("base64")}`;
}

type SampleOp = {
  handle: string;
  name: string;
  headline: string;
  bio: string;
  location: string;
  timezone: string;
  specializations: string[];
  functions: string[];
  industries: string[];
  tools: string[];
  rate: number;
  min: number;
  availability: "available" | "limited" | "booked";
  hours: number;
  years: number;
  level: "emerging" | "proven" | "expert";
  featured?: boolean;
  portfolio: { title: string; summary: string; problem: string; solution: string; tools: string[]; metrics: schema.Metric[] }[];
  services: { pkg: string; price: number; days: number; title?: string }[];
};

const SAMPLES: SampleOp[] = [
  {
    handle: "mara-okafor", name: "Mara Okafor", headline: "Legal-ops engineer turning contract review into a 10-minute job",
    bio: "Former paralegal who taught herself Python and LLM engineering. I build document-review systems for law firms and in-house teams, always measured against the firm's own past agreements before anyone relies on them.",
    location: "Toronto, CA", timezone: "ET", specializations: ["document-ai", "llm-engineering", "workflow-automation"], functions: ["legal", "operations"],
    industries: ["legal-services", "professional-services"], tools: ["Claude", "Anthropic API", "Python", "Microsoft 365", "Clio", "DocuSign"], rate: 165, min: 6000,
    availability: "available", hours: 25, years: 6, level: "expert", featured: true,
    portfolio: [
      { title: "NDA first-pass reviewer for a mid-size firm", summary: "Playbook-driven review that flags deviations with clause citations.", problem: "Associates spent most of Friday on routine NDAs.", solution: "Encoded the firm's NDA playbook as testable rules; Claude flags deviations and drafts fallback language as tracked changes.", tools: ["Claude", "Microsoft 365", "Python"], metrics: [{ label: "Review time per NDA", before: "45 min", after: "8 min" }] },
      { title: "Clause extraction into the matter system", summary: "Renewal dates and obligations pulled into Clio automatically.", problem: "Renewal dates lived in PDFs and were missed.", solution: "Extraction pipeline with confidence routing to a paralegal queue.", tools: ["Clio", "Anthropic API"], metrics: [{ label: "Missed renewals per quarter", before: "4", after: "0" }] },
    ],
    services: [{ pkg: "automate-contract-review", price: 9500, days: 28 }],
  },
  {
    handle: "theo-lindqvist", name: "Theo Lindqvist", headline: "Support automation for teams drowning in tickets",
    bio: "Ran a 30-person support org before going independent. I deploy triage and grounded draft replies inside the helpdesk your agents already use, and I measure everything against your baseline.",
    location: "Stockholm, SE", timezone: "CET", specializations: ["support-ai", "knowledge", "agents"], functions: ["support"], industries: ["saas", "ecommerce"],
    tools: ["Zendesk", "Intercom", "Claude", "n8n", "Slack"], rate: 140, min: 5000, availability: "available", hours: 30, years: 8, level: "expert", featured: true,
    portfolio: [
      { title: "Draft-reply assistant in Zendesk", summary: "Grounded replies with citations, approved by agents in one click.", problem: "First response times had crept past 9 hours.", solution: "Intent taxonomy, routing rules, and Claude-drafted replies grounded in the help center.", tools: ["Zendesk", "Claude"], metrics: [{ label: "First response time", before: "9h", after: "1.5h" }] },
    ],
    services: [{ pkg: "automate-customer-support", price: 7000, days: 30 }],
  },
  {
    handle: "priya-raman", name: "Priya Raman", headline: "RAG and knowledge assistants that actually cite their sources",
    bio: "ML engineer focused on retrieval systems with real evaluation. I build permission-aware knowledge assistants and won't call one done until it passes an eval set made of your team's real questions.",
    location: "Bengaluru, IN", timezone: "IST", specializations: ["knowledge", "llm-engineering", "integrations"], functions: ["operations", "engineering"], industries: ["saas", "professional-services", "insurance"],
    tools: ["Claude", "Anthropic API", "Python", "Pinecone", "Postgres", "Notion", "Slack", "Google Workspace"], rate: 120, min: 6000, availability: "limited", hours: 15, years: 7, level: "expert", featured: true,
    portfolio: [
      { title: "Policy assistant for an insurance ops team", summary: "Slack assistant answering from 2,000 policy documents.", problem: "New hires took 3 months to learn where answers lived.", solution: "Permission-aware retrieval over SharePoint with a 120-question eval suite.", tools: ["Claude", "Postgres", "Slack"], metrics: [{ label: "Answer accuracy on eval set", before: "n/a", after: "94%" }] },
    ],
    services: [{ pkg: "build-an-internal-ai-knowledge-base", price: 8000, days: 30 }],
  },
  {
    handle: "diego-santos", name: "Diego Santos", headline: "n8n and Make builder for finance and ops back offices",
    bio: "Self-taught automation builder, previously an AP clerk. I know exactly where invoices get stuck because I used to be the one retyping them.",
    location: "Mexico City, MX", timezone: "CT", specializations: ["workflow-automation", "document-ai", "integrations"], functions: ["finance", "operations"], industries: ["logistics", "construction", "ecommerce"],
    tools: ["n8n", "Make", "Claude", "QuickBooks", "Xero", "Airtable", "Google Workspace"], rate: 85, min: 3000, availability: "available", hours: 35, years: 4, level: "proven", featured: true,
    portfolio: [
      { title: "Invoice inbox to QuickBooks", summary: "Extraction, PO matching, and approvals for a distributor.", problem: "Two people spent most of each week keying invoices.", solution: "n8n pipeline with Claude extraction and an exception queue in Airtable.", tools: ["n8n", "Claude", "QuickBooks"], metrics: [{ label: "Manual keying hours / week", before: "30", after: "6" }] },
    ],
    services: [{ pkg: "automate-invoice-processing", price: 5500, days: 21 }, { pkg: "ai-workflow-audit", price: 2500, days: 10 }],
  },
  {
    handle: "hannah-cole", name: "Hannah Cole", headline: "AI adoption lead: workshops that change how teams work",
    bio: "Former L&D director. I run hands-on training built around each team's real tasks, then leave behind a workflow library and a usage policy people actually follow.",
    location: "Austin, US", timezone: "CT", specializations: ["training", "ai-strategy", "content-ai"], functions: ["leadership", "marketing", "recruiting"], industries: ["professional-services", "nonprofit", "education"],
    tools: ["Claude", "ChatGPT", "Copilot", "Microsoft 365", "Notion"], rate: 150, min: 3000, availability: "available", hours: 20, years: 10, level: "expert",
    portfolio: [
      { title: "Firm-wide AI enablement for a 120-person consultancy", summary: "Role-based workshops and a shared workflow library.", problem: "Licenses were bought, but weekly active use was low.", solution: "Six role-specific workshops, a prompt library in Notion, and office hours.", tools: ["Claude", "Notion"], metrics: [{ label: "Weekly active AI users", before: "18%", after: "71%" }] },
    ],
    services: [{ pkg: "train-your-team-on-ai", price: 3500, days: 14 }, { pkg: "ai-workflow-audit", price: 3000, days: 10 }],
  },
  {
    handle: "kenji-watanabe", name: "Kenji Watanabe", headline: "Agent engineer for multi-step ops processes",
    bio: "Backend engineer building tool-using agents with approval gates and scenario-based evals. I prefer boring, observable systems over impressive demos.",
    location: "Lisbon, PT", timezone: "WET", specializations: ["agents", "llm-engineering", "integrations"], functions: ["operations", "engineering", "sales"], industries: ["saas", "logistics"],
    tools: ["Claude", "Anthropic API", "Claude Code", "TypeScript", "Python", "Postgres", "Retool"], rate: 175, min: 9000, availability: "limited", hours: 20, years: 9, level: "expert",
    portfolio: [
      { title: "Order exception agent for a 3PL", summary: "Agent resolves shipping exceptions across WMS, email, and carrier APIs.", problem: "Ops staff triaged hundreds of exceptions daily.", solution: "Agent with approval gates for refunds and a 200-scenario eval suite.", tools: ["Claude", "TypeScript", "Postgres"], metrics: [{ label: "Exceptions resolved without escalation", before: "0%", after: "62%" }] },
    ],
    services: [{ pkg: "build-a-custom-ai-agent", price: 12000, days: 35 }],
  },
  {
    handle: "amara-diallo", name: "Amara Diallo", headline: "Revenue ops automation: research, drafting, CRM autopilot",
    bio: "Ex-SDR manager turned RevOps builder. I set up enrichment, personalized drafting, and post-call CRM updates, then coach reps until the new workflow sticks.",
    location: "London, UK", timezone: "GMT", specializations: ["sales-ai", "integrations", "workflow-automation"], functions: ["sales", "marketing"], industries: ["saas", "professional-services"],
    tools: ["Clay", "HubSpot", "Salesforce", "Claude", "Zapier", "Slack"], rate: 130, min: 5000, availability: "available", hours: 25, years: 7, level: "proven", featured: true,
    portfolio: [
      { title: "Post-call CRM autopilot", summary: "Calls become HubSpot updates and next steps automatically.", problem: "Reps logged notes hours later, or never.", solution: "Transcript-to-CRM workflow with rep confirmation in Slack.", tools: ["HubSpot", "Claude", "Zapier"], metrics: [{ label: "Deals with next step logged", before: "41%", after: "93%" }] },
    ],
    services: [{ pkg: "implement-ai-across-your-sales-team", price: 6500, days: 25 }],
  },
  {
    handle: "lucas-meyer", name: "Lucas Meyer", headline: "Reporting pipelines and AI-written weekly business reviews",
    bio: "Analytics engineer. I replace the spreadsheet scramble with clean pipelines and narrative reports that explain what changed and why.",
    location: "Berlin, DE", timezone: "CET", specializations: ["data-analytics", "integrations", "workflow-automation"], functions: ["finance", "leadership", "operations"], industries: ["ecommerce", "saas", "accounting"],
    tools: ["Python", "Postgres", "Claude", "Google Workspace", "n8n"], rate: 110, min: 4000, availability: "booked", hours: 10, years: 6, level: "proven",
    portfolio: [
      { title: "Automated weekly business review", summary: "Six sources into one model and a narrative report.", problem: "Finance spent every Monday assembling the WBR.", solution: "Scheduled pipeline with validation checks and a Claude-written narrative reviewed by the CFO.", tools: ["Python", "Postgres", "Claude"], metrics: [{ label: "Hours to produce WBR", before: "9", after: "1" }] },
    ],
    services: [],
  },
  {
    handle: "sofia-marquez", name: "Sofia Márquez", headline: "Voice agents for clinics and service businesses",
    bio: "I build AI receptionists that answer, book, and route calls, piloted on overflow first so nobody's patients get a bad experience.",
    location: "Madrid, ES", timezone: "CET", specializations: ["voice-ai", "agents", "integrations"], functions: ["support", "operations"], industries: ["healthcare", "real-estate", "construction"],
    tools: ["Vapi", "Claude", "Google Workspace", "Make"], rate: 115, min: 5000, availability: "available", hours: 25, years: 5, level: "proven",
    portfolio: [
      { title: "After-hours receptionist for a dental group", summary: "Voice agent books appointments into the practice system.", problem: "Evening calls went to voicemail and were lost.", solution: "Voice agent with calendar integration and next-morning human follow-up queue.", tools: ["Vapi", "Claude"], metrics: [{ label: "After-hours calls answered", before: "0%", after: "100%" }] },
    ],
    services: [{ pkg: "build-a-custom-ai-agent", price: 8500, days: 28, title: "AI receptionist build" }],
  },
  {
    handle: "noah-brennan", name: "Noah Brennan", headline: "Recruiting ops automation with humans in every decision",
    bio: "Former technical recruiter. I automate scheduling and status emails and build transparent screening rubrics, never black-box rejections.",
    location: "Dublin, IE", timezone: "GMT", specializations: ["workflow-automation", "document-ai", "training"], functions: ["recruiting"], industries: ["saas", "professional-services"],
    tools: ["Greenhouse", "Zapier", "Claude", "Google Workspace", "Slack"], rate: 95, min: 3500, availability: "available", hours: 20, years: 5, level: "proven",
    portfolio: [
      { title: "Rubric-based screening assist", summary: "Structured scoring with written rationale for each applicant.", problem: "Recruiters screened 400 applicants per role by hand.", solution: "Explicit rubric with bias review; Claude drafts rationale, recruiters decide.", tools: ["Greenhouse", "Claude"], metrics: [{ label: "Screening hours per role", before: "22", after: "7" }] },
    ],
    services: [{ pkg: "ai-workflow-audit", price: 2800, days: 10 }],
  },
  {
    handle: "ines-carvalho", name: "Inês Carvalho", headline: "Content operations for lean marketing teams",
    bio: "Editor turned automation builder. I build brand-voice content pipelines that turn expert knowledge into a steady publishing rhythm, with editors always in the loop.",
    location: "Porto, PT", timezone: "WET", specializations: ["content-ai", "workflow-automation", "training"], functions: ["marketing"], industries: ["saas", "professional-services", "nonprofit"],
    tools: ["Claude", "Notion", "Make", "Google Workspace"], rate: 90, min: 3000, availability: "limited", hours: 15, years: 6, level: "emerging",
    portfolio: [
      { title: "Interview-to-article pipeline", summary: "Expert interviews become drafts in brand voice.", problem: "One blog post a month, blocked on SMEs.", solution: "Recorded interviews, voice guide, and a review workflow in Notion.", tools: ["Claude", "Notion"], metrics: [{ label: "Posts published per month", before: "1", after: "6" }] },
    ],
    services: [],
  },
  {
    handle: "sam-adeyemi", name: "Sam Adeyemi", headline: "Fractional AI lead for SMBs starting from zero",
    bio: "I help owner-led businesses figure out where AI fits, ship the first automation in weeks, and set up the habits and guardrails to keep going.",
    location: "Lagos, NG", timezone: "WAT", specializations: ["ai-strategy", "workflow-automation", "training"], functions: ["leadership", "operations", "finance"], industries: ["professional-services", "real-estate", "accounting"],
    tools: ["Claude", "ChatGPT", "Zapier", "Airtable", "Google Workspace", "Microsoft 365"], rate: 100, min: 2500, availability: "available", hours: 30, years: 5, level: "proven",
    portfolio: [
      { title: "Audit and first automation for a property manager", summary: "Ranked backlog and a tenant-request triage workflow.", problem: "Leadership didn't know where to start.", solution: "Two-week audit across four teams, then shipped the top-ranked workflow.", tools: ["Zapier", "Claude", "Airtable"], metrics: [{ label: "Tenant request response", before: "2 days", after: "3 hours" }] },
    ],
    services: [{ pkg: "ai-workflow-audit", price: 2500, days: 10 }, { pkg: "train-your-team-on-ai", price: 3000, days: 14 }],
  },
];

const SAMPLE_STORIES = [
  {
    slug: "sample-contract-review-mid-size-firm", handle: "mara-okafor", title: "From 45 minutes to 8 per NDA", clientLabel: "Illustrative example: 60-lawyer commercial firm", function: "legal",
    summary: "A walkthrough of how a playbook-driven review system typically changes first-pass contract review.",
    before: ["Associates read every NDA end to end", "Playbook lived in a partner's head and a 2019 memo", "Turnaround: 2 business days"],
    after: ["AI flags deviations with clause citations", "Playbook encoded as testable rules", "Associates confirm flags and send redlines the same day"],
    metrics: [{ label: "Review time per NDA", before: "45 min", after: "8 min" }, { label: "Turnaround", before: "2 days", after: "Same day" }], tools: ["Claude", "Microsoft 365", "Python"],
  },
  {
    slug: "sample-support-triage-saas", handle: "theo-lindqvist", title: "Support that answers in hours, not days", clientLabel: "Illustrative example: B2B SaaS, 12 support agents", function: "support",
    summary: "How grounded draft replies and routing usually reshape a support queue.",
    before: ["Every ticket triaged by hand", "Agents rewrote the same answers daily", "First response: 9 hours"],
    after: ["Tickets auto-classified and routed", "Draft replies grounded in help-center docs", "Agents approve or edit in one click"],
    metrics: [{ label: "First response time", before: "9h", after: "1.5h" }], tools: ["Zendesk", "Claude"],
  },
  {
    slug: "sample-invoice-automation-distributor", handle: "diego-santos", title: "The end of invoice retyping", clientLabel: "Illustrative example: regional distributor", function: "finance",
    summary: "What an invoice pipeline with confidence routing typically looks like before and after.",
    before: ["Invoices keyed from PDFs", "PO matching in spreadsheets", "Month-end crunch every month"],
    after: ["Invoices extracted on arrival", "Automatic PO matching", "Humans only review low-confidence fields"],
    metrics: [{ label: "Manual keying hours / week", before: "30", after: "6" }], tools: ["n8n", "Claude", "QuickBooks"],
  },
];

async function main() {
  // Categories
  for (const [i, s] of SPECIALIZATIONS.entries()) {
    await db.insert(schema.categories).values({ id: newId("cat"), kind: "specialization", slug: s.slug, name: s.name, description: s.description, sortOrder: i }).onConflictDoNothing();
  }
  for (const [i, f] of FUNCTIONS.entries()) {
    await db.insert(schema.categories).values({ id: newId("cat"), kind: "function", slug: f.slug, name: f.name, description: f.description, sortOrder: i }).onConflictDoNothing();
  }

  // Packages
  for (const [i, p] of PACKAGE_SEEDS.entries()) {
    await db
      .insert(schema.packages)
      .values({ id: newId("pkg"), ...p, sortOrder: i })
      .onConflictDoUpdate({ target: schema.packages.slug, set: { ...p, sortOrder: i } });
  }
  const pkgs = await db.select().from(schema.packages);
  const pkgBySlug = new Map(pkgs.map((p) => [p.slug, p]));

  // Admin
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@operators.local").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "change-me-please-123";
  const existingAdmin = await db.select().from(schema.users).where(eq(schema.users.email, adminEmail)).limit(1);
  if (!existingAdmin.length) {
    await db.insert(schema.users).values({ id: newId("usr"), email: adminEmail, name: "Operators Admin", passwordHash: hashPassword(adminPassword), role: "admin", referralCode: newId("", 8) });
    console.log(`Created admin ${adminEmail}`);
  }

  // Sample operators
  for (const s of SAMPLES) {
    const existing = await db.select().from(schema.operators).where(eq(schema.operators.handle, s.handle)).limit(1);
    if (existing.length) continue;
    const id = newId("op");
    await db.insert(schema.operators).values({
      id, handle: s.handle, name: s.name, headline: s.headline, bio: s.bio, location: s.location, timezone: s.timezone,
      specializations: s.specializations, functions: s.functions, industries: s.industries, tools: s.tools,
      hourlyRateCents: s.rate * 100, minProjectCents: s.min * 100, availability: s.availability, hoursPerWeek: s.hours,
      yearsExperience: s.years, experienceLevel: s.level, status: "approved", isSample: true, featured: Boolean(s.featured),
      approvedAt: new Date(), submittedAt: new Date(),
      links: [],
    });
    for (const [i, p] of s.portfolio.entries()) {
      await db.insert(schema.portfolioItems).values({ id: newId("pf"), operatorId: id, sortOrder: i, ...p });
    }
    for (const svc of s.services) {
      const pkg = pkgBySlug.get(svc.pkg);
      if (!pkg) continue;
      await db.insert(schema.services).values({
        id: newId("svc"), operatorId: id, packageId: pkg.id, title: svc.title ?? pkg.title, description: pkg.scope,
        deliverables: pkg.deliverables, priceCents: svc.price * 100, timelineDays: svc.days,
      });
    }
  }

  const ops = await db.select().from(schema.operators);
  const opByHandle = new Map(ops.map((o) => [o.handle, o]));
  for (const st of SAMPLE_STORIES) {
    const { handle, ...rest } = st;
    await db.insert(schema.caseStudies).values({ id: newId("cs"), ...rest, operatorId: opByHandle.get(handle)?.id ?? null, status: "published", isSample: true }).onConflictDoNothing();
  }

  await db.insert(schema.settings).values({ key: "show_sample_listings", value: "true" }).onConflictDoNothing();
  console.log(`Seed complete: ${pkgs.length} packages, ${ops.length} operators.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
