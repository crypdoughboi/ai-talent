import type { BriefApproach } from "./db/schema";

/**
 * Implementation playbooks: the deterministic knowledge the rules engine uses to turn a
 * plain-English problem into a structured implementation brief. Budgets are indicative
 * ranges for a ~10–50 person company and get scaled by detected company size.
 */
export type Playbook = {
  id: string;
  label: string;
  triggers: string[];
  functions: string[];
  capabilities: string[];
  problem: string;
  approaches: BriefApproach[];
  build: { title: string; description: string; weeks: number }[];
  budget: [number, number]; // USD
  automationShare: [number, number]; // share of manual hours plausibly recovered
  packageSlug?: string;
  questions: string[];
};

export const PLAYBOOKS: Playbook[] = [
  {
    id: "contract-review",
    label: "Contract review",
    triggers: ["contract", "contracts", "nda", "ndas", "msa", "redline", "clause", "clauses", "document review", "agreements", "legal review"],
    functions: ["legal"],
    capabilities: ["document-ai", "llm-engineering", "workflow-automation"],
    problem: "Skilled reviewers spend hours on first-pass reading of routine agreements, which delays deals and keeps senior people on low-leverage work.",
    approaches: [
      { title: "Playbook-driven first-pass review", description: "Encode your negotiation playbook as review rules; an LLM flags deviations, missing clauses and risk levels clause by clause for a human to confirm.", tools: ["Claude", "Anthropic API", "Python"] },
      { title: "Redline drafting in Word", description: "Generate suggested redlines and fallback language from approved precedents, returned as tracked changes your team accepts or rejects.", tools: ["Microsoft 365", "Claude"] },
      { title: "Intake-to-repository pipeline", description: "Auto-extract parties, dates, renewal terms and obligations into your contract repository with a reviewer queue for low-confidence fields.", tools: ["n8n", "Airtable", "DocuSign"] },
    ],
    build: [
      { title: "Playbook capture & gold set", description: "Document review rules with your lawyers and assemble 30–50 past agreements with known outcomes to measure accuracy.", weeks: 1 },
      { title: "Review engine build", description: "Clause extraction, deviation flagging, and risk scoring with citations back to the source text.", weeks: 2 },
    ],
    budget: [8000, 22000],
    automationShare: [0.4, 0.65],
    packageSlug: "automate-contract-review",
    questions: ["Which contract types make up most of the volume?", "Where do agreements live today (email, a DMS, Clio, SharePoint)?", "Who must sign off on the AI's output before it reaches a client?"],
  },
  {
    id: "client-intake",
    label: "Client intake",
    triggers: ["intake", "new client", "new clients", "onboarding clients", "client onboarding", "conflict check", "inquiries", "web inquiries", "qualify"],
    functions: ["legal", "operations", "sales"],
    capabilities: ["workflow-automation", "agents", "integrations"],
    problem: "Inbound inquiries are handled manually, so qualified clients wait, details get re-keyed across systems, and staff time goes to screening instead of serving.",
    approaches: [
      { title: "Conversational intake assistant", description: "A guided intake flow that collects the right facts per matter type, summarizes them, and routes to the right person.", tools: ["Claude", "Typeform", "Slack"] },
      { title: "Automated triage & CRM sync", description: "Classify inquiries, run conflict and fit checks, and create records in your practice-management or CRM system automatically.", tools: ["n8n", "Clio", "HubSpot"] },
    ],
    build: [{ title: "Intake flow & routing", description: "Build intake per matter/service type, triage logic, and system-of-record sync with human approval on edge cases.", weeks: 2 }],
    budget: [5000, 14000],
    automationShare: [0.35, 0.6],
    packageSlug: "build-a-custom-ai-agent",
    questions: ["How many inquiries arrive per week, and through which channels?", "What disqualifies a prospective client today?"],
  },
  {
    id: "invoice-processing",
    label: "Invoice & AP processing",
    triggers: ["invoice", "invoices", "accounts payable", "payables", "receipts", "expense", "expenses", "bills", "purchase orders", "reconciliation", "reconcile"],
    functions: ["finance"],
    capabilities: ["document-ai", "workflow-automation", "integrations"],
    problem: "Invoices and receipts are keyed in by hand, creating errors, late payments, and a month-end crunch.",
    approaches: [
      { title: "Extraction with confidence routing", description: "Parse invoices from email and uploads into structured line items; only low-confidence fields go to a human queue.", tools: ["Claude", "n8n"] },
      { title: "Three-way match & accounting sync", description: "Match invoices to POs and receipts, then post approved bills into your accounting system with a full audit trail.", tools: ["QuickBooks", "Xero", "Make"] },
    ],
    build: [{ title: "Extraction, matching & posting", description: "Inbox ingestion, field extraction, PO matching, approval flow, and accounting sync.", weeks: 2 }],
    budget: [6000, 16000],
    automationShare: [0.5, 0.75],
    packageSlug: "automate-invoice-processing",
    questions: ["Roughly how many invoices per month?", "Which accounting system and approval rules do you use?"],
  },
  {
    id: "support-automation",
    label: "Support automation",
    triggers: ["support", "tickets", "ticket", "helpdesk", "zendesk", "intercom", "customer emails", "customer questions", "customer service", "inbox", "faq", "faqs", "chat"],
    functions: ["support"],
    capabilities: ["support-ai", "knowledge", "agents"],
    problem: "Agents answer the same questions repeatedly and response times slip as volume grows.",
    approaches: [
      { title: "AI triage & draft replies", description: "Classify, prioritize and route every ticket, and draft grounded replies agents approve with one click.", tools: ["Zendesk", "Intercom", "Claude"] },
      { title: "Grounded self-serve answers", description: "A help-center assistant that answers from your docs with citations and hands off to humans gracefully.", tools: ["Claude", "Pinecone"] },
    ],
    build: [{ title: "Triage, drafting & deflection", description: "Ticket taxonomy, routing, reply drafting with citations, and a measured deflection pilot.", weeks: 3 }],
    budget: [7000, 20000],
    automationShare: [0.3, 0.55],
    packageSlug: "automate-customer-support",
    questions: ["What is your weekly ticket volume and current first-response time?", "Which helpdesk do you use?"],
  },
  {
    id: "knowledge-base",
    label: "Internal knowledge assistant",
    triggers: ["knowledge", "wiki", "documentation", "sop", "sops", "policies", "handbook", "find information", "internal questions", "tribal knowledge", "onboarding new", "search our"],
    functions: ["operations", "leadership"],
    capabilities: ["knowledge", "llm-engineering", "integrations"],
    problem: "Answers live in scattered docs and people's heads, so teams interrupt each other and new hires ramp slowly.",
    approaches: [
      { title: "Permission-aware knowledge assistant", description: "Index Drive/Notion/Confluence with access controls preserved; answers include citations to source docs.", tools: ["Claude", "Notion", "Google Workspace", "Slack"] },
      { title: "Answer quality evals", description: "A test set of real questions with measured accuracy, so you know when the assistant can be trusted.", tools: ["Python", "Anthropic API"] },
    ],
    build: [{ title: "Indexing, retrieval & Slack app", description: "Connectors, chunking, retrieval with permissions, and a Slack/Teams interface with feedback capture.", weeks: 3 }],
    budget: [8000, 24000],
    automationShare: [0.2, 0.4],
    packageSlug: "build-an-internal-ai-knowledge-base",
    questions: ["Where does your documentation live today?", "Are there sensitive documents that must stay restricted?"],
  },
  {
    id: "sales-automation",
    label: "Sales automation",
    triggers: ["sales", "leads", "lead", "prospecting", "prospects", "outreach", "pipeline", "crm", "hubspot", "salesforce", "follow-up", "follow up", "rfp", "rfps", "proposals", "quotes"],
    functions: ["sales"],
    capabilities: ["sales-ai", "integrations", "workflow-automation"],
    problem: "Reps spend more time researching, logging and writing than selling, and follow-ups fall through the cracks.",
    approaches: [
      { title: "Research & enrichment pipeline", description: "Auto-research accounts and contacts, score fit, and prepare personalized first drafts for rep review.", tools: ["Clay", "Claude", "HubSpot"] },
      { title: "CRM autopilot", description: "Summarize calls, update deal fields, and generate next steps automatically after every meeting.", tools: ["Salesforce", "HubSpot", "Zapier"] },
      { title: "RFP & proposal drafting", description: "Draft responses from an approved answer library with citations for every claim.", tools: ["Claude", "Notion"] },
    ],
    build: [{ title: "Sales workflows build", description: "Enrichment, drafting, and CRM automations deployed for a pilot team with adoption tracking.", weeks: 3 }],
    budget: [6000, 18000],
    automationShare: [0.3, 0.5],
    packageSlug: "implement-ai-across-your-sales-team",
    questions: ["Which CRM do you use, and how clean is the data?", "How many reps are in the pilot group?"],
  },
  {
    id: "recruiting",
    label: "Recruiting operations",
    triggers: ["recruiting", "hiring", "candidates", "candidate", "resumes", "resume", "cv", "screening", "interview", "interviews", "job descriptions", "applicants"],
    functions: ["recruiting"],
    capabilities: ["workflow-automation", "document-ai", "integrations"],
    problem: "Recruiters lose days to resume screening, scheduling, and status emails instead of talking to great candidates.",
    approaches: [
      { title: "Structured screening assist", description: "Score applicants against an explicit rubric with written rationale; humans make every decision.", tools: ["Claude", "Greenhouse"] },
      { title: "Scheduling & candidate comms", description: "Automate interview scheduling, reminders and status updates from your ATS.", tools: ["Zapier", "Google Workspace"] },
    ],
    build: [{ title: "Screening rubric & ATS automations", description: "Rubric design with bias review, ATS integration, and comms automations.", weeks: 2 }],
    budget: [5000, 14000],
    automationShare: [0.35, 0.6],
    questions: ["Which ATS do you use?", "How many applicants per role on average?"],
  },
  {
    id: "reporting",
    label: "Reporting & analytics",
    triggers: ["report", "reports", "reporting", "spreadsheet", "spreadsheets", "excel", "kpi", "kpis", "dashboard", "dashboards", "weekly update", "data entry", "metrics", "forecast"],
    functions: ["finance", "operations", "leadership"],
    capabilities: ["data-analytics", "integrations", "workflow-automation"],
    problem: "Recurring reports are assembled by hand from several systems, so they arrive late and nobody fully trusts the numbers.",
    approaches: [
      { title: "Automated data pipeline", description: "Pull source data on a schedule into one clean model with validation checks.", tools: ["Postgres", "n8n", "Python"] },
      { title: "AI-written narrative reports", description: "Generate the weekly report with commentary on what changed and why, reviewed before it is sent.", tools: ["Claude", "Google Workspace"] },
    ],
    build: [{ title: "Pipelines & report automation", description: "Source connectors, metric definitions, automated narrative, and delivery to Slack/email.", weeks: 2 }],
    budget: [5000, 15000],
    automationShare: [0.5, 0.8],
    questions: ["Which systems feed the report today?", "Who receives it, and how often?"],
  },
  {
    id: "content-marketing",
    label: "Content operations",
    triggers: ["content", "blog", "seo", "social", "newsletter", "marketing copy", "posts", "campaign", "campaigns", "case studies"],
    functions: ["marketing"],
    capabilities: ["content-ai", "workflow-automation"],
    problem: "Content production is slow and inconsistent, and subject-matter experts are a bottleneck.",
    approaches: [
      { title: "Brand-voice content pipeline", description: "Turn expert interviews and notes into drafts in your voice, with editorial review gates.", tools: ["Claude", "Notion"] },
      { title: "Repurposing engine", description: "One source asset becomes posts, emails, and snippets scheduled automatically.", tools: ["Make", "Zapier"] },
    ],
    build: [{ title: "Content pipeline build", description: "Voice guide, templates, review workflow and scheduling integrations.", weeks: 2 }],
    budget: [4000, 12000],
    automationShare: [0.3, 0.5],
    questions: ["What content formats matter most?", "Who approves content before it ships?"],
  },
  {
    id: "meeting-ops",
    label: "Meeting & follow-up automation",
    triggers: ["meeting notes", "meetings", "call notes", "follow-ups", "action items", "minutes", "calls"],
    functions: ["operations", "sales"],
    capabilities: ["workflow-automation", "integrations", "agents"],
    problem: "Decisions and action items from meetings are lost or re-typed into other systems by hand.",
    approaches: [{ title: "Meeting-to-system automation", description: "Transcripts become summaries, tasks, and CRM/PM updates automatically, with owners and due dates.", tools: ["Claude", "Slack", "Notion", "HubSpot"] }],
    build: [{ title: "Meeting automation", description: "Transcript capture, summarization templates, and task/CRM sync.", weeks: 1 }],
    budget: [3000, 8000],
    automationShare: [0.4, 0.7],
    questions: ["Which meeting tools and task systems do you use?"],
  },
  {
    id: "voice-agent",
    label: "Voice & phone automation",
    triggers: ["phone", "calls", "receptionist", "voicemail", "call center", "inbound calls", "appointments", "booking"],
    functions: ["support", "operations"],
    capabilities: ["voice-ai", "agents", "integrations"],
    problem: "Calls go unanswered or tie up staff with routine bookings and questions.",
    approaches: [{ title: "AI receptionist", description: "A voice agent that answers, books, and routes calls, with transcripts and handoff to staff.", tools: ["Vapi", "Claude"] }],
    build: [{ title: "Voice agent build", description: "Call flows, calendar/CRM integration, and escalation rules, piloted on overflow calls first.", weeks: 2 }],
    budget: [6000, 16000],
    automationShare: [0.3, 0.6],
    questions: ["How many calls per day, and what share are routine?"],
  },
  {
    id: "training-adoption",
    label: "AI adoption & training",
    triggers: ["train", "training", "adoption", "workshop", "upskill", "rollout", "policy", "employees", "team use", "use chatgpt", "use claude", "ai policy"],
    functions: ["leadership"],
    capabilities: ["training", "ai-strategy"],
    problem: "Teams have AI tools but no shared practices, so usage is uneven, risky, or abandoned.",
    approaches: [
      { title: "Role-based workshops", description: "Hands-on sessions built around each team's real tasks, not generic prompting tips.", tools: ["Claude", "ChatGPT", "Copilot"] },
      { title: "Prompt library & usage policy", description: "A shared library of proven workflows plus a clear, practical acceptable-use policy.", tools: ["Notion", "Google Workspace"] },
    ],
    build: [{ title: "Workshops & playbooks", description: "Team-by-team sessions, a workflow library, office hours, and an adoption baseline.", weeks: 2 }],
    budget: [3500, 12000],
    automationShare: [0.1, 0.25],
    packageSlug: "train-your-team-on-ai",
    questions: ["How many people and which teams should be trained?", "Which AI tools are approved today?"],
  },
  {
    id: "custom-agent",
    label: "Custom AI agent",
    triggers: ["agent", "agents", "assistant", "copilot", "chatbot", "autonomous", "bot"],
    functions: ["operations"],
    capabilities: ["agents", "llm-engineering", "integrations"],
    problem: "A multi-step process requires judgment across several tools, so it hasn't been automated with simple rules.",
    approaches: [
      { title: "Tool-using agent with approvals", description: "An agent that reads, decides and acts across your systems, with human approval on consequential actions.", tools: ["Claude", "Anthropic API", "TypeScript"] },
      { title: "Evals & guardrails", description: "Scenario tests, logging and limits so the agent's behavior is measurable and safe.", tools: ["Python"] },
    ],
    build: [{ title: "Agent build & evaluation", description: "Tool integrations, agent loop, approval gates, and a scenario-based eval suite.", weeks: 3 }],
    budget: [10000, 30000],
    automationShare: [0.3, 0.6],
    packageSlug: "build-a-custom-ai-agent",
    questions: ["Which systems does the agent need to read from and act in?", "Which actions require human approval?"],
  },
];

export const AUDIT_PLAYBOOK: Playbook = {
  id: "ai-audit",
  label: "AI workflow audit",
  triggers: [],
  functions: ["leadership"],
  capabilities: ["ai-strategy", "workflow-automation"],
  problem: "It isn't yet clear which workflows would benefit most from AI, so the first step is to map and prioritize them.",
  approaches: [
    { title: "Workflow mapping & ROI ranking", description: "Interview teams, map recurring work, and rank opportunities by hours recoverable, risk, and effort.", tools: ["Claude", "Notion"] },
    { title: "Quick-win prototype", description: "Build one working prototype for the top opportunity so the roadmap is grounded in evidence.", tools: ["n8n", "Claude"] },
  ],
  build: [{ title: "Opportunity map & prototype", description: "Ranked opportunity backlog with estimated impact, plus one working prototype.", weeks: 2 }],
  budget: [3000, 9000],
  automationShare: [0.15, 0.3],
  packageSlug: "ai-workflow-audit",
  questions: ["Which team feels the most manual pain today?", "What would a successful first 90 days look like?"],
};
