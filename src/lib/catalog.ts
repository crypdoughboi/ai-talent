import type { PackageMilestone } from "./db/schema";

export type PackageSeed = {
  slug: string;
  title: string;
  tagline: string;
  function: string;
  specializations: string[];
  scope: string;
  deliverables: string[];
  inputs: string[];
  milestones: PackageMilestone[];
  timelineMinWeeks: number;
  timelineMaxWeeks: number;
  startingPriceCents: number;
  outcome: string;
};

export const PACKAGE_SEEDS: PackageSeed[] = [
  {
    slug: "ai-workflow-audit",
    title: "AI Workflow Audit",
    tagline: "Find the five workflows where AI pays back fastest.",
    function: "leadership",
    specializations: ["ai-strategy", "workflow-automation"],
    scope: "An operator interviews your team leads, maps recurring work across two to four functions, and ranks automation opportunities by hours recoverable, risk, and effort. You leave with a sequenced roadmap and one working prototype.",
    deliverables: ["Workflow map for up to 4 teams", "Ranked opportunity backlog with impact estimates", "Risk and data-access review", "One working prototype of the top opportunity", "90-day implementation roadmap"],
    inputs: ["30-minute interviews with 3 to 6 team leads", "Read access to the tools those teams use", "A named internal owner"],
    milestones: [
      { title: "Interviews & workflow mapping", description: "Team interviews, process maps, and baseline hour estimates.", share: 0.4 },
      { title: "Opportunity ranking & roadmap", description: "Scored backlog, risk review, and roadmap.", share: 0.35 },
      { title: "Prototype & readout", description: "Working prototype of the top opportunity and leadership readout.", share: 0.25 },
    ],
    timelineMinWeeks: 1,
    timelineMaxWeeks: 2,
    startingPriceCents: 250000,
    outcome: "A prioritized, evidence-backed plan instead of scattered experiments.",
  },
  {
    slug: "automate-customer-support",
    title: "Automate Your Customer Support",
    tagline: "AI triage and grounded draft replies inside your helpdesk.",
    function: "support",
    specializations: ["support-ai", "knowledge", "agents"],
    scope: "Classify and route every ticket, draft replies grounded in your help center with citations, and deflect repetitive questions, with agents approving every customer-facing answer during the pilot.",
    deliverables: ["Ticket taxonomy and routing rules", "Draft-reply assistant inside Zendesk, Intercom, or Front", "Grounded answers from your docs with citations", "Pilot dashboard: response time, deflection, edits", "Runbook and team training"],
    inputs: ["Helpdesk admin access", "Export of 3 months of tickets", "Help-center and macro content"],
    milestones: [
      { title: "Ticket analysis & taxonomy", description: "Baseline metrics, intent taxonomy, and routing design.", share: 0.3 },
      { title: "Drafting & routing build", description: "Integration, grounded drafting, and routing automations.", share: 0.45 },
      { title: "Pilot & handoff", description: "Two-week pilot, measurement against baseline, and training.", share: 0.25 },
    ],
    timelineMinWeeks: 3,
    timelineMaxWeeks: 5,
    startingPriceCents: 650000,
    outcome: "Faster first responses and agents freed from repetitive tickets.",
  },
  {
    slug: "build-an-internal-ai-knowledge-base",
    title: "Build an Internal AI Knowledge Base",
    tagline: "Ask a question in Slack, get a cited answer from your own docs.",
    function: "operations",
    specializations: ["knowledge", "llm-engineering", "integrations"],
    scope: "Connect your documentation sources, preserve access permissions, and ship a Slack or Teams assistant that answers with citations. Includes an evaluation set so you know when answers can be trusted.",
    deliverables: ["Connectors for up to 3 sources (Drive, Notion, Confluence, SharePoint)", "Permission-aware retrieval", "Slack or Teams assistant with feedback buttons", "Evaluation set of 50+ real questions with accuracy report", "Admin guide for adding sources"],
    inputs: ["Admin access to doc sources", "A list of 50 questions people actually ask", "Security requirements"],
    milestones: [
      { title: "Sources, permissions & eval set", description: "Connect sources, map permissions, collect real questions.", share: 0.3 },
      { title: "Retrieval & assistant build", description: "Indexing, retrieval, and Slack/Teams interface.", share: 0.45 },
      { title: "Evaluation & launch", description: "Accuracy report, fixes, and rollout.", share: 0.25 },
    ],
    timelineMinWeeks: 3,
    timelineMaxWeeks: 5,
    startingPriceCents: 750000,
    outcome: "Fewer interruptions and faster ramp for new hires.",
  },
  {
    slug: "implement-ai-across-your-sales-team",
    title: "Implement AI Across Your Sales Team",
    tagline: "Research, drafting, and CRM updates on autopilot.",
    function: "sales",
    specializations: ["sales-ai", "integrations", "training"],
    scope: "Deploy account research and enrichment, personalized first drafts, and automatic CRM updates after calls for a pilot team, then train reps on the new workflow.",
    deliverables: ["Enrichment and research pipeline", "Personalized outreach drafting with rep review", "Post-call CRM autopilot", "Rep playbook and training session", "Adoption and pipeline dashboard"],
    inputs: ["CRM admin access", "ICP definition", "Call recorder access (optional)"],
    milestones: [
      { title: "Workflow design & data audit", description: "CRM audit, ICP scoring rules, pilot selection.", share: 0.3 },
      { title: "Automations build", description: "Enrichment, drafting, and CRM automation.", share: 0.45 },
      { title: "Rep enablement", description: "Training, playbook, and adoption tracking.", share: 0.25 },
    ],
    timelineMinWeeks: 3,
    timelineMaxWeeks: 4,
    startingPriceCents: 600000,
    outcome: "More selling time per rep and a CRM people trust.",
  },
  {
    slug: "automate-contract-review",
    title: "Automate Contract Review",
    tagline: "First-pass review against your playbook, in minutes.",
    function: "legal",
    specializations: ["document-ai", "llm-engineering", "workflow-automation"],
    scope: "Encode your negotiation playbook, then flag deviations, missing clauses, and risk levels with citations, and draft redlines for lawyer approval. Accuracy is measured on your own past agreements before go-live.",
    deliverables: ["Review playbook encoded as testable rules", "Clause extraction and deviation flags with citations", "Suggested redlines as tracked changes", "Accuracy report on 30+ past agreements", "Reviewer workflow and training"],
    inputs: ["Your negotiation playbook or past redlines", "30 to 50 representative agreements", "Approval from a supervising attorney"],
    milestones: [
      { title: "Playbook & gold set", description: "Capture rules and assemble test agreements.", share: 0.3 },
      { title: "Review engine", description: "Extraction, flagging, and redline drafting.", share: 0.45 },
      { title: "Validation & rollout", description: "Accuracy report, reviewer workflow, training.", share: 0.25 },
    ],
    timelineMinWeeks: 3,
    timelineMaxWeeks: 5,
    startingPriceCents: 850000,
    outcome: "Lawyers spend their time on judgment, not first reads.",
  },
  {
    slug: "automate-invoice-processing",
    title: "Automate Invoice Processing",
    tagline: "From inbox to approved bill without retyping.",
    function: "finance",
    specializations: ["document-ai", "workflow-automation", "integrations"],
    scope: "Extract invoices from email and uploads, match to POs, route approvals, and post to QuickBooks, Xero, or NetSuite. Only low-confidence fields go to a human.",
    deliverables: ["Inbox and upload ingestion", "Line-item extraction with confidence scores", "PO matching and approval routing", "Accounting system sync with audit trail", "Exception queue and runbook"],
    inputs: ["Accounting system access", "Sample of 100 recent invoices", "Approval matrix"],
    milestones: [
      { title: "Process & data review", description: "Baseline, approval matrix, sample analysis.", share: 0.3 },
      { title: "Extraction & sync build", description: "Extraction, matching, routing, and posting.", share: 0.45 },
      { title: "Parallel run & handoff", description: "Run alongside manual process, then cut over.", share: 0.25 },
    ],
    timelineMinWeeks: 2,
    timelineMaxWeeks: 4,
    startingPriceCents: 550000,
    outcome: "A faster close with fewer keying errors.",
  },
  {
    slug: "build-a-custom-ai-agent",
    title: "Build a Custom AI Agent",
    tagline: "An agent that works across your tools, with approvals built in.",
    function: "operations",
    specializations: ["agents", "llm-engineering", "integrations"],
    scope: "Design and ship a tool-using agent for one well-defined multi-step process: it reads context, decides, and acts in your systems, with human approval on consequential steps and an eval suite that proves it works.",
    deliverables: ["Process spec and approval policy", "Integrations with up to 4 systems", "Agent with human-in-the-loop approvals", "Scenario-based evaluation suite", "Monitoring, logs, and runbook"],
    inputs: ["API access to the systems involved", "20 real examples of the process", "Named approver for agent actions"],
    milestones: [
      { title: "Process spec & eval scenarios", description: "Define the job, tools, approvals, and test scenarios.", share: 0.25 },
      { title: "Agent & integrations build", description: "Tool integrations, agent loop, approvals.", share: 0.5 },
      { title: "Evaluation & deployment", description: "Eval results, hardening, monitoring, handoff.", share: 0.25 },
    ],
    timelineMinWeeks: 4,
    timelineMaxWeeks: 6,
    startingPriceCents: 950000,
    outcome: "A multi-step process that runs itself, safely.",
  },
  {
    slug: "train-your-team-on-ai",
    title: "Train Your Team on AI",
    tagline: "Hands-on workshops built around your team's real work.",
    function: "leadership",
    specializations: ["training", "ai-strategy"],
    scope: "Role-specific workshops using your team's actual tasks, a shared library of proven workflows, and a practical acceptable-use policy, followed by office hours to make habits stick.",
    deliverables: ["Pre-training survey and baseline", "Up to 4 role-specific workshops", "Shared workflow and prompt library", "Acceptable-use policy draft", "Two weeks of office hours"],
    inputs: ["Team list and roles", "Approved AI tools", "Examples of recurring tasks per team"],
    milestones: [
      { title: "Baseline & curriculum", description: "Survey, task collection, and tailored curriculum.", share: 0.35 },
      { title: "Workshops", description: "Live, hands-on sessions per role.", share: 0.4 },
      { title: "Library, policy & office hours", description: "Workflow library, policy, and follow-up support.", share: 0.25 },
    ],
    timelineMinWeeks: 1,
    timelineMaxWeeks: 3,
    startingPriceCents: 300000,
    outcome: "Consistent, safe, everyday AI use across the team.",
  },
];
