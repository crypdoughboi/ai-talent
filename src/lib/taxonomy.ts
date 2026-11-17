/**
 * Shared marketplace taxonomy. Categories are also stored in the database so admins can
 * rename / deactivate them; these constants are the canonical seed + matching keywords.
 */

export type Option = { slug: string; name: string; description?: string };

export const SPECIALIZATIONS = [
  { slug: "agents", name: "AI agents & assistants", description: "Custom agents that take actions across your tools", keywords: ["agent", "agents", "assistant", "autonomous", "copilot", "bot", "chatbot"] },
  { slug: "workflow-automation", name: "Workflow automation", description: "n8n, Make and Zapier pipelines with LLM steps", keywords: ["workflow", "automate", "automation", "manual", "copy", "paste", "zapier", "n8n", "make.com", "repetitive", "data entry"] },
  { slug: "document-ai", name: "Document AI & extraction", description: "Contracts, invoices, forms, and PDFs into structured data", keywords: ["document", "documents", "contract", "contracts", "pdf", "invoice", "invoices", "forms", "extraction", "ocr", "review", "redline", "clauses"] },
  { slug: "knowledge", name: "Knowledge bases & RAG", description: "Answer engines grounded in your own docs", keywords: ["knowledge", "wiki", "docs", "documentation", "sop", "sops", "search", "policies", "handbook", "rag", "internal questions"] },
  { slug: "integrations", name: "Integrations & internal tools", description: "Glue between CRMs, ERPs, and the tools you already use", keywords: ["integration", "integrate", "internal tool", "api", "crm", "erp", "sync", "dashboard", "retool"] },
  { slug: "support-ai", name: "Customer support automation", description: "Triage, drafting, and deflection for support teams", keywords: ["support", "tickets", "ticket", "helpdesk", "zendesk", "intercom", "customer emails", "customer service", "inbox", "faq"] },
  { slug: "sales-ai", name: "Sales & revenue automation", description: "Prospecting, enrichment, CRM hygiene, and proposals", keywords: ["sales", "leads", "lead", "prospecting", "outreach", "pipeline", "crm", "hubspot", "salesforce", "rfp", "proposals", "follow-up"] },
  { slug: "data-analytics", name: "Data & reporting with AI", description: "Automated reporting, analysis, and forecasting", keywords: ["report", "reports", "reporting", "spreadsheet", "spreadsheets", "excel", "kpi", "analytics", "forecast", "metrics", "data"] },
  { slug: "ai-strategy", name: "AI strategy & audits", description: "Find, prioritize, and sequence the right AI bets", keywords: ["strategy", "roadmap", "audit", "where to start", "opportunities", "assessment", "prioritize"] },
  { slug: "training", name: "Team training & adoption", description: "Workshops, playbooks, and policies that make AI stick", keywords: ["train", "training", "adoption", "workshop", "upskill", "rollout", "policy", "team", "employees", "enablement"] },
  { slug: "llm-engineering", name: "LLM engineering & evals", description: "Production-grade LLM systems, evals, and guardrails", keywords: ["llm", "evals", "fine-tune", "production", "latency", "guardrails", "model", "embedding", "engineering"] },
  { slug: "content-ai", name: "Content & marketing ops", description: "Content pipelines, SEO, and campaign operations", keywords: ["content", "marketing", "blog", "seo", "social", "copy", "newsletter", "campaign", "brand"] },
  { slug: "voice-ai", name: "Voice & phone agents", description: "Inbound and outbound voice agents and call ops", keywords: ["voice", "phone", "calls", "call", "receptionist", "voicemail", "dial"] },
] as const satisfies readonly (Option & { keywords: readonly string[] })[];

export const FUNCTIONS = [
  { slug: "legal", name: "Legal", description: "Contracts, intake, compliance", keywords: ["legal", "law", "lawyer", "attorney", "contract", "contracts", "nda", "compliance", "clauses", "litigation", "paralegal"] },
  { slug: "finance", name: "Finance & accounting", description: "AP/AR, close, reporting", keywords: ["finance", "accounting", "invoice", "invoices", "bookkeeping", "close", "reconciliation", "expenses", "payables", "receivables", "ap", "ar", "quickbooks", "xero"] },
  { slug: "operations", name: "Operations", description: "Processes, scheduling, vendors", keywords: ["operations", "ops", "process", "scheduling", "dispatch", "inventory", "vendor", "procurement", "logistics", "orders"] },
  { slug: "sales", name: "Sales", description: "Pipeline, outreach, CRM", keywords: ["sales", "leads", "pipeline", "prospecting", "crm", "outreach", "deals", "quotes", "rfp"] },
  { slug: "support", name: "Customer support", description: "Tickets, inboxes, success", keywords: ["support", "customer", "tickets", "helpdesk", "inbox", "customer success", "complaints"] },
  { slug: "recruiting", name: "People & recruiting", description: "Sourcing, screening, onboarding", keywords: ["recruiting", "hiring", "candidates", "resumes", "resume", "screening", "interview", "hr", "onboarding employees", "talent"] },
  { slug: "marketing", name: "Marketing", description: "Content, campaigns, SEO", keywords: ["marketing", "content", "seo", "social", "campaign", "newsletter", "brand", "ads"] },
  { slug: "engineering", name: "Product & engineering", description: "Dev velocity, internal tools", keywords: ["engineering", "developers", "code", "product", "qa", "testing", "devops", "internal tools"] },
  { slug: "leadership", name: "Leadership & strategy", description: "AI roadmaps, governance", keywords: ["strategy", "board", "leadership", "roadmap", "governance", "transformation", "ceo"] },
] as const satisfies readonly (Option & { keywords: readonly string[] })[];

