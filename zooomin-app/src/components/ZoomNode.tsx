import type { ZoomNode as ZoomNodeType } from '../types/zoomdoc';
import type { NodeState } from '../types/zoomdoc';

interface ZoomNodeProps {
  node: ZoomNodeType;
  nodeState: NodeState;
  depth: number;
  onExpand: (node: ZoomNodeType) => void;
  onCollapse: (node: ZoomNodeType) => void;
  onCollapseToZero: (node: ZoomNodeType) => void;
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

/** Total words in the full-depth content of a node and all its descendants */
function getTotalWords(node: ZoomNodeType): number {
  const maxLevel = getMaxLevel(node);
  const ownWords = wordCount(node.levels[String(maxLevel)] || '');
  const childWords = node.children.reduce((sum, child) => sum + getTotalWords(child), 0);
  // If node has children, total = children's total (since expanding replaces the node text)
  // If leaf, total = own max level words
  return node.children.length > 0 ? Math.max(ownWords, childWords) : ownWords;
}

/** Compression ratio: how much is being compressed at the current view */
function getCompressionRatio(node: ZoomNodeType, currentLevel: number, childrenExpanded: boolean): number | null {
  const totalWords = getTotalWords(node);
  if (childrenExpanded) return null; // children are shown, no single compression number
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

function renderMarkdownText(text: string) {
  return text.split('\n\n').map((paragraph, i) => {
    if (paragraph.startsWith('## ')) {
      return (
        <h4 key={i} className="text-base font-semibold text-stone-700 dark:text-stone-300 mt-6 mb-2">
          {paragraph.replace('## ', '')}
        </h4>
      );
    }
    if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
      return (
        <h4 key={i} className="text-base font-semibold text-stone-700 dark:text-stone-300 mt-5 mb-2">
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
                  <span className="text-stone-400 shrink-0">•</span>
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

/** Vertical bar indicator showing current zoom level vs total available levels */
function ZoomLevelBars({ currentLevel, maxLevel, hasChildren, childrenExpanded }: {
  currentLevel: number;
  maxLevel: number;
  hasChildren: boolean;
  childrenExpanded: boolean;
}) {
  // Total "steps": each zoom level + 1 more if it has expandable children
  const totalSteps = maxLevel + (hasChildren ? 1 : 0);
  const filledSteps = childrenExpanded ? totalSteps : currentLevel;

  if (totalSteps === 0) return null;

  return (
    <div className="flex flex-col items-center gap-[3px] py-1 shrink-0" title={`Level ${currentLevel} of ${maxLevel}${hasChildren ? ' + sections' : ''}`}>
      {Array.from({ length: totalSteps + 1 }, (_, i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full transition-all duration-300 ${
            i <= filledSteps
              ? 'h-[10px] bg-stone-400 dark:bg-stone-500'
              : 'h-[10px] bg-stone-200 dark:bg-stone-700'
          }`}
        />
      ))}
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
  getNodeState,
  focusedId,
  onFocusNode,
}: ZoomNodeProps) {
  const maxLevel = getMaxLevel(node);
  const isAtMax = nodeState.level >= maxLevel;
  const hasChildren = node.children.length > 0;
  const canExpand = !isAtMax || (hasChildren && !nodeState.expanded);
  const isFocused = focusedId === node.id;

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
  const compressionRatio = getCompressionRatio(node, nodeState.level, nodeState.expanded);

  const showChildren = nodeState.expanded && hasChildren;

  // Zoom trail — show level 0 as context when deeper
  const showTrail = nodeState.level > 0 && !showChildren;
  const trailText = node.levels['0'] || '';

  // Text sizing: level 0 is slightly larger (scannable), deeper levels are normal reading size
  const textSizeClass = nodeState.level === 0
    ? 'text-[1.1rem] leading-relaxed'
    : 'text-base leading-[1.7]';

  const textColorClass = 'text-stone-800 dark:text-stone-200';

  return (
    <div
      className="transition-all duration-300 ease-in-out"
      data-node-id={node.id}
    >
      {/* Header */}
      {depth > 0 && (
        <div
          className={`flex items-center gap-2 px-2 pt-3 pb-1 cursor-pointer select-none group ${
            nodeState.level > 0 || nodeState.expanded ? 'hover:text-stone-700 dark:hover:text-stone-300' : ''
          }`}
          onClick={handleHeaderClick}
          title={nodeState.level > 0 || nodeState.expanded ? 'Click to collapse (Shift+click to collapse fully)' : ''}
        >
          <h3
            className={`text-sm font-medium tracking-wide uppercase transition-colors duration-200 ${
              nodeState.level > 0 || nodeState.expanded
                ? 'text-stone-500 dark:text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-300'
                : 'text-stone-400 dark:text-stone-500'
            }`}
          >
            {node.title}
          </h3>
          <span className="text-xs text-stone-400 dark:text-stone-500 font-mono">
            {showChildren ? 'sections' : levelLabel}
          </span>
          {compressionRatio && compressionRatio > 1 && (
            <span className="text-xs text-stone-400 dark:text-stone-500 font-mono tabular-nums">
              {compressionRatio}x
            </span>
          )}
          {(nodeState.level > 0 || nodeState.expanded) && (
            <span className="text-xs text-stone-400 dark:text-stone-500 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
              collapse
            </span>
          )}
        </div>
      )}

      {/* Main content area with zoom bars on the left */}
      <div className="flex gap-3">
        {/* Zoom level indicator bars */}
        {depth > 0 && (
          <div className="pl-2 pt-1 shrink-0">
            <ZoomLevelBars
              currentLevel={nodeState.level}
              maxLevel={maxLevel}
              hasChildren={hasChildren}
              childrenExpanded={nodeState.expanded}
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Zoom trail — faded level 0 as context */}
          {showTrail && (
            <div className="pt-1 pb-1">
              <p className="text-sm text-stone-400 dark:text-stone-500 leading-snug line-clamp-1 italic">
                {trailText}
              </p>
            </div>
          )}

          {/* Content */}
          {!showChildren && (
            <div
              className={`pb-4 ${depth === 0 ? 'pt-0' : 'pt-1'} transition-all duration-300 ease-in-out ${
                canExpand ? 'cursor-pointer' : ''
              } ${isFocused ? 'ring-1 ring-stone-300/60 dark:ring-stone-600/40 ring-offset-2 ring-offset-stone-50 dark:ring-offset-stone-900 rounded' : ''}`}
              onClick={handleTextClick}
              title={canExpand ? 'Click to expand' : ''}
            >
              <div
                className={`${textSizeClass} ${textColorClass} transition-all duration-300 ${
                  canExpand ? 'hover:text-stone-900 dark:hover:text-stone-100' : ''
                }`}
              >
                {renderMarkdownText(currentText)}
              </div>
              {canExpand && nodeState.level === 0 && (
                <div className="mt-1 text-xs text-stone-400 dark:text-stone-500 flex items-center gap-1 opacity-60">
                  <span className="text-[0.65rem]">▸</span> click to expand
                </div>
              )}
            </div>
          )}

          {/* Children */}
          {showChildren && (
            <div className="pt-1 pb-2">
              {/* Parent context */}
              <div className="pb-2">
                <p className="text-sm text-stone-400 dark:text-stone-500 leading-snug line-clamp-1 italic">
                  {node.levels['0']}
                </p>
              </div>
              <div className="space-y-1">
                {node.children.map(child => (
                  <ZoomNodeComponent
                    key={child.id}
                    node={child}
                    nodeState={getNodeState(child.id)}
                    depth={depth + 1}
                    onExpand={onExpand}
                    onCollapse={onCollapse}
                    onCollapseToZero={onCollapseToZero}
                    getNodeState={getNodeState}
                    focusedId={focusedId}
                    onFocusNode={onFocusNode}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
