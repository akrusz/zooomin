import { useState } from 'react';
import type { ZoomNode as ZoomNodeType } from '../types/zoomdoc';
import type { NodeState } from '../types/zoomdoc';

interface ZoomNodeProps {
  node: ZoomNodeType;
  nodeState: NodeState;
  depth: number;
  onExpand: (node: ZoomNodeType) => void;
  onCollapse: (node: ZoomNodeType) => void;
  onCollapseToZero: (node: ZoomNodeType) => void;
  onExpandChild: (child: ZoomNodeType) => void;
  onCollapseChild: (child: ZoomNodeType) => void;
  getNodeState: (nodeId: string) => NodeState;
  focusedId: string | null;
  onFocusNode: (id: string) => void;
}

function getMaxLevel(node: ZoomNodeType): number {
  const keys = Object.keys(node.levels).map(Number);
  return Math.max(...keys);
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function getTotalWords(node: ZoomNodeType): number {
  const maxLevel = getMaxLevel(node);
  const ownWords = wordCount(node.levels[String(maxLevel)] || '');
  const childWords = node.children.reduce((sum, child) => sum + getTotalWords(child), 0);
  return node.children.length > 0 ? Math.max(ownWords, childWords) : ownWords;
}

function getCompressionRatio(node: ZoomNodeType, currentLevel: number): number | null {
  const totalWords = getTotalWords(node);
  const currentWords = wordCount(node.levels[String(currentLevel)] || node.levels['0'] || '');
  if (currentWords === 0 || totalWords <= currentWords) return null;
  return Math.round(totalWords / currentWords);
}

function getLevelLabel(level: number, maxLevel: number): string {
  if (level === 0) return 'headline';
  if (level === maxLevel) return 'full text';
  if (level === 1) return 'summary';
  if (level === 2) return 'overview';
  return 'detail';
}

function splitSentences(text: string): string[] {
  const raw = text.match(/[^.!?]*[.!?]+[\s]*/g) || [text];
  return raw.map(s => s.trim()).filter(Boolean);
}

function splitIntoSegments(text: string, numChildren: number): string[] {
  const sentences = splitSentences(text);
  if (numChildren <= 0 || sentences.length === 0) return [text];
  if (numChildren >= sentences.length) {
    const segments: string[] = [];
    for (let i = 0; i < numChildren; i++) {
      segments.push(sentences[i] || '');
    }
    return segments;
  }
  const perSegment = Math.floor(sentences.length / numChildren);
  const remainder = sentences.length % numChildren;
  const segments: string[] = [];
  let idx = 0;
  for (let i = 0; i < numChildren; i++) {
    const count = perSegment + (i < remainder ? 1 : 0);
    segments.push(sentences.slice(idx, idx + count).join(' '));
    idx += count;
  }
  return segments;
}

function renderMarkdownText(text: string) {
  return text.split('\n\n').map((paragraph, i) => {
    if (paragraph.startsWith('## ')) {
      return (
        <h4 key={i} className="font-semibold text-stone-800 dark:text-stone-200 mt-6 mb-2" style={{ fontSize: '1em' }}>
          {paragraph.replace('## ', '')}
        </h4>
      );
    }
    if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
      return (
        <h4 key={i} className="font-semibold text-stone-800 dark:text-stone-200 mt-5 mb-2" style={{ fontSize: '1em' }}>
          {paragraph.replace(/\*\*/g, '')}
        </h4>
      );
    }

    const parts = paragraph.split(/(\*\*[^*]+\*\*)/g);
    const isList = paragraph.includes('\n-');

    if (isList) {
      const lines = paragraph.split('\n');
      return (
        <div key={i} className="mb-4">
          {lines.map((line, j) => {
            if (line.startsWith('- ')) {
              const bulletParts = line.substring(2).split(/(\*\*[^*]+\*\*)/g);
              return (
                <div key={j} className="flex gap-2 mb-1 ml-4">
                  <span className="text-stone-500 dark:text-stone-400 shrink-0">•</span>
                  <span>
                    {bulletParts.map((part, k) =>
                      part.startsWith('**') && part.endsWith('**')
                        ? <strong key={k} className="font-semibold">{part.replace(/\*\*/g, '')}</strong>
                        : <span key={k}>{part}</span>
                    )}
                  </span>
                </div>
              );
            }
            return (
              <p key={j} className="mb-2">
                {line.split(/(\*\*[^*]+\*\*)/g).map((part, k) =>
                  part.startsWith('**') && part.endsWith('**')
                    ? <strong key={k} className="font-semibold">{part.replace(/\*\*/g, '')}</strong>
                    : <span key={k}>{part}</span>
                )}
              </p>
            );
          })}
        </div>
      );
    }

    return (
      <p key={i} className="mb-4">
        {parts.map((part, j) =>
          part.startsWith('**') && part.endsWith('**')
            ? <strong key={j} className="font-semibold">{part.replace(/\*\*/g, '')}</strong>
            : <span key={j}>{part}</span>
        )}
      </p>
    );
  });
}

