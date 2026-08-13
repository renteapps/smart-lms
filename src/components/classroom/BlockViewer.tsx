"use client";

import React, { useState } from "react";
import { Button, Card, Chip, Table, Typography } from "@heroui/react";
import { Check, HelpCircle, Lightbulb, X } from "lucide-react";
import { ContentBlock } from "@/lib/mockData";
import { cn } from "@/lib/utils";

function QuizViewerBlock({ block }: { block: ContentBlock }) {
  const options = block.metadata?.options || [];
  const correctAnswer = block.metadata?.correctAnswer ?? 0;
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSelect = (index: number) => {
    if (!isSubmitted) {
      setSelectedOption(index);
    }
  };

  const handleSubmit = () => {
    if (selectedOption !== null) {
      setIsSubmitted(true);
    }
  };

  return (
    <Card variant="secondary" className="my-10 gap-0 p-0">
      <Card.Header className="gap-3 px-6 pt-6 sm:px-8 sm:pt-8">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-soft-foreground">
            <HelpCircle className="size-4.5" aria-hidden="true" />
          </span>
          <p className="eyebrow">Verifique seu conhecimento</p>
        </div>
        <Card.Title className="font-display text-lg font-bold leading-snug tracking-[-0.02em] text-foreground sm:text-xl">
          {block.content}
        </Card.Title>
      </Card.Header>

      <Card.Content className="gap-2.5 px-6 pt-5 sm:px-8">
        {options.map((opt: string, i: number) => {
          if (!opt) return null;

          const isChosen = i === selectedOption;
          const isRight = isSubmitted && i === correctAnswer;
          const isWrong = isSubmitted && isChosen && i !== correctAnswer;

          return (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(i)}
              disabled={isSubmitted}
              aria-pressed={isChosen}
              className={cn(
                "flex min-h-14 w-full items-center justify-between gap-4 rounded-xl border border-hairline bg-surface px-5 py-3.5 text-left text-base transition-[border-color,background-color,color] duration-[var(--duration-md)]",
                !isSubmitted && "hover:border-accent hover:bg-accent-soft/45",
                !isSubmitted && isChosen && "border-accent bg-accent-soft text-accent-soft-foreground",
                isRight && "border-success bg-success-soft text-success-soft-foreground",
                isWrong && "border-danger bg-danger-soft text-danger-soft-foreground",
                isSubmitted && !isRight && !isWrong && "opacity-55",
              )}
            >
              <span className="flex items-center gap-4">
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors",
                    isChosen ? "border-current" : "border-separator",
                  )}
                >
                  {isChosen && <span className="size-2.5 rounded-full bg-current" />}
                </span>
                <span className="font-medium">{opt}</span>
              </span>
              {isRight && <Check className="size-5 shrink-0" aria-hidden="true" />}
              {isWrong && <X className="size-5 shrink-0" aria-hidden="true" />}
            </button>
          );
        })}
      </Card.Content>

      <Card.Footer className="justify-end px-6 pb-6 pt-5 sm:px-8 sm:pb-8">
        {isSubmitted ? (
          <Chip
            color={selectedOption === correctAnswer ? "success" : "danger"}
            variant="soft"
            size="sm"
          >
            {selectedOption === correctAnswer ? "Resposta correta" : "Resposta incorreta"}
          </Chip>
        ) : (
          <Button variant="primary" onClick={handleSubmit} isDisabled={selectedOption === null}>
            Confirmar resposta
          </Button>
        )}
      </Card.Footer>
    </Card>
  );
}

interface BlockViewerProps {
  blocks: ContentBlock[];
}

/**
 * Renderiza o conteúdo editorial de uma aula.
 *
 * Os blocos de texto vivem dentro de `Typography.Prose` — é ele que dá ritmo a
 * HTML solto (listas, ênfases, links) sem que cada bloco precise carregar as
 * próprias classes. Os títulos vindos do editor descem um nível (h1 → h2) para
 * não competirem com o h1 da aula.
 */
export default function BlockViewer({ blocks }: BlockViewerProps) {
  if (!blocks || blocks.length === 0) {
    return null;
  }

  const renderBlock = (block: ContentBlock) => {
    switch (block.type) {
      case "h1":
        return (
          <h2
            className="display-3 mt-12 mb-4 text-foreground first:mt-0"
            dangerouslySetInnerHTML={{ __html: block.content }}
          />
        );
      case "h2":
        return (
          <h3
            className="mt-10 mb-3 font-display text-xl font-bold tracking-[-0.02em] text-foreground sm:text-2xl"
            dangerouslySetInnerHTML={{ __html: block.content }}
          />
        );
      case "video":
        return (
          <div className="my-10 aspect-video overflow-hidden rounded-2xl border border-hairline bg-black shadow-elev-3">
            <iframe src={block.metadata?.url} className="size-full" allowFullScreen title="Vídeo do conteúdo" />
          </div>
        );
      case "quiz":
        return <QuizViewerBlock block={block} />;
      case "reflexao":
        return (
          <Card variant="secondary" className="relative my-10 gap-0 overflow-hidden p-0">
            <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-accent" />
            <Card.Content className="gap-3 px-6 py-6 sm:px-8 sm:py-8">
              <p className="eyebrow flex items-center gap-2 text-accent">
                <Lightbulb className="size-4" aria-hidden="true" />
                Para refletir
              </p>
              <div
                className="text-lg leading-8 text-foreground"
                dangerouslySetInnerHTML={{ __html: block.content }}
              />
            </Card.Content>
          </Card>
        );
      case "citacao":
        return (
          <figure className="my-10 border-l-2 border-accent pl-6">
            <blockquote
              className="font-display text-xl font-medium italic leading-relaxed text-foreground sm:text-2xl"
              dangerouslySetInnerHTML={{ __html: `“${block.content}”` }}
            />
            {block.metadata?.author && (
              <figcaption className="mt-4 flex items-center gap-2 text-sm font-semibold text-muted">
                <span aria-hidden="true" className="h-px w-5 bg-separator" />
                {block.metadata.author}
              </figcaption>
            )}
          </figure>
        );
      case "table": {
        const tableData: string[][] = block.metadata?.tableData || [];
        if (tableData.length === 0) return null;

        const [head, ...rows] = tableData;

        return (
          <div className="my-10">
            <Table.Root>
              <Table.ScrollContainer>
                <Table.Content aria-label="Tabela do conteúdo da aula">
                  <Table.Header>
                    {head.map((cell, i) => (
                      <Table.Column key={i} id={`col-${i}`} isRowHeader={i === 0}>
                        {cell}
                      </Table.Column>
                    ))}
                  </Table.Header>
                  <Table.Body>
                    {rows.map((row, i) => (
                      <Table.Row key={i} id={`row-${i}`}>
                        {row.map((cell, j) => (
                          <Table.Cell key={j} id={`cell-${i}-${j}`}>
                            {cell}
                          </Table.Cell>
                        ))}
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table.Root>
          </div>
        );
      }
      case "paragraph":
      default:
        return (
          <div
            className="my-5 text-[1.0625rem] leading-8 text-foreground"
            dangerouslySetInnerHTML={{ __html: block.content }}
          />
        );
    }
  };

  return (
    <Typography.Prose className="block-viewer max-w-none">
      {blocks.map((block, index) => (
        <React.Fragment key={block.id || index}>{renderBlock(block)}</React.Fragment>
      ))}
    </Typography.Prose>
  );
}
