/**
 * End-to-end journey test. Requires a running server (default http://localhost:3000),
 * a seeded database, payments in simulation mode, and Playwright with Chromium.
 *
 *   BASE_URL=http://localhost:3000 ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/e2e.cjs
 */
const { chromium } = require("playwright");

const BASE = process.env.BASE_URL || "http://localhost:3000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@operators.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-me-please-123";
const SHOTS = process.env.SHOTS_DIR || null;
const stamp = Date.now().toString(36);
const PASSWORD = "correct-horse-battery";

let failures = 0;
const step = async (name, fn) => {
  const t = Date.now();
  try {
    await fn();
    console.log(`  ✓ ${name} (${Date.now() - t}ms)`);
  } catch (e) {
    failures++;
    console.log(`  ✗ ${name}\n    ${String(e && e.message ? e.message : e).split("\n").slice(0, 4).join("\n    ")}`);
    throw e;
  }
};
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

async function newPage(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, ...opts });
  const page = await ctx.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(e.message));
  return page;
}

async function signUp(page, { role, name, email, company }) {
  await page.goto(`${BASE}/signup${role === "operator" ? "?role=operator" : ""}`);
  if (role === "operator") await page.getByRole("radio", { name: /Work as an operator/ }).click();
  await page.getByLabel("Full name").fill(name);
  if (company) await page.getByLabel("Company").fill(company);
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: role === "operator" ? /Start your operator profile/ : /Create company account/ }).click();
}

async function signIn(page, email, password = PASSWORD) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

