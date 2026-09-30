import Link from "next/link";
import { Bot, Plug, User, Zap, type LucideIcon } from "lucide-react";
import {
  EDGE_LABEL,
  videoEmbed,
  type DemoEdge,
  type FlowKind,
  type FlowStep,
} from "@/lib/demos/shared";
import { aiServices } from "@/content/services";

export type ShowcaseDemo = {
  slug: string;
  title: string;
  niche: string;
  tiers: number[];
  edges: DemoEdge[];
  summary: string;
  problem: string;
  stack: string[];
  flow: FlowStep[];
  videoUrl: string | null;
};

const KIND: Record<FlowKind, { icon: LucideIcon; label: string }> = {
  edge: { icon: Plug, label: "Channel" },
  brain: { icon: Bot, label: "AI brain" },
  action: { icon: Zap, label: "Action" },
  human: { icon: User, label: "Human" },
};

function kindStyle(kind: FlowKind): React.CSSProperties {
  switch (kind) {
    case "edge":
      return { background: "var(--card)", border: "1.5px solid var(--accent)" };
    case "brain":
      return {
        background: "var(--accent-soft)",
        border: "1px solid transparent",
      };
    case "human":
      return {
        background: "var(--card)",
        border: "1.5px dashed var(--border)",
      };
    default:
      return { background: "var(--bg-2)", border: "1px solid var(--border)" };
  }
}

// The architecture diagram, drawn from data: channels outlined, the shared
// AI brain filled, actions neutral, human handoff dashed.
export function FlowDiagram({ flow }: { flow: FlowStep[] }) {
  const kinds = [...new Set(flow.map((s) => s.kind))];
  return (
    <div>
      <ol className="m-0 flex list-none flex-col gap-2 p-0 md:flex-row md:flex-wrap md:items-stretch">
        {flow.map((s, i) => {
          const Icon = KIND[s.kind].icon;
          return (
            <li key={i} className="flex items-center gap-2 md:flex-1">
              <div
                className="flex h-full min-w-0 flex-1 items-start gap-2.5 rounded-xl px-3 py-2.5"
                style={kindStyle(s.kind)}
              >
                <Icon
                  className="mt-0.5 h-4 w-4 shrink-0"
                  style={{ color: "var(--accent)" }}
                />
                <span className="min-w-0">
                  <span className="block text-[13px] leading-snug font-semibold">
                    {s.label}
                  </span>
                  {s.detail && (
                    <span
                      className="site-mono mt-0.5 block text-[10.5px]"
                      style={{ color: "var(--muted)" }}
                    >
                      {s.detail}
                    </span>
                  )}
                </span>
              </div>
              {i < flow.length - 1 && (
                <span
                  aria-hidden
                  className="site-mono hidden text-[13px] md:inline"
                  style={{ color: "var(--muted)" }}
                >
                  →
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <div
        className="site-mono mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] uppercase"
        style={{ letterSpacing: "0.06em", color: "var(--muted)" }}
      >
        {kinds.map((k) => {
          const Icon = KIND[k].icon;
          return (
            <span key={k} className="inline-flex items-center gap-1.5">
              <Icon className="h-3 w-3" style={{ color: "var(--accent)" }} />
              {KIND[k].label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="site-mono rounded-md px-2 py-[2px] text-[11px]"
      style={{
        color: "var(--muted)",
        background: "var(--bg-2)",
        border: "1px solid var(--border)",
      }}
    >
      {children}
    </span>
  );
}

export default function DemoShowcase({ demo }: { demo: ShowcaseDemo }) {
  const embed = demo.videoUrl ? videoEmbed(demo.videoUrl) : null;
  return (
    <article
      id={demo.slug}
      className="scroll-mt-24 overflow-hidden rounded-[20px]"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow)",
      }}
    >
      <div className="grid gap-0 md:grid-cols-[1.2fr_0.8fr]">
        <div
          className="flex items-center"
          style={{ background: "var(--bg-2)" }}
        >
          <div className="aspect-video w-full">
            {embed?.kind === "iframe" && (
              <iframe
                src={embed.src}
                title={`Recorded demo — ${demo.title}`}
                loading="lazy"
                allow="fullscreen; picture-in-picture"
                allowFullScreen
                className="block h-full w-full"
                style={{ border: 0 }}
              />
            )}
            {embed?.kind === "video" && (
              <video
                src={embed.src}
                controls
                preload="metadata"
                className="block h-full w-full"
              />
            )}
            {!embed && (
              <div
                className="site-mono grid h-full place-items-center text-[12px]"
                style={{ color: "var(--muted)" }}
              >
                no video yet — preview only
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col p-[22px]">
          <span
            className="site-mono text-[11px]"
            style={{ color: "var(--accent)" }}
          >
            {demo.niche}
          </span>
          <h2
            className="site-display mt-2 text-[21px] font-semibold"
            style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}
          >
            {demo.title}
          </h2>
          <p className="mt-2 text-[14.5px]" style={{ lineHeight: 1.5 }}>
            {demo.summary}
          </p>
          <p
            className="mt-3 text-[13.5px]"
            style={{ lineHeight: 1.55, color: "var(--muted)" }}
          >
            <span className="font-semibold" style={{ color: "var(--fg)" }}>
              The problem.{" "}
            </span>
            {demo.problem}
          </p>

          <div className="mt-auto flex flex-col gap-2.5 pt-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {demo.tiers.map((t) => {
                const svc = aiServices.find((s) => s.tier === t);
                return (
                  <Link
                    key={t}
                    href={`/services#level-${t}`}
                    className="site-mono rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase"
                    style={{
                      letterSpacing: "0.06em",
                      color: "var(--accent-fg)",
                      background: "var(--accent)",
                    }}
                  >
                    Level {t}
                    {svc ? ` · ${svc.name}` : ""}
                  </Link>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {demo.edges.map((e) => (
                <Chip key={e}>{EDGE_LABEL[e]}</Chip>
              ))}
              {demo.stack.map((t) => (
                <Chip key={t}>{t}</Chip>
              ))}
            </div>
          </div>
        </div>
      </div>

      {demo.flow.length > 0 && (
        <div
          className="p-[22px]"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <FlowDiagram flow={demo.flow} />
        </div>
      )}
    </article>
  );
}
