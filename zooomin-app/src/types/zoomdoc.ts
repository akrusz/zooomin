export interface ZoomDocMeta {
  title: string;
  author: string;
  version: string;
  zoomdoc_version: string;
  created: string;
  source_format: string;
  description?: string;
}

export interface ZoomNode {
  id: string;
  title: string;
  levels: Record<string, string>;
  children: ZoomNode[];
}

export interface ZoomDoc {
  meta: ZoomDocMeta;
  root: ZoomNode;
}

export interface NodeState {
  level: number;
  expanded: boolean; // whether children are shown
}

export type DocState = Record<string, NodeState>;