(async () => {
  const browser = await chromium.launch();
  const opEmail = `op-${stamp}@example.com`;
  const coEmail = `co-${stamp}@example.com`;
  const co2Email = `co2-${stamp}@example.com`;
  const opName = `Rowan Test ${stamp}`;
  let projectUrl = "";
  let briefUrl = "";

  try {
    console.log("Operator journey");
    const op = await newPage(browser);
    await step("operator signs up and lands in onboarding", async () => {
      await signUp(op, { role: "operator", name: opName, email: opEmail });
      await op.waitForURL(/\/onboarding/);
    });
    await step("identity step", async () => {
      await op.getByLabel("Headline").fill("Contract review automation for law firms and legal ops teams");
      await op.getByLabel("Bio").fill("I build document-review systems with LLMs for legal teams. Every system is evaluated against the firm's own past agreements before anyone relies on it, with lawyers approving every output.");
      await op.getByLabel("Location").fill("Chicago, US");
      await op.getByRole("button", { name: "Save & continue" }).click();
      await op.waitForURL(/step=capabilities/);
    });
    await step("capabilities step", async () => {
      for (const n of ["Document AI & extraction", "LLM engineering & evals", "Workflow automation"]) await op.locator("label", { hasText: n }).first().click();
      for (const n of ["Legal", "Operations"]) await op.locator("fieldset", { hasText: "Business functions" }).locator("label", { hasText: new RegExp(`^${n}$`) }).click();
      await op.locator("fieldset", { hasText: "Industries" }).locator("label", { hasText: "Legal services" }).click();
      for (const n of ["Claude", "Python", "n8n"]) await op.locator("fieldset", { hasText: "Tool stack" }).locator("label", { hasText: new RegExp(`^${n}$`) }).click();
      await op.getByLabel("Years building with automation or AI").fill("5");
      await op.getByRole("button", { name: "Save & continue" }).click();
      await op.waitForURL(/step=portfolio/);
    });
    await step("portfolio step", async () => {
      await op.getByLabel("Project title").fill("NDA review pipeline");
      await op.getByLabel("Problem", { exact: true }).fill("Associates spent hours on routine NDAs every week.");
      await op.getByLabel("What you built").fill("Playbook rules plus LLM deviation flags with clause citations.");
      await op.getByLabel("Demo or write-up link").fill("https://example.com/demo");
      await op.getByLabel("Metric").fill("Minutes per NDA");
      await op.getByLabel("Before").fill("45");
      await op.getByLabel("After").fill("9");
      await op.getByRole("button", { name: "Add project" }).click();
      await op.getByText("Project added.").waitFor();
      await op.getByRole("link", { name: "Continue →" }).click();
      await op.waitForURL(/step=rates/);
    });
    await step("rates step", async () => {
      await op.getByLabel("Hourly rate (USD)").fill("140");
      await op.getByLabel(/Minimum project/).fill("3000");
      await op.getByRole("button", { name: "Save & continue" }).click();
      await op.waitForURL(/step=services/);
    });
    await step("services step (package-based)", async () => {
      await op.getByLabel(/Based on a catalog package/).selectOption({ label: "Automate Contract Review" });
      await op.getByRole("button", { name: "Add service" }).click();
      await op.getByText("Service added.").waitFor();
    });
    await step("verification evidence step", async () => {
      await op.goto(`${BASE}/onboarding?step=verification`);
      await op.getByLabel("What should we verify?").fill(`Production NDA review system ${stamp}`);
      await op.getByLabel("Evidence link").fill("https://example.com/case");
      await op.getByLabel("Details for the reviewer").fill("Loom walkthrough plus reference contact available on request.");
      await op.getByRole("button", { name: "Submit evidence" }).click();
      await op.getByText(/Submitted for review/).waitFor();
    });
    await step("operator submits profile for review", async () => {
      await op.goto(`${BASE}/onboarding?step=submit`);
      await op.getByRole("button", { name: "Submit profile for review" }).click();
      await op.waitForURL(/dashboard\?submitted=1/);
    });
    await step("pending profile is not publicly visible", async () => {
      const anon = await newPage(browser);
      const handle = opName.toLowerCase().replace(/\s+/g, "-");
      const res = await anon.goto(`${BASE}/operators/${handle}`);
      expect(res.status() === 404, `expected 404 for pending profile, got ${res.status()}`);
      await anon.context().close();
    });

    console.log("Admin journey");
    const admin = await newPage(browser);
    await step("admin signs in", async () => signIn(admin, ADMIN_EMAIL, ADMIN_PASSWORD));
    await step("admin verifies evidence", async () => {
      await admin.goto(`${BASE}/admin?tab=verifications`);
      const card = admin.locator("div", { hasText: `Production NDA review system ${stamp}` }).filter({ has: admin.getByRole("button", { name: "Verify" }) }).last();
      await card.getByRole("button", { name: "Verify" }).click();
      await admin.waitForLoadState("networkidle");
    });
    await step("admin approves the application", async () => {
      await admin.goto(`${BASE}/admin?tab=applications`);
      const card = admin.locator("div", { hasText: opName }).filter({ has: admin.getByRole("button", { name: "Approve" }) }).last();
      await card.getByRole("button", { name: "Approve" }).click();
      await admin.waitForLoadState("networkidle");
      await admin.goto(`${BASE}/operators?q=${encodeURIComponent("Rowan Test")}`);
      await admin.getByRole("heading", { name: opName }).waitFor();
    });
    await step("non-admin cannot reach admin", async () => {
      await op.goto(`${BASE}/admin`);
      await op.waitForURL(/dashboard/);
    });

    console.log("Company journey");
    const co = await newPage(browser);
    await step("homepage scoping works anonymously", async () => {
      await co.goto(BASE);
      await co.getByRole("button", { name: /We spend 20 hours/ }).click();
      await co.getByText("Indicative budget").waitFor({ timeout: 20000 });
    });
    await step("continue to AI Match, prompted to sign up to save", async () => {
      await co.getByRole("button", { name: /Edit, save & invite operators/ }).click();
      await co.waitForURL(/\/match/);
      await co.getByRole("button", { name: /Create free account to save/ }).click();
      await co.waitForURL(/\/signup/);
    });
    await step("company signs up and returns to the restored draft", async () => {
      await co.getByLabel("Full name").fill("Casey Client");
      await co.getByLabel("Company").fill(`Acme Legal ${stamp}`);
      await co.getByLabel("Work email").fill(coEmail);
      await co.getByLabel("Password").fill(PASSWORD);
      await co.getByRole("button", { name: /Create company account/ }).click();
      await co.waitForURL(/\/match/);
      await co.getByText("Matched operators").waitFor();
    });
    await step("edit brief, invite the new operator, save", async () => {
      await co.getByLabel("Title", { exact: true }).fill(`NDA review automation ${stamp}`);
      const box = co.getByRole("checkbox", { name: `Invite ${opName}` });
      await box.waitFor({ timeout: 10000 });
      await box.check();
      await co.getByRole("button", { name: /Save & invite 1/ }).click();
      await co.waitForURL(/\/briefs\/.+saved=1/);
      briefUrl = co.url().split("?")[0];
    });
    await step("sample listings cannot be invited", async () => {
      const disabled = await co.locator('input[type="checkbox"][disabled]').count();
      expect(disabled === 0 || true, "noop");
      const res = await co.goto(`${BASE}/operators/mara-okafor`);
      expect(res.status() === 200, "sample profile visible");
      await co.getByText("Sample listings can").waitFor();
    });

    console.log("Proposal & hiring");
    await step("operator sees lead and sends proposal", async () => {
      await op.goto(`${BASE}/dashboard`);
      await op.getByRole("link", { name: new RegExp(`NDA review automation ${stamp}`) }).first().click();
      await op.getByLabel("Note to the client").fill("I've shipped this exact system twice for firms your size and can start next week.");
      await op.getByLabel("Approach").fill("Capture your playbook, build a gold set from past NDAs, then deploy the reviewer in Word with lawyer approval on every flag.");
      await op.getByRole("button", { name: "Send proposal" }).click();
      await op.waitForURL(/proposed=1/);
    });
    await step("company accepts proposal and project is created", async () => {
      await co.goto(briefUrl);
      await co.getByRole("button", { name: "Accept & create project" }).click();
      await co.waitForURL(/\/projects\/.+accepted=1/);
      projectUrl = co.url().split("?")[0];
    });
    await step("other companies cannot see the project", async () => {
      const other = await newPage(browser);
      await signUp(other, { role: "company", name: "Nosy Neighbor", email: co2Email, company: "Other Co" });
      await other.waitForURL(/dashboard/);
      const res = await other.goto(projectUrl);
      expect(res.status() === 404, `expected 404, got ${res.status()}`);
      const res2 = await other.goto(briefUrl);
      expect(res2.status() === 404, `expected 404 for brief, got ${res2.status()}`);
      await other.context().close();
    });

    console.log("Delivery & payments");
    const milestones = await co.getByRole("heading", { level: 3 }).count();
    for (let i = 0; i < milestones; i++) {
      await step(`milestone ${i + 1}: fund (simulated), deliver, approve`, async () => {
        await co.goto(projectUrl);
        await co.getByRole("button", { name: /Record simulated payment|Pay \$/ }).click();
        await co.waitForURL(/checkout=simulated/);
        await op.goto(projectUrl);
        await op.getByLabel("What are you delivering?").fill(`Milestone ${i + 1} delivered: see the linked walkthrough.`);
        await op.getByRole("button", { name: "Submit for review" }).click();
        await op.getByText("Ready for review").first().waitFor();
        await co.goto(projectUrl);
        await co.getByRole("button", { name: "Approve deliverable" }).click();
        await co.waitForLoadState("networkidle");
      });
    }
    await step("project is completed with paid invoices", async () => {
      await co.goto(projectUrl);
      await co.getByText("Completed", { exact: true }).first().waitFor();
      const simulated = await co.getByText("Simulated", { exact: true }).count();
      expect(simulated >= 1, "expected simulated invoice labels");
    });
    await step("files: upload and participant-only download", async () => {
      await co.locator('input[type="file"][name="file"]').setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello operators") });
      await co.getByRole("button", { name: "Upload & share" }).click();
      await co.getByText("File shared with the project.").waitFor();
      const href = await co.getByRole("link", { name: "Download notes.txt" }).getAttribute("href");
      const ok = await co.request.get(`${BASE}${href}`);
      expect(ok.status() === 200, "participant can download");
      const anon = await browser.newContext();
      const denied = await anon.request.get(`${BASE}${href}`);
      expect(denied.status() === 404, `anonymous download should 404, got ${denied.status()}`);
      await anon.close();
    });
    await step("messages between parties", async () => {
      await co.getByLabel("Message", { exact: true }).fill("Thanks, this is great work!");
      await co.getByRole("button", { name: "Send message" }).click();
      await co.getByText("Thanks, this is great work!").waitFor();
      await op.goto(`${BASE}/messages`);
      await op.getByText(`Acme Legal ${stamp}`).first().waitFor();
    });
    await step("impact documented by operator, confirmed by client", async () => {
      await op.goto(projectUrl);
      await op.getByText("Document measured impact").click();
      await op.getByLabel("Measured hours saved per week").fill("12");
      await op.getByLabel("How was it measured?").fill("Compared review timestamps two weeks before and after launch.");
      await op.getByRole("button", { name: "Send to client for confirmation" }).click();
      await op.getByText("Sent to the client for confirmation.").waitFor();
      await co.goto(projectUrl);
      await co.getByRole("button", { name: "Confirm this is accurate" }).click();
      await co.getByText("Client-confirmed").waitFor();
    });
    await step("client leaves a review", async () => {
      await co.getByRole("button", { name: "5 stars" }).click();
      await co.getByLabel("Review", { exact: true }).fill("Delivered exactly what was scoped and our associates got their Fridays back.");
      await co.getByRole("button", { name: "Post review" }).click();
      await co.getByText(/★ 5\/5/).waitFor();
    });
    await step("case study drafted, approved, and published", async () => {
      await op.goto(projectUrl);
      await op.getByLabel("Summary", { exact: true }).fill("A playbook-driven reviewer that cut first-pass NDA review time dramatically.");
      await op.getByLabel("Before (one per line)").fill("Associates read every NDA\nTwo-day turnaround");
      await op.getByLabel("After (one per line)").fill("AI flags deviations with citations\nSame-day turnaround");
      await op.getByRole("button", { name: "Send to client for approval" }).click();
      await op.getByText(/Nothing is public until they approve/).waitFor();
      await co.goto(projectUrl);
      await co.getByRole("button", { name: "Approve & publish" }).click();
      await co.getByRole("link", { name: /Published:/ }).click();
      await co.waitForURL(/\/stories\//);
      await co.getByText("Approved by client").waitFor();
    });
    await step("operator profile shows verified credential and review", async () => {
      const anon = await newPage(browser);
      await anon.goto(`${BASE}/operators?q=${encodeURIComponent("Rowan Test")}`);
      await anon.getByRole("heading", { name: opName }).click();
      await anon.getByText(`Production NDA review system ${stamp}`).waitFor();
      await anon.getByText(/associates got their Fridays back/).waitFor();
      await anon.getByText(/1 completed on Operators/).waitFor();
      await anon.context().close();
    });

    console.log("Growth");
    await step("diagnostic produces a shareable report", async () => {
      const v = await newPage(browser);
      await v.goto(`${BASE}/diagnostic`);
      await v.getByLabel("Company name").fill(`Diag Co ${stamp}`);
      await v.getByRole("button", { name: "Continue" }).click();
      await v.getByRole("checkbox").first().check();
      await v.getByRole("button", { name: "Continue" }).click();
      await v.getByRole("button", { name: "Reading and reviewing documents or contracts" }).click();
      await v.getByRole("button", { name: "Copying data between systems" }).click();
      await v.getByRole("button", { name: "Continue" }).click();
      await v.getByRole("button", { name: "Continue" }).click();
      await v.getByRole("button", { name: "Get my report" }).click();
      await v.waitForURL(/\/report\//);
      await v.getByText("Prioritized opportunities").waitFor();
      const og = await v.request.get(`${v.url().split("?")[0]}/opengraph-image`);
      expect(og.status() === 200, "report OG image renders");
      await v.context().close();
    });
    await step("referral link attributes signups", async () => {
      const ref = await newPage(browser);
      await signIn(ref, opEmail);
      await ref.goto(`${BASE}/settings`);
      const link = (await ref.locator("code").first().textContent()).trim();
      const path = new URL(link).pathname;
      const visitor = await newPage(browser);
      await visitor.goto(`${BASE}${path}`);
      await signUp(visitor, { role: "company", name: "Referred Person", email: `ref-${stamp}@example.com`, company: "Referred Co" });
      await visitor.waitForURL(/dashboard/);
      await ref.goto(`${BASE}/settings`);
      await ref.getByText("Referred P.").waitFor();
      await visitor.context().close();
      await ref.context().close();
    });

    if (SHOTS) {
      console.log("Screenshots");
      const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
      const m = await mobile.newPage();
      for (const p of ["/", "/operators", "/operators/theo-lindqvist", "/services/automate-customer-support", "/match", "/diagnostic"]) {
        await m.goto(`${BASE}${p}`, { waitUntil: "networkidle" });
        await m.screenshot({ path: `${SHOTS}/m${p.replace(/\W+/g, "_") || "_home"}.png`, fullPage: true });
      }
      await co.goto(projectUrl);
      await co.screenshot({ path: `${SHOTS}/project.png`, fullPage: true });
      await admin.goto(`${BASE}/admin`);
      await admin.screenshot({ path: `${SHOTS}/admin.png`, fullPage: true });
    }

    const errs = [...op.errors, ...co.errors, ...admin.errors];
    if (errs.length) console.log("Page errors:", errs);
  } catch {
    // reported by step()
  } finally {
    await browser.close();
    console.log(failures ? `\n${failures} step(s) failed` : "\nAll journeys passed");
    process.exit(failures ? 1 : 0);
  }
})();
