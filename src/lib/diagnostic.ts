import { z } from "zod";
import { COMPANY_SIZES, FUNCTION_SLUGS, INDUSTRY_SLUGS, functionName } from "./taxonomy";

export const TASKS = [
  { id: "copy_data", label: "Copying data between systems", fns: ["operations", "finance", "sales"], share: [0.6, 0.8], effort: "Low", ttv: "1–3 weeks", title: "Eliminate copy-paste between systems", desc: "Sync records automatically between your tools with validation and an exception queue for edge cases.", pkg: "ai-workflow-audit", caps: ["workflow-automation", "integrations"] },
  { id: "repetitive_questions", label: "Answering the same questions repeatedly", fns: ["support", "operations"], share: [0.3, 0.55], effort: "Medium", ttv: "3–5 weeks", title: "Answer repeat questions from your own docs", desc: "A grounded assistant that answers customers or colleagues with citations, escalating what it can't handle.", pkg: "automate-customer-support", caps: ["support-ai", "knowledge"] },
  { id: "review_documents", label: "Reading and reviewing documents or contracts", fns: ["legal", "operations", "finance"], share: [0.4, 0.65], effort: "Medium", ttv: "3–5 weeks", title: "First-pass document and contract review", desc: "Extract key terms and flag deviations against your rules so experts only review what matters.", pkg: "automate-contract-review", caps: ["document-ai", "llm-engineering"] },
  { id: "write_reports", label: "Assembling recurring reports", fns: ["finance", "leadership", "operations"], share: [0.5, 0.8], effort: "Low", ttv: "2–3 weeks", title: "Automate recurring reports", desc: "Pull data on a schedule and generate the narrative, reviewed before it's sent.", pkg: null, caps: ["data-analytics", "integrations"] },
  { id: "scheduling", label: "Scheduling and coordination", fns: ["operations", "recruiting", "support"], share: [0.4, 0.7], effort: "Low", ttv: "1–2 weeks", title: "Automate scheduling and coordination", desc: "Bookings, reminders, and hand-offs handled automatically across calendars and inboxes.", pkg: null, caps: ["workflow-automation", "agents"] },
  { id: "lead_research", label: "Researching and qualifying leads", fns: ["sales", "marketing"], share: [0.3, 0.5], effort: "Medium", ttv: "3–4 weeks", title: "Research and qualify leads automatically", desc: "Enrich and score accounts, then draft personalized outreach for reps to approve.", pkg: "implement-ai-across-your-sales-team", caps: ["sales-ai", "integrations"] },
  { id: "invoices", label: "Processing invoices, receipts, or expenses", fns: ["finance"], share: [0.5, 0.75], effort: "Medium", ttv: "2–4 weeks", title: "Automate invoice and expense processing", desc: "Extract, match, and post to accounting automatically, with humans reviewing only exceptions.", pkg: "automate-invoice-processing", caps: ["document-ai", "workflow-automation"] },
  { id: "screening", label: "Screening applicants", fns: ["recruiting"], share: [0.35, 0.6], effort: "Medium", ttv: "2–3 weeks", title: "Structured applicant screening assist", desc: "Score applicants against an explicit rubric with rationale; recruiters make every decision.", pkg: null, caps: ["workflow-automation", "document-ai"] },
  { id: "first_drafts", label: "Writing first drafts (emails, proposals, content)", fns: ["marketing", "sales", "leadership"], share: [0.3, 0.5], effort: "Low", ttv: "1–2 weeks", title: "First drafts in your voice", desc: "Templates and a voice guide that turn notes into ready-to-edit drafts.", pkg: "train-your-team-on-ai", caps: ["content-ai", "training"] },
  { id: "meeting_notes", label: "Meeting notes and follow-ups", fns: ["operations", "sales", "leadership"], share: [0.4, 0.7], effort: "Low", ttv: "1 week", title: "Meetings that update your systems", desc: "Summaries, action items, and CRM/task updates created automatically after every call.", pkg: null, caps: ["workflow-automation", "integrations"] },
] as const;

export const MATURITY = [
  { id: "none", label: "We haven't really started" },
  { id: "experimenting", label: "Individuals experiment on their own" },
  { id: "rolled_out", label: "Some tools are rolled out to teams" },
  { id: "production", label: "We run AI systems in production" },
] as const;

export const PRIORITIES = [
  { id: "time", label: "Free up team time" },
  { id: "revenue", label: "Grow revenue" },
  { id: "cx", label: "Improve customer experience" },
  { id: "errors", label: "Reduce errors and risk" },
  { id: "scale", label: "Scale without hiring" },
] as const;

export const SYSTEMS = ["Google Workspace", "Microsoft 365", "Slack", "HubSpot", "Salesforce", "Zendesk / Intercom", "QuickBooks / Xero", "Notion / Confluence", "An ATS", "Custom database"] as const;

export const diagnosticSchema = z.object({
  companyLabel: z.string().trim().max(80).default(""),
  size: z.enum(COMPANY_SIZES),
  industry: z.enum(INDUSTRY_SLUGS).nullable(),
  functionHours: z.array(z.object({ fn: z.enum(FUNCTION_SLUGS), hours: z.number().int().min(0).max(400) })).max(9),
  tasks: z.array(z.enum(TASKS.map((t) => t.id) as [string, ...string[]])).min(1, "Pick at least one recurring task").max(10),
  maturity: z.enum(MATURITY.map((m) => m.id) as [string, ...string[]]),
  systems: z.array(z.string().max(40)).max(12),
  priority: z.enum(PRIORITIES.map((p) => p.id) as [string, ...string[]]),
});
export type DiagnosticAnswers = z.infer<typeof diagnosticSchema>;

