import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import * as z from "zod/v4";
import { config } from "./config";
import { FUNCTION_SLUGS, INDUSTRY_SLUGS, SPECIALIZATIONS, SPEC_SLUGS, FUNCTIONS, INDUSTRIES } from "./taxonomy";
import { generateRulesBrief, type GeneratedBrief, extractSignals } from "./brief-engine";
import { PLAYBOOKS } from "./playbooks";
import { clamp } from "./utils";

/**
 * Loose schema for the model's structured output. Structured outputs only support a subset of
 * JSON Schema, so numeric bounds and list lengths are enforced afterwards in normalize().
 */
const AiBrief = z.object({
  title: z.string(),
  business_problem: z.string(),
  functions: z.array(z.enum(FUNCTION_SLUGS)),
  industry: z.enum(INDUSTRY_SLUGS).nullable(),
  capabilities: z.array(z.enum(SPEC_SLUGS)),
  tools: z.array(z.string()),
  approaches: z.array(z.object({ title: z.string(), description: z.string(), tools: z.array(z.string()) })),
  milestones: z.array(z.object({ title: z.string(), description: z.string(), weeks: z.number().int() })),
  assumptions: z.array(z.string()),
  clarifying_questions: z.array(z.string()),
  budget_min_usd: z.number().int(),
  budget_max_usd: z.number().int(),
  hours_saved_per_week_low: z.number().int().nullable(),
  hours_saved_per_week_high: z.number().int().nullable(),
});

const SYSTEM = `You are the scoping engine for Operators, a marketplace that connects companies with vetted AI implementation specialists ("operators").

Turn a company's plain-English description of a business problem into a concise, realistic AI implementation brief.

Rules:
- Be concrete and practical. Prefer proven patterns (document extraction, retrieval over company docs, workflow automation with human review, tool-using agents with approval gates) over hype.
- Always include human review where outputs affect clients, money, legal positions, or hiring decisions.
- Milestones: 3 to 6, starting with discovery/baseline measurement and ending with pilot measurement and handoff. Weeks per milestone are integers from 1 to 6.
- Budget is an indicative USD range for hiring a strong independent specialist (not an agency). Typical first projects cost 3,000 to 40,000 USD. Scale with complexity and company size.
- Hours saved per week: only estimate if the description states a baseline amount of manual time; otherwise return null for both values. Never exceed the stated baseline.
- Capabilities must come from the provided list and describe the skills an operator needs.
- Do not invent facts about the company. Put uncertainties in assumptions and clarifying_questions (2 to 4 questions).
- Plain, confident, non-hyped language. No em dashes.

Capability slugs: ${SPECIALIZATIONS.map((s) => `${s.slug} (${s.name})`).join("; ")}
Function slugs: ${FUNCTIONS.map((f) => f.slug).join(", ")}
Industry slugs: ${INDUSTRIES.map((i) => i.slug).join(", ")}
Reference playbooks: ${PLAYBOOKS.map((p) => `${p.label}: ${p.approaches.map((a) => a.title).join(" / ")} (typical ${p.budget[0]}-${p.budget[1]} USD)`).join("; ")}`;

let _client: Anthropic | null = null;
function client() {
  if (!_client) _client = new Anthropic({ timeout: 45_000, maxRetries: 1 });
  return _client;
}

export type BriefResult = { brief: GeneratedBrief; mode: "ai" | "rules"; notice?: string };

/**
 * Generates a brief with the configured AI provider when available, falling back to the
 * deterministic rules engine on any failure. Only the problem statement the user typed is sent.
 */
export async function generateBrief(problemStatement: string, opts: { allowAi?: boolean } = {}): Promise<BriefResult> {
  const rules = generateRulesBrief(problemStatement);
  if (!config.ai.enabled || opts.allowAi === false) return { brief: rules, mode: "rules" };

  try {
    const response = await client().messages.parse({
      model: config.ai.model,
      max_tokens: 8000,
      output_config: { effort: "low", format: zodOutputFormat(AiBrief) },
      system: SYSTEM,
      messages: [{ role: "user", content: `Company description of the problem:\n\n<problem>\n${problemStatement.slice(0, 3000)}\n</problem>` }],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return { brief: rules, mode: "rules", notice: "The AI provider declined this request, so the rules engine produced this brief." };
    }
    return { brief: normalize(response.parsed_output, problemStatement, rules), mode: "ai" };
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error(`[ai] brief generation failed (${error.status}): ${error.message}`);
    } else {
      console.error("[ai] brief generation failed", error);
    }
    return { brief: rules, mode: "rules", notice: "The AI provider was unavailable, so the rules engine produced this brief." };
  }
}

function normalize(ai: z.infer<typeof AiBrief>, problemStatement: string, rules: GeneratedBrief): GeneratedBrief {
  const signals = extractSignals(problemStatement);
  const min = clamp(Math.round(ai.budget_min_usd / 500) * 500, 1500, 500000);
  const max = clamp(Math.max(Math.round(ai.budget_max_usd / 500) * 500, min + 1000), 2500, 750000);
  const milestones = ai.milestones.slice(0, 6).map((m) => ({ title: m.title.slice(0, 120), description: m.description.slice(0, 600), weeks: clamp(m.weeks, 1, 6) }));
  let low = ai.hours_saved_per_week_low;
  let high = ai.hours_saved_per_week_high;
  if (signals.hoursPerWeek == null) {
    low = null;
    high = null;
  } else if (low != null && high != null) {
    high = clamp(high, 0, signals.hoursPerWeek);
    low = clamp(Math.min(low, high), 0, high);
  }
  const capabilities = [...new Set(ai.capabilities)].slice(0, 5);
  return {
    ...rules,
    title: ai.title.slice(0, 120) || rules.title,
    businessProblem: ai.business_problem.slice(0, 2000) || rules.businessProblem,
    functions: ai.functions.length ? [...new Set(ai.functions)].slice(0, 3) : rules.functions,
    industry: ai.industry ?? rules.industry,
    capabilities: capabilities.length ? capabilities : rules.capabilities,
    tools: [...new Set(ai.tools.map((t) => t.slice(0, 40)))].slice(0, 10),
    approaches: ai.approaches.slice(0, 4).map((a) => ({ title: a.title.slice(0, 120), description: a.description.slice(0, 600), tools: a.tools.slice(0, 6) })),
    milestones: milestones.length ? milestones : rules.milestones,
    assumptions: [...ai.assumptions.slice(0, 4), "No confidential documents are sent to an AI provider without your explicit approval."],
    questions: ai.clarifying_questions.slice(0, 4),
    budgetMinCents: min * 100,
    budgetMaxCents: max * 100,
    timelineWeeks: clamp(milestones.reduce((s, m) => s + m.weeks, 0) || rules.timelineWeeks, 1, 52),
    hoursSavedLow: low,
    hoursSavedHigh: high,
    generatedBy: "ai",
    signals,
  };
}
