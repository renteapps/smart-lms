"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { Input, TextField } from "@heroui/react";

export const citationBlockConfig = {
  type: "citation",
  propSchema: {
    author: { default: "" as const },
  },
  content: "inline",
} as const;

export const CitationBlock = createReactBlockSpec(citationBlockConfig, {
  render: ({ block, editor, contentRef }) => {
    return (
      <div className="my-2 w-full space-y-2 border-l-4 border-border pl-4">
        <div
          ref={contentRef}
          className="font-display text-xl font-medium italic leading-relaxed text-foreground"
        />
        {editor.isEditable ? (
          <TextField
            aria-label="Autor da citação"
            value={block.props.author}
            onChange={(value) => editor.updateBlock(block, { props: { author: value } })}
          >
            <Input placeholder="— Autor" className="text-sm not-italic" />
          </TextField>
        ) : (
          block.props.author && (
            <p className="flex items-center gap-2 text-sm font-semibold text-muted">
              <span aria-hidden="true" className="h-px w-5 bg-separator" />
              {block.props.author}
            </p>
          )
        )}
      </div>
    );
  },
});
