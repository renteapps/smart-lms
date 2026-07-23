import React, { useState } from 'react';
import { ContentBlock } from '@/lib/mockData';
import { Play, HelpCircle, Quote, Lightbulb, Check, X } from 'lucide-react';

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
    <div className="my-8 bg-surface-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <HelpCircle className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-text">Verifique seu conhecimento</h3>
      </div>
      <p className="text-lg text-text mb-6 font-medium">{block.content}</p>
      <div className="space-y-3">
        {options.map((opt: string, i: number) => {
          if (!opt) return null;
          
          let stateStyles = "border-border hover:border-primary hover:bg-primary/5 text-text";
          let icon = null;

          if (isSubmitted) {
            if (i === correctAnswer) {
              stateStyles = "border-emerald-500 bg-emerald-500/10 text-emerald-600";
              icon = <Check className="w-5 h-5 text-emerald-500" />;
            } else if (i === selectedOption) {
              stateStyles = "border-error bg-error/10 text-error";
              icon = <X className="w-5 h-5 text-error" />;
            } else {
              stateStyles = "border-border opacity-50";
            }
          } else if (i === selectedOption) {
            stateStyles = "border-primary bg-primary/10 text-primary";
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={isSubmitted}
              className={`w-full text-left px-5 py-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${stateStyles}`}
            >
              <div className="flex items-center gap-4">
                {!isSubmitted && (
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${i === selectedOption ? 'border-primary' : 'border-text-soft'}`}>
                    {i === selectedOption && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </div>
                )}
                <span className="font-medium">{opt}</span>
              </div>
              {icon && <div>{icon}</div>}
            </button>
          );
        })}
      </div>
      
      {!isSubmitted && selectedOption !== null && (
        <div className="mt-6 flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
          <button
            onClick={handleSubmit}
            className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors shadow-sm"
          >
            Confirmar Resposta
          </button>
        </div>
      )}
    </div>
  );
}

interface BlockViewerProps {
  blocks: ContentBlock[];
}

export default function BlockViewer({ blocks }: BlockViewerProps) {
  if (!blocks || blocks.length === 0) {
    return null;
  }

  const renderBlock = (block: ContentBlock) => {
    switch (block.type) {
      case 'h1':
        return <h1 className="text-3xl md:text-4xl font-bold text-text my-8 leading-tight" dangerouslySetInnerHTML={{ __html: block.content }} />;
      case 'h2':
        return <h2 className="text-2xl md:text-3xl font-bold text-text mt-8 mb-4 leading-snug" dangerouslySetInnerHTML={{ __html: block.content }} />;
      case 'video':
        return (
          <div className="my-8 rounded-2xl overflow-hidden bg-surface-card border border-border shadow-sm aspect-video">
            <iframe 
              src={block.metadata?.url} 
              className="w-full h-full"
              allowFullScreen
              title="Video content"
            />
          </div>
        );
      case 'quiz':
        return <QuizViewerBlock block={block} />;
      case 'reflexao':
        return (
          <div className="my-8 bg-gradient-to-br from-tertiary-container to-surface border-l-4 border-primary rounded-r-2xl p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Lightbulb className="w-24 h-24" />
            </div>
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-primary" />
              <div className="text-sm font-bold text-primary uppercase tracking-wider">Para Refletir</div>
            </div>
            <div className="text-lg text-text-soft leading-relaxed relative z-10" dangerouslySetInnerHTML={{ __html: block.content }} />
          </div>
        );
      case 'citacao':
        return (
          <div className="border-l-4 border-border pl-6 py-2 my-8 italic">
            <div className="text-2xl text-text-soft font-serif leading-relaxed mb-4" dangerouslySetInnerHTML={{ __html: `"${block.content}"` }} />
            {block.metadata?.author && (
              <p className="text-base text-text font-medium flex items-center gap-2">
                <span className="w-4 h-[1px] bg-border"></span>
                {block.metadata.author}
              </p>
            )}
          </div>
        );
      case 'table':
        const tableData: string[][] = block.metadata?.tableData || [];
        if (tableData.length === 0) return null;
        
        return (
          <div className="my-8 overflow-x-auto rounded-xl border border-border">
            <table className="w-full border-collapse text-left text-sm whitespace-nowrap">
              <thead className="bg-surface-hover/50 text-text font-medium border-b border-border">
                <tr>
                  {tableData[0]?.map((cell, i) => (
                    <th key={i} className="px-6 py-4">{cell}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-surface text-text-soft divide-y divide-border">
                {tableData.slice(1).map((row, i) => (
                  <tr key={i} className="hover:bg-surface-hover/30 transition-colors">
                    {row.map((cell, j) => (
                      <td key={j} className="px-6 py-4">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'paragraph':
      default:
        return <div className="text-lg text-text-soft leading-relaxed my-4 prose prose-p:my-0 max-w-none" dangerouslySetInnerHTML={{ __html: block.content }} />;
    }
  };

  return (
    <div className="block-viewer max-w-none">
      {blocks.map((block, index) => (
        <React.Fragment key={block.id || index}>
          {renderBlock(block)}
        </React.Fragment>
      ))}
    </div>
  );
}
