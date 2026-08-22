"use client";

import { useState, type ReactNode } from "react";
import { AlertTriangle, Check, HelpCircle, Lightbulb, Sparkles, X } from "lucide-react";
import PandaVideoPlayer from "@/components/classroom/PandaVideoPlayer";
import { extractYouTubeId, youtubeEmbedUrl } from "@/lib/editor/youtube";
import { cn } from "@/lib/utils";
import type { ContentBlock, LessonContentBlock } from "@/types/course";

interface BlockViewerProps {
  blocks: LessonContentBlock[] | ContentBlock[];
}

type InlineNode = {
  type?: string;
  text?: string;
  href?: string;
  styles?: Record<string, unknown>;
  content?: unknown;
};

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function inlineText(content: unknown): string {
  if (typeof content === "string") return stripHtml(content);
  if (!Array.isArray(content)) return "";
  return content.map((node) => {
    if (typeof node === "string") return node;
    const item = node as InlineNode;
    return item.text ?? inlineText(item.content);
  }).join("");
}

const pastelBackgrounds: Record<string, string> = {
  yellow: "color-mix(in oklch, #fde047 30%, transparent)",
  blue: "color-mix(in oklch, var(--accent) 20%, transparent)",
  green: "color-mix(in oklch, var(--success) 20%, transparent)",
  red: "color-mix(in oklch, var(--danger) 20%, transparent)",
  pink: "color-mix(in oklch, #f472b6 20%, transparent)",
  purple: "color-mix(in oklch, #c084fc 20%, transparent)",
  orange: "color-mix(in oklch, var(--warning) 25%, transparent)",
  brown: "color-mix(in oklch, #a8a29e 25%, transparent)",
  gray: "var(--surface-secondary)",
};

const pastelText: Record<string, string> = {
  yellow: "#a16207",
  blue: "var(--accent)",
  green: "var(--success)",
  red: "var(--danger)",
  pink: "#db2777",
  purple: "#9333ea",
  orange: "#ea580c",
  brown: "#78716c",
  gray: "var(--muted)",
};

function InlineContent({ content }: { content: unknown }) {
  if (typeof content === "string") return <>{stripHtml(content)}</>;
  if (!Array.isArray(content)) return null;

  return <>{content.map((raw, index) => {
    if (typeof raw === "string") return <span key={index}>{raw}</span>;
    const node = raw as InlineNode;
    const styles = node.styles ?? {};
    let child: ReactNode = node.text ?? <InlineContent content={node.content} />;
    if (styles.code) child = <code>{child}</code>;
    if (styles.bold) child = <strong>{child}</strong>;
    if (styles.italic) child = <em>{child}</em>;
    if (styles.underline) child = <u>{child}</u>;
    if (styles.strike) child = <s>{child}</s>;
    
    const rawColor = typeof styles.textColor === "string" ? styles.textColor : undefined;
    const rawBg = typeof styles.backgroundColor === "string" ? styles.backgroundColor : undefined;
    
    const color = rawColor ? (pastelText[rawColor.toLowerCase()] || rawColor) : undefined;
    const backgroundColor = rawBg ? (pastelBackgrounds[rawBg.toLowerCase()] || rawBg) : undefined;
    
    const styled = color || backgroundColor ? (
      <span 
        style={{ color, backgroundColor }} 
        className={cn(backgroundColor && "px-1.5 py-0.5 rounded-md box-decoration-clone")}
      >
        {child}
      </span>
    ) : child;
    return node.type === "link" && node.href
      ? <a key={index} href={node.href} rel="noreferrer" className="text-accent underline">{styled}</a>
      : <span key={index}>{styled}</span>;
  })}</>;
}

