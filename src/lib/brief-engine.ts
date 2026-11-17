import { z } from "zod";
import { AUDIT_PLAYBOOK, PLAYBOOKS, type Playbook } from "./playbooks";
import { FUNCTIONS, INDUSTRIES, SPEC_SLUGS, FUNCTION_SLUGS, INDUSTRY_SLUGS, TOOLS } from "./taxonomy";
import type { BriefApproach, BriefMilestone } from "./db/schema";
import { clamp } from "./utils";

export type GeneratedBrief = {
  title: string;
  problemStatement: string;
  businessProblem: string;
  functions: string[];
  industry: string | null;
  capabilities: string[];
  tools: string[];
  approaches: BriefApproach[];
  milestones: BriefMilestone[];
  assumptions: string[];
  questions: string[];
  budgetMinCents: number;
  budgetMaxCents: number;
  timelineWeeks: number;
  hoursSavedLow: number | null;
  hoursSavedHigh: number | null;
  packageSlug: string | null;
  generatedBy: "ai" | "rules";
  signals: Signals;
};

type Signals = { hoursPerWeek: number | null; teamSize: number | null; volume: string | null };

/** Validates both AI output and user edits. */
export const briefSchema = z.object({
  title: z.string().trim().min(4).max(120),
  problemStatement: z.string().trim().min(10).max(2000),
  businessProblem: z.string().trim().min(10).max(2000),
  functions: z.array(z.enum(FUNCTION_SLUGS)).max(4),
  industry: z.enum(INDUSTRY_SLUGS).nullable(),
  capabilities: z.array(z.enum(SPEC_SLUGS)).min(1).max(5),
  tools: z.array(z.string().max(40)).max(12),
  approaches: z.array(z.object({ title: z.string().min(2).max(120), description: z.string().min(2).max(600), tools: z.array(z.string().max(40)).max(6) })).min(1).max(4),
  milestones: z.array(z.object({ title: z.string().min(2).max(120), description: z.string().max(600), weeks: z.number().int().min(1).max(12) })).min(1).max(8),
  assumptions: z.array(z.string().max(300)).max(6),
  budgetMinCents: z.number().int().min(50000).max(100000000),
  budgetMaxCents: z.number().int().min(50000).max(100000000),
  timelineWeeks: z.number().int().min(1).max(52),
  hoursSavedLow: z.number().int().min(0).max(2000).nullable(),
  hoursSavedHigh: z.number().int().min(0).max(2000).nullable(),
});

const WORD_NUMBERS: Record<string, number> = { a: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, hundred: 100 };

function parseNum(raw: string) {
  const cleaned = raw.replace(/,/g, "").toLowerCase();
  if (WORD_NUMBERS[cleaned] != null) return WORD_NUMBERS[cleaned];
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function extractSignals(text: string): Signals {
  const t = text.toLowerCase();
  let hoursPerWeek: number | null = null;
  const hw = t.match(/(\d[\d,.]*|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|twelve|fifteen|twenty|thirty|forty|fifty)\b)\s*(?:\+\s*)?(?:hours?|hrs?|h)\b[^.]{0,40}?(?:per|a|each|every|\/)\s*(week|wk|day|month)/);
  if (hw) {
    const n = parseNum(hw[1]);
    if (n != null) hoursPerWeek = hw[2] === "day" ? n * 5 : hw[2] === "month" ? Math.round(n / 4.3) : n;
  }
  let teamSize: number | null = null;
  const ts = t.match(/(\d[\d,]*)\s*(?:-|\s)?\s*(?:person|people|employee|employees|staff|lawyers|attorneys|agents|reps|seat)/);
  if (ts) teamSize = parseNum(ts[1]);
  let volume: string | null = null;
  const vol = t.match(/(\d[\d,]*)\s+([a-z]+(?:\s[a-z]+)?)\s+(?:a|per|each|every)\s+(day|week|month)/);
  if (vol && !/hour|hr/.test(vol[2])) volume = `${vol[1]} ${vol[2]} per ${vol[3]}`;
  return { hoursPerWeek: hoursPerWeek != null ? clamp(Math.round(hoursPerWeek), 1, 2000) : null, teamSize, volume };
}

