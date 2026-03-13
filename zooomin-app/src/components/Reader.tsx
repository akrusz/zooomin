import { useEffect, useCallback, useState, useRef } from 'react';
import type { ZoomDoc, ZoomNode } from '../types/zoomdoc';
import { useDocState } from '../hooks/useDocState';
import { ZoomNodeComponent } from './ZoomNode';
import { Breadcrumb } from './Breadcrumb';

interface ReaderProps {
  doc: ZoomDoc;
  onBack: () => void;
}

export function Reader({ doc, onBack }: ReaderProps) {
  const { initialize, expandNode, collapseNode, collapseToZero, getNodeState } = useDocState();
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const readerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initialize(doc);
  }, [doc, initialize]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Find all visible node IDs for keyboard navigation
  const getVisibleNodes = useCallback((): ZoomNode[] => {
    const visible: ZoomNode[] = [];
    const walk = (node: ZoomNode, isRoot: boolean) => {
      const state = getNodeState(node.id);
      if (!isRoot) visible.push(node);
      if (state.expanded || isRoot) {
        for (const child of node.children) {
          walk(child, false);
        }
      }
    };
    walk(doc.root, true);
    return visible;
  }, [doc.root, getNodeState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const visible = getVisibleNodes();
      const currentIndex = focusedId ? visible.findIndex(n => n.id === focusedId) : -1;

      switch (e.key) {
        case 'j':
        case 'ArrowDown': {
          e.preventDefault();
          const nextIndex = Math.min(currentIndex + 1, visible.length - 1);
          if (visible[nextIndex]) {
            setFocusedId(visible[nextIndex].id);
            scrollToNode(visible[nextIndex].id);
          }
          break;
        }
        case 'k':
        case 'ArrowUp': {
          e.preventDefault();
          const prevIndex = Math.max(currentIndex - 1, 0);
          if (visible[prevIndex]) {
            setFocusedId(visible[prevIndex].id);
            scrollToNode(visible[prevIndex].id);
          }
          break;
        }
        case 'l':
        case 'ArrowRight':
        case 'Enter': {
          e.preventDefault();
          if (currentIndex >= 0) {
            expandNode(visible[currentIndex]);
          }
          break;
        }
        case 'h':
        case 'ArrowLeft':
        case 'Backspace': {
          e.preventDefault();
          if (currentIndex >= 0) {
            if (e.shiftKey) {
              collapseToZero(visible[currentIndex]);
            } else {
              collapseNode(visible[currentIndex]);
            }
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedId, getVisibleNodes, expandNode, collapseNode, collapseToZero]);

  const scrollToNode = (id: string) => {
    const el = document.querySelector(`[data-node-id="${id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  return (
    <div ref={readerRef} className="min-h-screen bg-stone-50 dark:bg-stone-900 transition-colors duration-300">
      <Breadcrumb
        root={doc.root}
        getNodeState={getNodeState}
        onCollapseToZero={collapseToZero}
        onFocusNode={setFocusedId}
      />

      {/* Top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-2 bg-stone-50/90 dark:bg-stone-900/90 backdrop-blur-sm">
        <button
          onClick={onBack}
          className="text-sm text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
        >
          ← back
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-400 dark:text-stone-500 font-mono hidden sm:inline">
            ↑↓ navigate · → expand · ← collapse
          </span>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="text-sm text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
          >
            {darkMode ? '☀' : '☾'}
          </button>
        </div>
      </div>

      {/* Document */}
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {/* Title */}
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-serif font-light text-stone-800 dark:text-stone-100 tracking-tight leading-tight">
            {doc.meta.title}
          </h1>
          {doc.meta.author && (
            <p className="mt-2 text-stone-500 dark:text-stone-400 text-sm">
              {doc.meta.author}
            </p>
          )}
          {/* Root level 0 as thesis */}
          <p className="mt-4 text-stone-600 dark:text-stone-300 text-lg leading-relaxed italic">
            {doc.root.levels['0']}
          </p>
        </header>

        {/* Sections */}
        <div className="space-y-2">
          {doc.root.children.map(child => (
            <ZoomNodeComponent
              key={child.id}
              node={child}
              nodeState={getNodeState(child.id)}
              depth={1}
              onExpand={expandNode}
              onCollapse={collapseNode}
              onCollapseToZero={collapseToZero}
              getNodeState={getNodeState}
              focusedId={focusedId}
              onFocusNode={setFocusedId}
            />
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-stone-200 dark:border-stone-700 text-center">
          <p className="text-xs text-stone-400 dark:text-stone-500">
            Powered by zooomin · ZoomDoc v{doc.meta.zoomdoc_version}
          </p>
        </footer>
      </div>
    </div>
  );
}