/** Zoom level bars — clickable to collapse */
function ZoomLevelBars({ currentLevel, maxLevel, hasChildren, anyChildExpanded, onClick }: {
  currentLevel: number;
  maxLevel: number;
  hasChildren: boolean;
  anyChildExpanded: boolean;
  onClick: () => void;
}) {
  const totalSteps = maxLevel + (hasChildren ? 1 : 0);
  const filledSteps = anyChildExpanded ? totalSteps : currentLevel;

  if (totalSteps === 0) return null;

  return (
    <div
      className="flex flex-col items-center gap-[3px] py-1 shrink-0 cursor-pointer group"
      onClick={onClick}
      title="Click to collapse"
    >
      {Array.from({ length: totalSteps + 1 }, (_, i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full transition-all duration-300 ${
            i <= filledSteps
              ? 'h-[10px] bg-stone-500 dark:bg-stone-400 group-hover:bg-stone-600 dark:group-hover:bg-stone-300'
              : 'h-[10px] bg-stone-300 dark:bg-stone-600'
          }`}
        />
      ))}
    </div>
  );
}

/** Renders a segmented paragraph where each segment maps to a child */
function SegmentedParagraph({
  text,
  children,
  getNodeState,
  onExpandChild,
  onCollapseChild,
  onFocusNode,
}: {
  text: string;
  children: ZoomNodeType[];
  getNodeState: (nodeId: string) => NodeState;
  onExpandChild: (child: ZoomNodeType) => void;
  onCollapseChild: (child: ZoomNodeType) => void;
  onFocusNode: (id: string) => void;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const segments = splitIntoSegments(text, children.length);

  return (
    <div>
      {segments.map((segment, i) => {
        const child = children[i];
        if (!child || !segment) return null;
        const childState = getNodeState(child.id);
        const isChildExpanded = childState.level > 0;
        const isHovered = hoveredIndex === i && !isChildExpanded;
        const childMaxLevel = getMaxLevel(child);
        const childFullText = child.levels[String(childMaxLevel)] || child.levels['1'] || '';
        const childCompressionRatio = getCompressionRatio(child, 0);

        return (
          <div key={child.id} data-node-id={child.id}>
            {/* Segment text — block-level for consistent hover */}
            <div
              className={`relative -mx-3 px-3 py-1 rounded transition-colors duration-150 ${
                isChildExpanded
                  ? 'text-stone-500 dark:text-stone-400 italic cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800'
                  : isHovered
                    ? 'bg-stone-200/50 dark:bg-stone-700/30 cursor-pointer'
                    : 'cursor-pointer'
              }`}
              style={isChildExpanded ? { fontSize: '0.85em' } : undefined}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={(e) => {
                e.stopPropagation();
                if (isChildExpanded) {
                  onCollapseChild(child);
                } else {
                  onFocusNode(child.id);
                  onExpandChild(child);
                }
              }}
            >
              {segment}
              {/* Hover tab — pinned to top-right like a tab label */}
              {isHovered && !isChildExpanded && (
                <span className="absolute right-0 top-0 -translate-y-full text-sm text-stone-700 dark:text-stone-200 font-sans font-medium whitespace-nowrap bg-stone-200/80 dark:bg-stone-700/80 px-2.5 py-0.5 rounded-t pointer-events-none">
                  {child.title}{childCompressionRatio ? <span className="ml-1.5 text-stone-500 dark:text-stone-400 font-mono text-xs">{childCompressionRatio}x</span> : ''}
                </span>
              )}
            </div>
            {/* Expanded child content — border is clickable to collapse */}
            {isChildExpanded && (
              <div className="my-2 flex">
                <div
                  className="w-[2px] shrink-0 bg-stone-300 dark:bg-stone-600 rounded-full cursor-pointer hover:bg-stone-500 dark:hover:bg-stone-400 hover:w-[3px] transition-all duration-150"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCollapseChild(child);
                  }}
                  title="Click to collapse"
                />
                <div className="pl-4 flex-1 min-w-0">
                  <div
                    className="flex items-center gap-2 mb-2 cursor-pointer group select-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCollapseChild(child);
                    }}
                    title="Click to collapse"
                  >
                    <h4 className="text-sm font-medium tracking-wide uppercase text-stone-600 dark:text-stone-300 group-hover:text-stone-800 dark:group-hover:text-stone-100 transition-colors">
                      {child.title}
                    </h4>
                    <span className="text-sm text-stone-500 dark:text-stone-400 font-mono">
                      {getLevelLabel(childState.level, childMaxLevel)}
                    </span>
                    <span className="text-sm text-stone-500 dark:text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                      ◂ collapse
                    </span>
                  </div>
                  <div className="leading-[1.7] text-stone-800 dark:text-stone-200">
                    {renderMarkdownText(childFullText)}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ZoomNodeComponent({
  node,
  nodeState,
  depth,
  onExpand,
  onCollapse,
  onCollapseToZero,
  onExpandChild,
  onCollapseChild,
  getNodeState,
  focusedId,
  onFocusNode,
}: ZoomNodeProps) {
  const maxLevel = getMaxLevel(node);
  const isAtMax = nodeState.level >= maxLevel;
  const hasChildren = node.children.length > 0;
  const canExpand = !isAtMax;
  const isFocused = focusedId === node.id;

  const anyChildExpanded = hasChildren && node.children.some(child => {
    const cs = getNodeState(child.id);
    return cs.level > 0;
  });

  const showSegmented = isAtMax && hasChildren;
  const compressionRatio = getCompressionRatio(node, nodeState.level);

  const handleTextClick = () => {
    onFocusNode(node.id);
    if (canExpand) {
      onExpand(node);
    }
  };

  const handleHeaderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFocusNode(node.id);
    if (e.shiftKey) {
      onCollapseToZero(node);
    } else {
      onCollapse(node);
    }
  };

  const currentText = node.levels[String(nodeState.level)] || node.levels['0'] || '';
  const levelLabel = getLevelLabel(nodeState.level, maxLevel);
  const isExpanded = nodeState.level > 0 || anyChildExpanded;

  const showTrail = nodeState.level > 0;
  const trailText = node.levels['0'] || '';

  return (
    <div
      className="transition-all duration-300 ease-in-out"
      data-node-id={node.id}
    >
      {/* Header */}
      {depth > 0 && (
        <div
          className={`flex items-center gap-2 px-2 pt-3 pb-1 select-none group ${
            isExpanded ? 'cursor-pointer hover:text-stone-800 dark:hover:text-stone-200' : ''
          }`}
          onClick={isExpanded ? handleHeaderClick : undefined}
          title={isExpanded ? 'Click to collapse (Shift+click to fully collapse)' : ''}
        >
          <h3
            className={`text-sm font-medium tracking-wide uppercase transition-colors duration-200 ${
              isExpanded
                ? 'text-stone-600 dark:text-stone-300 group-hover:text-stone-800 dark:group-hover:text-stone-100'
                : 'text-stone-500 dark:text-stone-400'
            }`}
          >
            {node.title}
          </h3>
          <span className="text-sm text-stone-500 dark:text-stone-400 font-mono">
            {levelLabel}
          </span>
          {compressionRatio && compressionRatio > 1 && (
            <span className="text-sm text-stone-500 dark:text-stone-400 font-mono tabular-nums">
              {compressionRatio}x
            </span>
          )}
          {isExpanded && (
            <span className="text-sm text-stone-500 dark:text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
              ◂ collapse
            </span>
          )}
        </div>
      )}

      {/* Main content area with zoom bars on the left */}
      <div className="flex gap-3">
        {depth > 0 && (
          <div
            className={`w-6 shrink-0 flex justify-center pt-1 ${
              isExpanded ? 'cursor-pointer group/strip hover:bg-stone-200/40 dark:hover:bg-stone-700/30 rounded transition-colors' : ''
            }`}
            onClick={isExpanded ? () => {
              onFocusNode(node.id);
              onCollapse(node);
            } : undefined}
            title={isExpanded ? 'Click to collapse' : undefined}
          >
            <ZoomLevelBars
              currentLevel={nodeState.level}
              maxLevel={maxLevel}
              hasChildren={hasChildren}
              anyChildExpanded={anyChildExpanded}
              onClick={() => {
                onFocusNode(node.id);
                onCollapse(node);
              }}
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Zoom trail */}
          {showTrail && (
            <div className="pt-1 pb-1">
              <p className="text-stone-500 dark:text-stone-400 leading-snug line-clamp-1 italic" style={{ fontSize: '0.85em' }}>
                {trailText}
              </p>
            </div>
          )}

          {/* Regular content (not segmented) */}
          {!showSegmented && (
            <div
              className={`pb-4 ${depth === 0 ? 'pt-0' : 'pt-1'} transition-all duration-300 ease-in-out ${
                canExpand ? 'cursor-pointer' : ''
              } ${isFocused && nodeState.level === 0 ? 'ring-1 ring-stone-300/60 dark:ring-stone-600/40 ring-offset-2 ring-offset-stone-50 dark:ring-offset-stone-900 rounded' : ''}`}
              onClick={handleTextClick}
              title={canExpand ? 'Click to expand' : ''}
            >
              <div
                className={`leading-[1.7] text-stone-800 dark:text-stone-200 transition-all duration-300 ${
                  canExpand ? 'hover:text-stone-900 dark:hover:text-stone-100' : ''
                }`}
                style={{ fontSize: nodeState.level === 0 ? '1.1em' : '1em' }}
              >
                {renderMarkdownText(currentText)}
              </div>
              {canExpand && nodeState.level === 0 && (
                <div className="mt-1 text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1 opacity-70">
                  <span className="text-[0.65rem]">▸</span> click to expand
                </div>
              )}
            </div>
          )}

          {/* Segmented paragraph */}
          {showSegmented && (
            <div className="pb-4 pt-1 leading-[1.7] text-stone-800 dark:text-stone-200">
              <SegmentedParagraph
                text={currentText}
                children={node.children}
                getNodeState={getNodeState}
                onExpandChild={onExpandChild}
                onCollapseChild={onCollapseChild}
                onFocusNode={onFocusNode}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
