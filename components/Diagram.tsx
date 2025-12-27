
import React, { useEffect, useRef, useState } from 'react';

// Mermaid is loaded globally via script tag in index.html
declare const mermaid: any;

interface DiagramProps {
  code: string;
  theme: 'diamond' | 'sky';
}

const Diagram: React.FC<DiagramProps> = ({ code, theme }) => {
  const [svg, setSvg] = useState<string>('');

  const renderDiagram = async (diagramCode: string) => {
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: theme === 'diamond' ? 'dark' : 'default',
        securityLevel: 'loose',
        flowchart: { htmlLabels: false }, // Disable HTML labels to prevent layout errors
      });
      
      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
      const result = await mermaid.render(id, diagramCode);
      setSvg(result.svg);
    } catch (err: any) {
      console.error("Mermaid render error", err);
      
      // If layout fails (e.g., "Could not find a suitable point..."), try one retry with stripped code
      if (err.message?.includes('point') || err.message?.includes('Parse')) {
          const strippedCode = diagramCode
            .replace(/<br\s*\/?>/gi, ' ') // Remove <br/>
            .replace(/[{}]/g, '') // Remove complex braces if they might be malformed
            .replace(/\[\[/g, '(').replace(/\]\]/g, ')'); // Convert complex shapes to simple ones
          
          try {
            const id2 = `mermaid-retry-${Math.random().toString(36).substr(2, 9)}`;
            const result2 = await mermaid.render(id2, strippedCode);
            setSvg(result2.svg);
          } catch (retryErr) {
            setSvg(`<div class="text-red-400 text-xs font-mono p-4 border border-red-500/30 bg-red-500/10 rounded-xl">
              <div class="font-bold mb-1 uppercase tracking-widest text-[10px]">Syntax Violation</div>
              Unable to render diagram logic. The AI generated an invalid structure.
            </div>`);
          }
      } else {
        setSvg(`<div class="text-red-400 text-xs font-mono p-4 border border-red-500/30 bg-red-500/10 rounded-xl">
          <div class="font-bold mb-1 uppercase tracking-widest text-[10px]">Render Error</div>
          Unable to render diagram syntax.
        </div>`);
      }
    }
  };

  useEffect(() => {
    if (code) {
      renderDiagram(code);
    }
  }, [code, theme]);

  return (
    <div 
      className="my-4 p-4 bg-white/5 rounded-2xl border border-white/10 overflow-x-auto flex justify-center shadow-inner"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export default Diagram;
