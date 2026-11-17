import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

async function fonts() {
  const dir = join(process.cwd(), "src/fonts/og");
  const [regular, semibold, serif] = await Promise.all([readFile(join(dir, "Geist-Regular.ttf")), readFile(join(dir, "Geist-SemiBold.ttf")), readFile(join(dir, "instrument-serif-latin-400-italic.woff"))]);
  return [
    { name: "Geist", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Geist", data: semibold, weight: 600 as const, style: "normal" as const },
    { name: "Serif", data: serif, weight: 400 as const, style: "italic" as const },
  ];
}

/** Branded share card used for profiles, reports, and stories. */
export async function brandCard({ eyebrow, title, accent, footer, stats }: { eyebrow: string; title: string; accent?: string; footer?: string; stats?: { label: string; value: string }[] }) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#131311", color: "#f5f4ef", padding: 64, fontFamily: "Geist" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#f5f4ef", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <div style={{ width: 22, height: 22, borderRadius: 999, border: "4px solid #131311" }} />
              <div style={{ position: "absolute", top: 6, right: 6, width: 9, height: 9, borderRadius: 2, background: "#ff4f00" }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -1 }}>operators</div>
          </div>
          <div style={{ fontSize: 20, color: "rgba(245,244,239,0.55)", textTransform: "uppercase", letterSpacing: 2 }}>{eyebrow}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: title.length > 60 ? 54 : 68, fontWeight: 600, letterSpacing: -2.5, lineHeight: 1.04, maxWidth: 1000 }}>{title}</div>
          {accent && <div style={{ fontSize: 40, fontFamily: "Serif", fontStyle: "italic", color: "#ff4f00" }}>{accent}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 48 }}>
            {(stats ?? []).map((s) => (
              <div key={s.label} style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 18, color: "rgba(245,244,239,0.5)", textTransform: "uppercase", letterSpacing: 1.5 }}>{s.label}</div>
                <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: -1 }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 22, color: "rgba(245,244,239,0.6)" }}>{footer ?? "The people who make AI work."}</div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: await fonts() },
  );
}
