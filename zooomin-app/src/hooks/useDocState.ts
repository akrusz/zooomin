import { useState, useCallback } from 'react';
import type { ZoomDoc, ZoomNode, NodeState, DocState } from '../types/zoomdoc';

function getMaxLevel(node: ZoomNode): number {
  const keys = Object.keys(node.levels).map(Number);
  return Math.max(...keys);
}

function initState(node: ZoomNode, isRoot: boolean): DocState {
  const state: DocState = {};
  state[node.id] = { level: 0, expanded: isRoot };
  if (isRoot) {
    for (const child of node.children) {
      Object.assign(state, initChildState(child));
    }
  }
  return state;
}

function initChildState(node: ZoomNode): DocState {
  const state: DocState = {};
  state[node.id] = { level: 0, expanded: false };
  for (const child of node.children) {
    Object.assign(state, initChildState(child));
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

      // At max level with children → expand children
      if (node.children.length > 0 && !current.expanded) {
        const childStates: DocState = {};
        for (const child of node.children) {
          if (!prev[child.id]) {
            Object.assign(childStates, initChildState(child));
          }
        }
        return {
          ...prev,
          ...childStates,
          [node.id]: { ...current, expanded: true },
        };
      }

      return prev;
    });
  }, []);

  const collapseNode = useCallback((node: ZoomNode) => {
    setState(prev => {
      const current = prev[node.id] || { level: 0, expanded: false };

      // If children are expanded, collapse them first
      if (current.expanded) {
        const updates: DocState = { [node.id]: { ...current, expanded: false } };
        // Reset all descendants
        const resetDescendants = (n: ZoomNode) => {
          for (const child of n.children) {
            updates[child.id] = { level: 0, expanded: false };
            resetDescendants(child);
          }
        };
        resetDescendants(node);
        return { ...prev, ...updates };
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

  const getNodeState = useCallback((nodeId: string): NodeState => {
    return state[nodeId] || { level: 0, expanded: false };
  }, [state]);

  return { state, initialize, expandNode, collapseNode, collapseToZero, getNodeState };
}
