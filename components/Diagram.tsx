
import React, { useEffect, useRef, useState } from 'react';

// Mermaid is loaded globally via script tag in index.html
declare const mermaid: any;

interface DiagramProps {
  code: string;
  theme: 'diamond' | 'sky';
}

const Diagram: React.FC<DiagramProps> = ({ code, theme }) => {
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    if (code) {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: theme === 'diamond' ? 'dark' : 'default',
          securityLevel: 'loose',
        });
        
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        // Mermaid 10+ returns a promise that resolves to { svg }
        mermaid.render(id, code).then((result: { svg: string }) => {
            setSvg(result.svg);
        }).catch((err: any) => {
             console.error("Mermaid render error", err);
             // Fallback text if rendering fails
             setSvg(`<div class="text-red-400 text-xs font-mono p-2 border border-red-500/30 bg-red-500/10 rounded">Unable to render diagram syntax.</div>`);
        });
      } catch (error) {
        console.error('Mermaid initialization failed:', error);
      }
    }
  }, [code, theme]);

  return (
    <div 
      className="my-4 p-4 bg-white/5 rounded-lg border border-white/10 overflow-x-auto flex justify-center"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export default Diagram;
