import { useRef, useState } from 'react';
import type { ZoomDoc } from '../types/zoomdoc';

interface DocumentLoaderProps {
  onLoad: (doc: ZoomDoc) => void;
  onLoadSample: () => void;
}

export function DocumentLoader({ onLoad, onLoadSample }: DocumentLoaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const doc = JSON.parse(e.target?.result as string) as ZoomDoc;
        if (!doc.meta || !doc.root || !doc.root.levels) {
          throw new Error('Invalid ZoomDoc format');
        }
        onLoad(doc);
      } catch {
        setError('Invalid ZoomDoc file. Please provide a valid JSON file in ZoomDoc format.');
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-stone-50 dark:bg-stone-900">
      <div className="max-w-lg w-full text-center space-y-8">
        <div>
          <h1 className="text-4xl font-serif font-light text-stone-800 dark:text-stone-100 tracking-tight">
            zooomin
          </h1>
          <p className="mt-3 text-stone-500 dark:text-stone-400 text-lg">
            Semantic zoom for text. Start zoomed out, drill in where it matters.
          </p>
        </div>

        <div
          className={`border-2 border-dashed rounded-lg p-12 transition-colors ${
            dragOver
              ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30'
              : 'border-stone-300 dark:border-stone-600 hover:border-stone-400 dark:hover:border-stone-500'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <p className="text-stone-500 dark:text-stone-400 mb-4">
            Drop a ZoomDoc JSON file here
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 rounded transition-colors text-sm"
          >
            or choose a file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>

        {error && (
          <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-stone-200 dark:border-stone-700" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-stone-50 dark:bg-stone-900 px-3 text-stone-400 dark:text-stone-500">or</span>
          </div>
        </div>

        <button
          onClick={onLoadSample}
          className="w-full px-6 py-4 bg-stone-800 dark:bg-stone-100 text-stone-100 dark:text-stone-800 rounded-lg hover:bg-stone-700 dark:hover:bg-stone-200 transition-colors text-left"
        >
          <div className="text-sm font-medium mb-1">Try the sample document</div>
          <div className="text-sm opacity-70">
            "How Memory Works" — explore how we encode, store, and retrieve memories
          </div>
        </button>
      </div>
    </div>
  );
}
