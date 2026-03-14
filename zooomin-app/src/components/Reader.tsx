import { useEffect, useCallback, useState, useRef } from 'react';
import type { ZoomDoc, ZoomNode } from '../types/zoomdoc';
import { useDocState } from '../hooks/useDocState';
import { ZoomNodeComponent } from './ZoomNode';
import { Breadcrumb } from './Breadcrumb';

const FONT_SIZE_KEY = 'zooomin-font-size';
const DARK_MODE_KEY = 'zooomin-dark-mode';
const FONT_SIZES = [
  { label: 'S', value: 16 },
  { label: 'M', value: 18 },
  { label: 'L', value: 20 },
  { label: 'XL', value: 22 },
];

interface ReaderProps {
  doc: ZoomDoc;
  onBack: () => void;
}

export function Reader({ doc, onBack }: ReaderProps) {
  const { initialize, expandNode, expandChild, collapseNode, collapseChild, collapseToZero, getNodeState } = useDocState();
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(() => {
    const stored = localStorage.getItem(FONT_SIZE_KEY);
    return stored ? parseInt(stored, 10) : 18;
  });
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem(DARK_MODE_KEY);
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const readerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initialize(doc);
  }, [doc, initialize]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem(DARK_MODE_KEY, String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem(FONT_SIZE_KEY, String(fontSize));
  }, [fontSize]);

  // Find all visible node IDs for keyboard navigation
  const getVisibleNodes = useCallback((): ZoomNode[] => {
    const visible: ZoomNode[] = [];
    const walk = (node: ZoomNode, isRoot: boolean) => {
      const state = getNodeState(node.id);
      if (!isRoot) visible.push(node);
      if (isRoot) {
        for (const child of node.children) {
          walk(child, false);
        }
      } else if (node.children.length > 0) {
        const maxLevel = Math.max(...Object.keys(node.levels).map(Number));
        if (state.level >= maxLevel) {
          for (const child of node.children) {
            const childState = getNodeState(child.id);
            if (childState.level > 0) {
              visible.push(child);
            }
          }
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
    <div
      ref={readerRef}
      className="min-h-screen bg-stone-50 dark:bg-stone-900 transition-colors duration-300"
      style={{ fontSize: `${fontSize}px` }}
    >
      <Breadcrumb
        root={doc.root}
        getNodeState={getNodeState}
        onCollapseToZero={collapseToZero}
        onFocusNode={setFocusedId}
      />

      {/* Top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-2 bg-stone-50/90 dark:bg-stone-900/90 backdrop-blur-sm border-b border-stone-200/50 dark:border-stone-700/50">
        <button
          onClick={onBack}
          className="text-sm text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
        >
          ← back
        </button>
        <div className="flex items-center gap-4">
          <span className="text-xs text-stone-500 dark:text-stone-400 font-mono hidden sm:inline">
            ↑↓ navigate · → expand · ← collapse
          </span>

          {/* Font size control */}
          <div className="flex items-center gap-0.5 border border-stone-300 dark:border-stone-600 rounded overflow-hidden">
            {FONT_SIZES.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setFontSize(value)}
                className={`px-2 py-0.5 text-xs font-mono transition-colors ${
                  fontSize === value
                    ? 'bg-stone-700 dark:bg-stone-200 text-stone-100 dark:text-stone-800'
                    : 'text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
                title={`Font size: ${value}px`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="text-sm text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
          >
            {darkMode ? '☀' : '☾'}
          </button>
        </div>
      </div>

      {/* Document */}
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {/* Title */}
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-serif font-light text-stone-900 dark:text-stone-50 tracking-tight leading-tight">
            {doc.meta.title}
          </h1>
          {doc.meta.author && (
            <p className="mt-2 text-stone-600 dark:text-stone-400 text-sm">
              {doc.meta.author}
            </p>
          )}
          {/* Root level 0 as thesis */}
          <p className="mt-4 text-stone-700 dark:text-stone-300 text-lg leading-relaxed italic">
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
              onExpandChild={expandChild}
              onCollapseChild={collapseChild}
              getNodeState={getNodeState}
              focusedId={focusedId}
              onFocusNode={setFocusedId}
            />
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-stone-200 dark:border-stone-700 text-center">
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Powered by zooomin · ZoomDoc v{doc.meta.zoomdoc_version}
          </p>
        </footer>
      </div>
    </div>
  );
}