export type Opportunity = {
  id: string;
  title: string;
  description: string;
  hoursLow: number;
  hoursHigh: number;
  assumedBaseline: boolean;
  effort: string;
  timeToValue: string;
  packageSlug: string | null;
  capabilities: string[];
  functions: string[];
};

export type DiagnosticReport = {
  summary: { hoursLow: number; hoursHigh: number; fteLow: number; fteHigh: number; level: "High" | "Strong" | "Emerging"; headline: string };
  opportunities: Opportunity[];
  roadmap: { phase: string; items: string[] }[];
  maturityAdvice: string;
  assumptions: string[];
};

const DEFAULT_BASELINE: Record<string, number> = { "1–10": 2, "11–50": 4, "51–200": 8, "201–1,000": 14, "1,000+": 24 };
const EFFORT_COST: Record<string, number> = { Low: 1, Medium: 1.5, High: 2 };
const PRIORITY_BOOST: Record<string, string[]> = {
  time: ["copy_data", "write_reports", "meeting_notes", "scheduling"],
  revenue: ["lead_research", "first_drafts"],
  cx: ["repetitive_questions", "scheduling"],
  errors: ["review_documents", "invoices", "copy_data"],
  scale: ["repetitive_questions", "screening", "invoices"],
};

/** Deterministic and explainable: every number traces back to an answer plus a stated assumption. */
export function buildReport(a: DiagnosticAnswers): DiagnosticReport {
  const hoursByFn = new Map(a.functionHours.filter((f) => f.hours > 0).map((f) => [f.fn, f.hours]));
  const selected = TASKS.filter((t) => a.tasks.includes(t.id));
  const alloc = new Map<string, number>();
  for (const [fn, hours] of hoursByFn) {
    const claimants = selected.filter((t) => (t.fns as readonly string[]).includes(fn));
    for (const t of claimants) alloc.set(t.id, (alloc.get(t.id) ?? 0) + hours / claimants.length);
  }
  const base = DEFAULT_BASELINE[a.size] ?? 4;

  const opps = selected.map((t) => {
    const h = alloc.get(t.id);
    const baseline = h ?? base;
    const low = Math.max(1, Math.round(baseline * t.share[0]));
    const high = Math.max(low, Math.round(baseline * t.share[1]));
    const boost = PRIORITY_BOOST[a.priority]?.includes(t.id) ? 1.3 : 1;
    const score = (((low + high) / 2) * boost) / EFFORT_COST[t.effort];
    return {
      score,
      opp: { id: t.id, title: t.title, description: t.desc, hoursLow: low, hoursHigh: high, assumedBaseline: h == null, effort: t.effort, timeToValue: t.ttv, packageSlug: t.pkg, capabilities: [...t.caps], functions: t.fns.filter((f) => hoursByFn.has(f)).slice(0, 2) as string[] },
    };
  });
  opps.sort((x, y) => y.score - x.score);
  const opportunities = opps.map((o) => o.opp);
  const hoursLow = opportunities.reduce((s, o) => s + o.hoursLow, 0);
  const hoursHigh = opportunities.reduce((s, o) => s + o.hoursHigh, 0);
  const level = hoursHigh >= 40 ? "High" : hoursHigh >= 15 ? "Strong" : "Emerging";
  const top = opportunities[0];

  const maturityAdvice = {
    none: "Start with one contained, high-volume workflow and a short team training. Early wins build the trust and habits that larger projects need.",
    experimenting: "Individual experimentation is a good signal. Capture what works into shared workflows and a usage policy, then automate the most repeated one.",
    rolled_out: "With tools in place, the next gains come from connecting AI to your systems of record, not from more licenses.",
    production: "You're ready for multi-step agents with approval gates and proper evaluation. Prioritize observability and measurement.",
  }[a.maturity] ?? "";

  const roadmap = [
    { phase: "First 30 days", items: [top ? `Ship: ${top.title.toLowerCase()}` : "Map one high-volume workflow", "Measure the baseline before changing anything", a.maturity === "none" || a.maturity === "experimenting" ? "Run a hands-on AI session for the pilot team" : "Agree success metrics with the pilot team"] },
    { phase: "Days 31–60", items: [opportunities[1] ? `Ship: ${opportunities[1].title.toLowerCase()}` : "Expand the first automation to a second team", "Review accuracy and time saved against the baseline", "Draft an acceptable-use policy"] },
    { phase: "Days 61–90", items: [opportunities[2] ? `Ship: ${opportunities[2].title.toLowerCase()}` : "Identify the next workflow from team feedback", "Document impact and decide what to scale", "Plan the next quarter's AI roadmap"] },
  ];

  return {
    summary: {
      hoursLow,
      hoursHigh,
      fteLow: Math.round((hoursLow / 40) * 10) / 10,
      fteHigh: Math.round((hoursHigh / 40) * 10) / 10,
      level,
      headline: top ? `Your fastest win is likely ${top.title.toLowerCase()}.` : "Start by mapping your highest-volume workflow.",
    },
    opportunities,
    roadmap,
    maturityAdvice,
    assumptions: [
      "Estimates are directional, not guarantees. Actual results depend on data quality, process variability, and adoption.",
      `Recoverable time applies a per-task automation range (typically 30–80%) to the weekly hours you reported${hoursByFn.size ? "" : ", or to a size-based baseline when hours weren't provided"}.`,
      opportunities.some((o) => o.assumedBaseline) ? `Tasks marked “assumed baseline” use ${base} hrs/week, a conservative default for a ${a.size} person organization.` : "All estimates are based on hours you provided.",
      "Human review remains in place for anything client-facing, financial, legal, or hiring-related.",
    ],
  };
}

export function functionsLabel(fns: string[]) {
  return fns.map(functionName).join(", ");
}