function countHits(text: string, keywords: readonly string[]) {
  let hits = 0;
  for (const k of keywords) {
    const re = new RegExp(`(^|[^a-z])${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "i");
    if (re.test(text)) hits += k.includes(" ") ? 2 : 1;
  }
  return hits;
}

export function detectPlaybooks(text: string): Playbook[] {
  const scored = PLAYBOOKS.map((p) => ({ p, s: countHits(text, p.triggers) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  if (!scored.length) return [AUDIT_PLAYBOOK];
  const top = scored[0];
  const picks = [top.p];
  const second = scored[1];
  if (second && second.s >= Math.max(1, top.s * 0.5)) picks.push(second.p);
  return picks;
}

function detectIndustry(text: string) {
  let best: { slug: string; s: number } | null = null;
  for (const ind of INDUSTRIES) {
    const s = countHits(text, ind.keywords);
    if (s > 0 && (!best || s > best.s)) best = { slug: ind.slug, s };
  }
  return best?.slug ?? null;
}

function detectFunctions(text: string, playbooks: Playbook[]) {
  const scores = new Map<string, number>();
  for (const f of FUNCTIONS) {
    const s = countHits(text, f.keywords);
    if (s) scores.set(f.slug, s * 2);
  }
  playbooks.forEach((p, i) => p.functions.forEach((f, j) => scores.set(f, (scores.get(f) ?? 0) + (i === 0 ? 3 : 1.5) - j * 0.5)));
  return [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([f]) => f);
}

function detectTools(text: string) {
  return TOOLS.filter((tool) => countHits(text, [tool.toLowerCase()]) > 0);
}

function sizeMultiplier(teamSize: number | null) {
  if (teamSize == null) return 1;
  if (teamSize <= 10) return 0.8;
  if (teamSize <= 50) return 1;
  if (teamSize <= 200) return 1.3;
  if (teamSize <= 1000) return 1.7;
  return 2.2;
}

const roundTo = (n: number, step: number) => Math.max(step, Math.round(n / step) * step);

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Deterministic brief generation. Always available, no external calls. */
export function generateRulesBrief(problemStatement: string): GeneratedBrief {
  const text = problemStatement.toLowerCase();
  const signals = extractSignals(problemStatement);
  const playbooks = detectPlaybooks(text);
  const [primary, secondary] = playbooks;
  const industry = detectIndustry(text);
  const functions = detectFunctions(text, playbooks);
  const mentionedTools = detectTools(text);

  const capabilities = [...new Set(playbooks.flatMap((p) => p.capabilities))].slice(0, 4);
  const approaches = [...primary.approaches.slice(0, 2), ...(secondary ? secondary.approaches.slice(0, 1) : [])];
  const tools = [...new Set([...mentionedTools, ...approaches.flatMap((a) => a.tools)])].slice(0, 8);

  const milestones: BriefMilestone[] = [
    { title: "Discovery & workflow mapping", description: "Shadow the current process, quantify the baseline (hours, volume, error rate), agree success metrics, and confirm data access and security constraints.", weeks: 1 },
    ...playbooks.flatMap((p) => p.build),
    { title: "Pilot & measurement", description: "Run the system alongside the existing process with a pilot group, measure against the baseline, and fix gaps.", weeks: 1 },
    { title: "Handoff & enablement", description: "Documentation, team training, monitoring, and a 30-day support window.", weeks: 1 },
  ];
  const timelineWeeks = milestones.reduce((s, m) => s + m.weeks, 0);

  const mult = sizeMultiplier(signals.teamSize);
  const secondaryShare = secondary ? 0.5 : 0;
  const min = (primary.budget[0] + (secondary?.budget[0] ?? 0) * secondaryShare) * mult;
  const max = (primary.budget[1] + (secondary?.budget[1] ?? 0) * secondaryShare) * mult;

  let hoursSavedLow: number | null = null;
  let hoursSavedHigh: number | null = null;
  if (signals.hoursPerWeek) {
    hoursSavedLow = Math.max(1, Math.round(signals.hoursPerWeek * primary.automationShare[0]));
    hoursSavedHigh = Math.max(hoursSavedLow, Math.round(signals.hoursPerWeek * primary.automationShare[1]));
  }

  const labels = playbooks.map((p) => p.label.toLowerCase());
  const title = playbooks[0] === AUDIT_PLAYBOOK ? "AI workflow audit & first automation" : titleCase(`${labels.join(" + ")} with AI`);

  const contextBits = [
    signals.teamSize ? `a ${signals.teamSize}-person team` : null,
    signals.hoursPerWeek ? `about ${signals.hoursPerWeek} hours of manual work each week` : null,
    signals.volume ? `volume of roughly ${signals.volume}` : null,
  ].filter(Boolean);

  const businessProblem = [
    primary.problem,
    secondary ? secondary.problem : null,
    contextBits.length ? `Stated context: ${contextBits.join(", ")}.` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const assumptions = [
    "Estimates assume an approved operator, existing tool access, and a responsive internal owner.",
    signals.teamSize ? `Budget scaled for a ~${signals.teamSize}-person organization.` : "Company size not stated; budget assumes a 10–50 person organization.",
    hoursSavedLow != null ? `Time savings assume ${Math.round(primary.automationShare[0] * 100)}–${Math.round(primary.automationShare[1] * 100)}% of the stated manual hours can be automated or accelerated, with humans reviewing outputs.` : "No baseline hours stated; measure the baseline during discovery before projecting savings.",
    "No confidential documents are sent to an AI provider without your explicit approval.",
  ];

  return {
    title,
    problemStatement: problemStatement.trim(),
    businessProblem,
    functions,
    industry,
    capabilities,
    tools,
    approaches,
    milestones,
    assumptions,
    questions: [...primary.questions, ...(secondary?.questions.slice(0, 1) ?? [])].slice(0, 4),
    budgetMinCents: roundTo(min, 500) * 100,
    budgetMaxCents: roundTo(Math.max(max, min * 1.4), 500) * 100,
    timelineWeeks,
    hoursSavedLow,
    hoursSavedHigh,
    packageSlug: primary.packageSlug ?? null,
    generatedBy: "rules",
    signals,
  };
}