function parseOptions(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function ReadOnlyQuiz({ block }: { block: LessonContentBlock }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const options = parseOptions(block.props.options);
  const correctAnswer = Number(block.props.correctAnswer ?? 0);
  const question = String(block.props.question ?? "");
  const explanation = String(block.props.explanation ?? "");

  return (
    <div className="my-10 overflow-hidden rounded-2xl border border-hairline bg-surface shadow-elev-2">
      <div className="flex items-center gap-3 px-6 pt-6 sm:px-8 sm:pt-8">
        <span className="grid size-9 place-items-center rounded-lg bg-accent-soft text-accent-soft-foreground"><HelpCircle className="size-4.5" /></span>
        <p className="eyebrow">Verifique seu conhecimento</p>
      </div>
      <p className="px-6 pt-4 font-display text-lg font-bold leading-snug text-foreground sm:px-8 sm:text-xl">{question}</p>
      <div className="space-y-2.5 px-6 pt-5 sm:px-8">
        {options.map((option, index) => {
          if (!option) return null;
          const chosen = selected === index;
          const right = submitted && index === correctAnswer;
          const wrong = submitted && chosen && !right;
          return (
            <button key={index} type="button" disabled={submitted} aria-pressed={chosen} onClick={() => setSelected(index)}
              className={cn("flex min-h-14 w-full items-center justify-between rounded-xl border border-hairline px-5 py-3.5 text-left",
                !submitted && "hover:border-accent hover:bg-accent-soft/45", chosen && !submitted && "border-accent bg-accent-soft",
                right && "border-success bg-success-soft", wrong && "border-danger bg-danger-soft", submitted && !right && !wrong && "opacity-55")}
            >
              <span className="min-w-0 break-words font-medium">{option}</span>{right && <Check className="size-5 shrink-0" />}{wrong && <X className="size-5 shrink-0" />}
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-3 px-6 pb-6 pt-5 sm:px-8 sm:pb-8">
        {!submitted ? (
          <button type="button" disabled={selected === null} onClick={() => setSubmitted(true)} className="self-end rounded-lg bg-accent px-5 py-3 text-sm font-medium text-accent-foreground disabled:opacity-50">Confirmar resposta</button>
        ) : explanation ? <p className="text-sm leading-relaxed text-muted">{explanation}</p> : null}
      </div>
    </div>
  );
}

function ReadOnlyVideo({ block }: { block: LessonContentBlock }) {
  const provider = String(block.props.provider ?? "youtube");
  const rawId = String(block.props.videoId ?? "");
  const url = String(block.props.url ?? "");
  const videoId = extractYouTubeId(rawId) ?? rawId;
  const caption = String(block.props.caption ?? "");
  return (
    <figure className="my-8 overflow-hidden rounded-xl border border-border bg-surface">
      {provider === "youtube" && videoId ? (
        <div className="aspect-video bg-black"><iframe src={youtubeEmbedUrl(videoId)} className="size-full" allow="accelerated-video-playback; encrypted-media; picture-in-picture" allowFullScreen title="Vídeo da aula" loading="lazy" /></div>
      ) : provider === "panda" ? (
        <PandaVideoPlayer embedUrl={url} className="aspect-video w-full bg-black" />
      ) : url ? (
        <div className="aspect-video bg-black"><iframe src={url} className="size-full" allowFullScreen title="Vídeo da aula" loading="lazy" /></div>
      ) : <div className="flex aspect-video items-center justify-center bg-surface-secondary text-sm text-muted">Vídeo indisponível.</div>}
      {caption && <figcaption className="px-4 py-3 text-xs text-muted">{caption}</figcaption>}
    </figure>
  );
}

const calloutVariants = {
  reflexao: { label: "Para refletir", icon: Lightbulb, className: "border-accent bg-accent-soft text-accent-soft-foreground" },
  dica: { label: "Dica", icon: Sparkles, className: "border-success bg-success-soft text-success-soft-foreground" },
  atencao: { label: "Atenção", icon: AlertTriangle, className: "border-warning bg-warning-soft text-warning-soft-foreground" },
};

function RenderBlock({ block }: { block: LessonContentBlock }) {
  const children = block.children?.length ? <div className="ml-5"><BlockList blocks={block.children} /></div> : null;
  const content = <InlineContent content={block.content} />;

  switch (block.type) {
    case "heading": {
      const level = Number(block.props.level ?? 2);
      if (level === 1) return <><h2 className="mt-9 text-3xl font-bold text-foreground">{content}</h2>{children}</>;
      if (level === 3) return <><h4 className="mt-7 text-xl font-bold text-foreground">{content}</h4>{children}</>;
      return <><h3 className="mt-8 text-2xl font-bold text-foreground">{content}</h3>{children}</>;
    }
    case "bulletListItem": return <ul className="ml-6 list-disc"><li className="my-2 leading-8">{content}{children}</li></ul>;
    case "numberedListItem": return <ol className="ml-6 list-decimal"><li className="my-2 leading-8">{content}{children}</li></ol>;
    case "checkListItem": return <label className="my-2 flex gap-3 leading-8"><input type="checkbox" checked={Boolean(block.props.checked)} readOnly /> <span>{content}</span></label>;
    case "lessonVideo": return <ReadOnlyVideo block={block} />;
    case "quiz": return <ReadOnlyQuiz block={block} />;
    case "callout": {
      const key = String(block.props.variant ?? "reflexao") as keyof typeof calloutVariants;
      const variant = calloutVariants[key] ?? calloutVariants.reflexao;
      const Icon = variant.icon;
      return <div className={cn("my-6 rounded-xl border-l-4 p-4", variant.className)}><p className="eyebrow mb-2 flex items-center gap-2"><Icon className="size-4" />{variant.label}</p><div className="leading-7">{content}</div>{children}</div>;
    }
    case "citation": return <blockquote className="my-7 border-l-4 border-border pl-5"><div className="font-display text-xl italic leading-relaxed">{content}</div>{block.props.author ? <cite className="mt-2 block text-sm font-semibold not-italic text-muted">— {String(block.props.author)}</cite> : null}</blockquote>;
    case "codeBlock": return <pre className="my-6 overflow-x-auto rounded-xl bg-foreground p-4 text-sm text-background"><code>{inlineText(block.content)}</code></pre>;
    case "table": {
      const table = block.content as { rows?: Array<{ cells?: unknown[] }> } | undefined;
      return <div className="my-6 overflow-x-auto"><table className="w-full border-collapse">{table?.rows?.map((row, rowIndex) => <tbody key={rowIndex}><tr>{row.cells?.map((cell, cellIndex) => <td key={cellIndex} className="border border-hairline p-3"><InlineContent content={cell} /></td>)}</tr></tbody>)}</table></div>;
    }
    case "image": {
      const url = String(block.props.url ?? "");
      return url ? <figure className="my-7"><img src={url} alt={String(block.props.caption ?? "Imagem da aula")} loading="lazy" className="h-auto max-w-full rounded-xl" />{block.props.caption ? <figcaption className="mt-2 text-center text-xs text-muted">{String(block.props.caption)}</figcaption> : null}</figure> : null;
    }
    default: return <><p className="my-4 text-[1.0625rem] leading-8 text-foreground">{content}</p>{children}</>;
  }
}

function legacyToBlock(block: ContentBlock): LessonContentBlock | null {
  const metadata = block.metadata ?? {};
  if (block.type === "video") {
    const url = String(metadata.url ?? "");
    const youtubeId = extractYouTubeId(url);
    return { id: block.id, type: "lessonVideo", props: { provider: youtubeId ? "youtube" : "url", videoId: youtubeId ?? "", url, caption: stripHtml(block.content) } };
  }
  if (block.type === "quiz") return { id: block.id, type: "quiz", props: { question: stripHtml(block.content), options: JSON.stringify(metadata.options ?? []), correctAnswer: metadata.correctAnswer ?? 0, explanation: "" } };
  if (block.type === "reflexao") return { id: block.id, type: "callout", props: { variant: "reflexao" }, content: stripHtml(block.content) };
  if (block.type === "citacao") return { id: block.id, type: "citation", props: { author: metadata.author ?? "" }, content: stripHtml(block.content) };
  if (block.type === "table") return { id: block.id, type: "table", props: {}, content: { rows: (metadata.tableData ?? []).map((cells: unknown[]) => ({ cells })) } as unknown };
  if (block.type === "h1" || block.type === "h2") return { id: block.id, type: "heading", props: { level: block.type === "h1" ? 1 : 2 }, content: stripHtml(block.content) };
  return { id: block.id, type: "paragraph", props: {}, content: stripHtml(block.content) };
}

function BlockList({ blocks }: { blocks: LessonContentBlock[] }) {
  return <>{blocks.map((block, index) => <RenderBlock key={block.id || index} block={block} />)}</>;
}

export default function BlockViewer({ blocks }: BlockViewerProps) {
  if (!blocks?.length) return null;
  const normalized = "props" in blocks[0]
    ? blocks as LessonContentBlock[]
    : (blocks as ContentBlock[]).map(legacyToBlock).filter((item): item is LessonContentBlock => item !== null);
  return <div className="block-viewer max-w-[68ch]"><BlockList blocks={normalized} /></div>;
}
