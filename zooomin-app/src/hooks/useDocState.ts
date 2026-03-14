import { useState, useCallback } from 'react';
import type { ZoomDoc, ZoomNode, NodeState, DocState } from '../types/zoomdoc';

function getMaxLevel(node: ZoomNode): number {
  const keys = Object.keys(node.levels).map(Number);
  return Math.max(...keys);
}

function initState(node: ZoomNode, isRoot: boolean): DocState {
  const state: DocState = {};
  state[node.id] = { level: 0, expanded: false };
  // Always init children recursively so they're ready
  for (const child of node.children) {
    Object.assign(state, initState(child, false));
  }
  if (isRoot) {
    state[node.id] = { level: 0, expanded: true };
  }
  return state;
}

export function useDocState() {
  const [state, setState] = useState<DocState>({});

  const initialize = useCallback((doc: ZoomDoc) => {
    setState(initState(doc.root, true));
  }, []);

  const expandNode = useCallback((node: ZoomNode) => {
    setState(prev => {
      const current = prev[node.id] || { level: 0, expanded: false };
      const maxLevel = getMaxLevel(node);

      if (current.level < maxLevel) {
        return {
          ...prev,
          [node.id]: { ...current, level: current.level + 1 },
        };
      }

      return prev;
    });
  }, []);

  /** Expand a specific child to its max level (used for segmented paragraph clicks) */
  const expandChild = useCallback((child: ZoomNode) => {
    setState(prev => {
      const current = prev[child.id] || { level: 0, expanded: false };
      const maxLevel = getMaxLevel(child);
      if (current.level < maxLevel) {
        return {
          ...prev,
          [child.id]: { ...current, level: current.level + 1 },
        };
      }
      return prev;
    });
  }, []);

  const collapseNode = useCallback((node: ZoomNode) => {
    setState(prev => {
      const current = prev[node.id] || { level: 0, expanded: false };

      // If any children are expanded, collapse them all first
      if (node.children.length > 0) {
        const anyChildExpanded = node.children.some(child => {
          const cs = prev[child.id];
          return cs && cs.level > 0;
        });
        if (anyChildExpanded) {
          const updates: DocState = {};
          const resetDescendants = (n: ZoomNode) => {
            for (const child of n.children) {
              updates[child.id] = { level: 0, expanded: false };
              resetDescendants(child);
            }
          };
          resetDescendants(node);
          return { ...prev, ...updates };
        }
      }

      // Otherwise step back one level
      if (current.level > 0) {
        return {
          ...prev,
          [node.id]: { ...current, level: current.level - 1 },
        };
      }

      return prev;
    });
  }, []);

  const collapseToZero = useCallback((node: ZoomNode) => {
    setState(prev => {
      const updates: DocState = { [node.id]: { level: 0, expanded: false } };
      const resetDescendants = (n: ZoomNode) => {
        for (const child of n.children) {
          updates[child.id] = { level: 0, expanded: false };
          resetDescendants(child);
        }
      };
      resetDescendants(node);
      return { ...prev, ...updates };
    });
  }, []);

  const collapseChild = useCallback((child: ZoomNode) => {
    setState(prev => {
      const updates: DocState = { [child.id]: { level: 0, expanded: false } };
      const resetDescendants = (n: ZoomNode) => {
        for (const c of n.children) {
          updates[c.id] = { level: 0, expanded: false };
          resetDescendants(c);
        }
      };
      resetDescendants(child);
      return { ...prev, ...updates };
    });
  }, []);

  const getNodeState = useCallback((nodeId: string): NodeState => {
    return state[nodeId] || { level: 0, expanded: false };
  }, [state]);

  return { state, initialize, expandNode, expandChild, collapseNode, collapseChild, collapseToZero, getNodeState };
}
