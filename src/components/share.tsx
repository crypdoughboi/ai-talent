"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { buttonClass } from "./ui";

function beacon(name: string, props: Record<string, string>) {
  try {
    navigator.sendBeacon?.("/api/events", new Blob([JSON.stringify({ name, path: location.pathname, props })], { type: "application/json" }));
  } catch {}
}

export function ShareButtons({ url, text, kind }: { url: string; text: string; kind: string }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={buttonClass("secondary", "sm")}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
            beacon("copy_link", { kind });
          } catch {}
        }}
      >
        {copied ? <Check className="size-3.5 text-ok" /> : <Link2 className="size-3.5" />}
        {copied ? "Copied" : "Copy link"}
      </button>
      <a
        className={buttonClass("secondary", "sm")}
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => beacon("share_click", { kind, network: "linkedin" })}
      >
        LinkedIn
      </a>
      <a
        className={buttonClass("secondary", "sm")}
        href={`https://x.com/intent/post?text=${enc(text)}&url=${enc(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => beacon("share_click", { kind, network: "x" })}
      >
        Post on X
      </a>
    </div>
  );
}