export const INDUSTRIES = [
  { slug: "legal-services", name: "Legal services", keywords: ["law firm", "legal", "attorneys", "lawyers"] },
  { slug: "accounting", name: "Accounting & finance", keywords: ["accounting firm", "cpa", "bookkeeping", "wealth", "fund"] },
  { slug: "healthcare", name: "Healthcare", keywords: ["clinic", "healthcare", "medical", "patients", "dental", "practice"] },
  { slug: "real-estate", name: "Real estate", keywords: ["real estate", "property", "brokerage", "listings", "tenants"] },
  { slug: "ecommerce", name: "E-commerce & retail", keywords: ["ecommerce", "e-commerce", "shopify", "store", "retail", "dtc"] },
  { slug: "saas", name: "Software & SaaS", keywords: ["saas", "software", "startup", "app"] },
  { slug: "professional-services", name: "Professional services", keywords: ["consulting", "agency", "firm", "services", "consultancy"] },
  { slug: "logistics", name: "Manufacturing & logistics", keywords: ["manufacturing", "logistics", "warehouse", "freight", "supply chain", "factory"] },
  { slug: "insurance", name: "Insurance", keywords: ["insurance", "claims", "underwriting", "policyholders"] },
  { slug: "education", name: "Education", keywords: ["school", "education", "university", "students", "edtech"] },
  { slug: "nonprofit", name: "Nonprofit", keywords: ["nonprofit", "non-profit", "charity", "foundation", "donors"] },
  { slug: "construction", name: "Construction & trades", keywords: ["construction", "contractor", "trades", "hvac", "plumbing"] },
] as const satisfies readonly (Option & { keywords: readonly string[] })[];

export const TOOLS = [
  "Claude", "ChatGPT", "Anthropic API", "OpenAI API", "Gemini", "Cursor", "Claude Code", "n8n", "Make", "Zapier",
  "LangChain", "LlamaIndex", "Retool", "Airtable", "Notion", "HubSpot", "Salesforce", "Zendesk", "Intercom",
  "Slack", "Google Workspace", "Microsoft 365", "Copilot", "Python", "TypeScript", "Supabase", "Postgres",
  "Pinecone", "Vapi", "Clay", "DocuSign", "QuickBooks", "Xero", "Clio", "Greenhouse", "Shopify",
] as const;

export const EXPERIENCE_LEVELS = [
  { slug: "emerging", name: "Emerging", description: "Self-taught builder with shipped work" },
  { slug: "proven", name: "Proven", description: "Multiple production deployments" },
  { slug: "expert", name: "Expert", description: "Leads complex, multi-system builds" },
] as const;

export const AVAILABILITY = [
  { slug: "available", name: "Available now" },
  { slug: "limited", name: "Limited capacity" },
  { slug: "booked", name: "Booked" },
] as const;

export const COMPANY_SIZES = ["1–10", "11–50", "51–200", "201–1,000", "1,000+"] as const;

export const VERIFICATION_KINDS = [
  { slug: "deployment", name: "Production deployment", hint: "A live system you built. Link to a demo, repo, or write-up a reviewer can inspect." },
  { slug: "skill", name: "Technical skill", hint: "A certification, open-source contribution, or code sample demonstrating a skill." },
  { slug: "reference", name: "Client reference", hint: "A past client who can confirm the work and its results. Include contact details in the notes." },
  { slug: "identity", name: "Identity & professional presence", hint: "LinkedIn, GitHub, or personal site that confirms who you are." },
] as const;

const byslug = <T extends Option>(list: readonly T[]) => Object.fromEntries(list.map((o) => [o.slug, o])) as Record<string, T>;
export const SPEC_BY_SLUG = byslug(SPECIALIZATIONS);
export const FUNCTION_BY_SLUG = byslug(FUNCTIONS);
export const INDUSTRY_BY_SLUG = byslug(INDUSTRIES);

export function specName(slug: string) {
  return SPEC_BY_SLUG[slug]?.name ?? slug;
}
export function functionName(slug: string) {
  return FUNCTION_BY_SLUG[slug]?.name ?? slug;
}
export function industryName(slug: string | null | undefined) {
  if (!slug) return "";
  return INDUSTRY_BY_SLUG[slug]?.name ?? slug;
}

export const SPEC_SLUGS = SPECIALIZATIONS.map((s) => s.slug) as [string, ...string[]];
export const FUNCTION_SLUGS = FUNCTIONS.map((s) => s.slug) as [string, ...string[]];
export const INDUSTRY_SLUGS = INDUSTRIES.map((s) => s.slug) as [string, ...string[]];
