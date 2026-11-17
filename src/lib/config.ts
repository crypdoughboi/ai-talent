/** Runtime configuration. Everything optional degrades gracefully and is surfaced in the UI. */
export const config = {
  get appUrl() {
    return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  },
  get platformFeeBps() {
    const v = Number(process.env.PLATFORM_FEE_BPS ?? 1500);
    return Number.isFinite(v) && v >= 0 && v <= 5000 ? Math.round(v) : 1500;
  },
  ai: {
    get enabled() {
      return Boolean(process.env.ANTHROPIC_API_KEY);
    },
    get model() {
      return process.env.AI_MODEL ?? "claude-opus-5-5";
    },
  },
  stripe: {
    get enabled() {
      return Boolean(process.env.STRIPE_SECRET_KEY);
    },
    get secretKey() {
      return process.env.STRIPE_SECRET_KEY ?? "";
    },
    get webhookSecret() {
      return process.env.STRIPE_WEBHOOK_SECRET ?? "";
    },
  },
  /** Simulated payments are clearly labeled and only allowed when Stripe is not configured. */
  get paymentsSimulation() {
    if (this.stripe.enabled) return false;
    if (process.env.PAYMENTS_SIMULATION != null) return process.env.PAYMENTS_SIMULATION === "true";
    return process.env.NODE_ENV !== "production";
  },
};

export const BRAND = {
  name: "Operators",
  tagline: "The people who make AI work.",
};
