import type { ZoomNode } from '../types/zoomdoc';
import type { NodeState } from '../types/zoomdoc';

interface BreadcrumbProps {
  root: ZoomNode;
  getNodeState: (nodeId: string) => NodeState;
  onCollapseToZero: (node: ZoomNode) => void;
  onFocusNode: (id: string) => void;
}

function findExpandedPath(node: ZoomNode, getNodeState: (id: string) => NodeState): ZoomNode[] {
  const state = getNodeState(node.id);
  if (state.expanded && node.children.length > 0) {
    for (const child of node.children) {
      const childState = getNodeState(child.id);
      if (childState.expanded || childState.level > 0) {
        return [node, ...findExpandedPath(child, getNodeState)];
      }
    }
    return [node];
  }
  return state.level > 0 ? [node] : [];
}

export function Breadcrumb({ root, getNodeState, onCollapseToZero, onFocusNode }: BreadcrumbProps) {
  const path = findExpandedPath(root, getNodeState);

  if (path.length <= 1) return null;

  return (
    <div className="sticky top-0 z-10 backdrop-blur-md bg-stone-50/80 dark:bg-stone-900/80 border-b border-stone-200 dark:border-stone-700 px-4 py-2">
      <div className="max-w-prose mx-auto flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400 overflow-x-auto">
        {path.map((node, i) => (
          <span key={node.id} className="flex items-center gap-1.5 shrink-0">
            {i > 0 && <span className="text-stone-300 dark:text-stone-600">›</span>}
            <button
              onClick={() => {
                onCollapseToZero(node);
                onFocusNode(node.id);
              }}
              className="hover:text-amber-700 dark:hover:text-amber-400 transition-colors whitespace-nowrap"
            >
              {node.title}
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
