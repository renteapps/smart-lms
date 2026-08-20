import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const MARKDOWN_COMPONENTS: Components = {
  h1: ({ children }) => <h1 className="mb-3 mt-5 text-lg font-bold first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 mt-5 text-base font-bold first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 mt-4 text-sm font-bold first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="my-3 leading-7 first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="my-3 ml-5 list-disc space-y-1 marker:text-accent">{children}</ul>,
  ol: ({ children }) => <ol className="my-3 ml-5 list-decimal space-y-2 marker:font-semibold marker:text-accent">{children}</ol>,
  li: ({ children }) => <li className="pl-1 leading-7">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-3 border-accent/50 bg-background-secondary px-4 py-2 text-muted">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="font-semibold text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
    >
      {children}
    </a>
  ),
  code: ({ className, children }) => (
    <code className={`rounded-md bg-background-secondary px-1.5 py-0.5 font-mono text-[0.9em] ${className ?? ""}`}>
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-4 overflow-x-auto rounded-xl border border-hairline bg-background-secondary p-4 text-xs leading-6 [&>code]:block [&>code]:bg-transparent [&>code]:p-0">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-5 border-hairline" />,
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-xl border border-hairline">
      <table className="w-full border-collapse text-left text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-background-secondary font-bold">{children}</thead>,
  th: ({ children }) => <th className="border-b border-hairline px-3 py-2">{children}</th>,
  td: ({ children }) => <td className="border-b border-hairline px-3 py-2 align-top last:border-b-0">{children}</td>,
};

export function AgentMarkdown({ text }: { text: string }) {
  return (
    <div className="min-w-0 break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={MARKDOWN_COMPONENTS}
        skipHtml
        disallowedElements={["img"]}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
