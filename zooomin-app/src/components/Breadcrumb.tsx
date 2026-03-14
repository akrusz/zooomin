import type { ZoomNode } from '../types/zoomdoc';
import type { NodeState } from '../types/zoomdoc';

interface BreadcrumbProps {
  root: ZoomNode;
  getNodeState: (nodeId: string) => NodeState;
  onCollapseToZero: (node: ZoomNode) => void;
  onFocusNode: (id: string) => void;
}

function getMaxLevel(node: ZoomNode): number {
  return Math.max(...Object.keys(node.levels).map(Number));
}

function findExpandedPath(node: ZoomNode, getNodeState: (id: string) => NodeState): ZoomNode[] {
  const state = getNodeState(node.id);
  if (state.level > 0 || node.children.length > 0) {
    // Check if at max level with children — look for expanded children
    const maxLevel = getMaxLevel(node);
    if (state.level >= maxLevel && node.children.length > 0) {
      for (const child of node.children) {
        const childState = getNodeState(child.id);
        if (childState.level > 0) {
          return [node, ...findExpandedPath(child, getNodeState)];
        }
      }
    }
    return state.level > 0 ? [node] : [];
  }
  return [];
}

export function Breadcrumb({ root, getNodeState, onCollapseToZero, onFocusNode }: BreadcrumbProps) {
  const path = findExpandedPath(root, getNodeState);

  if (path.length <= 1) return null;

  return (
    <div className="sticky top-0 z-10 backdrop-blur-md bg-stone-50/80 dark:bg-stone-900/80 border-b border-stone-200 dark:border-stone-700 px-4 py-2">
      <div className="max-w-4xl mx-auto flex items-center gap-1.5 text-sm text-stone-600 dark:text-stone-300 overflow-x-auto">
        {path.map((node, i) => (
          <span key={node.id} className="flex items-center gap-1.5 shrink-0">
            {i > 0 && <span className="text-stone-400 dark:text-stone-500">›</span>}
            <button
              onClick={() => {
                onCollapseToZero(node);
                onFocusNode(node.id);
              }}
              className="hover:text-stone-800 dark:hover:text-stone-100 transition-colors whitespace-nowrap"
            >
              {node.title}
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
