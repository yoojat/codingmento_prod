import type { TreeViewElement } from "~/common/components/magicui/file-tree";

export interface DbFileRow {
  id: string | number;
  name: string;
  type: string;
  parent_id: string | number | null;
}

export function toTreeElements(rows: DbFileRow[]): TreeViewElement[] {
  const nodes = new Map<string, TreeViewElement>();

  rows.forEach((row) => {
    const id = String(row.id);
    const isFolder = row.type === "folder";
    const existing = nodes.get(id);
    if (existing) {
      existing.name = row.name;
      if (isFolder && !existing.children) existing.children = [];
      return;
    }
    nodes.set(id, {
      id,
      name: row.name,
      ...(isFolder ? { children: [] as TreeViewElement[] } : {}),
    });
  });

  const hasParent = new Set<string>();
  rows.forEach((row) => {
    if (row.parent_id == null) return;
    const id = String(row.id);
    const parentId = String(row.parent_id);
    const parent = nodes.get(parentId);
    if (parent) {
      if (!parent.children) parent.children = [];
      parent.children.push(nodes.get(id)!);
      hasParent.add(id);
    }
  });

  const roots: TreeViewElement[] = [];
  rows.forEach((row) => {
    const id = String(row.id);
    if (
      !hasParent.has(id) &&
      (row.parent_id == null || !nodes.has(String(row.parent_id)))
    ) {
      const node = nodes.get(id);
      if (node) roots.push(node);
    }
  });

  const sortNodes = (arr: TreeViewElement[]) => {
    arr.sort((a, b) => {
      const aFolder = Array.isArray(a.children);
      const bFolder = Array.isArray(b.children);
      if (aFolder !== bFolder) return aFolder ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    arr.forEach((n) => n.children && sortNodes(n.children));
  };
  sortNodes(roots);

  return roots;
}

export function findNameById(
  nodes: TreeViewElement[],
  id: string
): string | undefined {
  for (const node of nodes) {
    if (node.id === id) return node.name as string;
    if (node.children) {
      const res = findNameById(node.children, id);
      if (res) return res;
    }
  }
  return undefined;
}

export function updateNodeName(
  nodes: TreeViewElement[],
  id: string,
  newName: string
): TreeViewElement[] {
  return nodes.map((node) => {
    if (node.id === id) {
      return { ...node, name: newName };
    }
    if (node.children && node.children.length > 0) {
      return {
        ...node,
        children: updateNodeName(node.children, id, newName),
      };
    }
    return node;
  });
}

export function removeNodeById(
  nodes: TreeViewElement[],
  id: string
): TreeViewElement[] {
  return nodes
    .map((node) =>
      Array.isArray(node.children)
        ? { ...node, children: removeNodeById(node.children, id) }
        : node
    )
    .filter((n) => n.id !== id);
}

export function addDraftChildAtTop(
  nodes: TreeViewElement[],
  parentId: string,
  draftId: string,
  isFile: boolean
): TreeViewElement[] {
  return nodes.map((node) => {
    if (node.id === parentId) {
      const children = Array.isArray(node.children) ? node.children : [];
      const draft: TreeViewElement = isFile
        ? { id: draftId, name: "" }
        : { id: draftId, name: "", children: [] as TreeViewElement[] };
      const result = {
        ...node,
        children: [draft, ...children],
      };
      return result;
    }
    if (Array.isArray(node.children)) {
      return {
        ...node,
        children: addDraftChildAtTop(node.children, parentId, draftId, isFile),
      };
    }
    return node;
  });
}

export function collectAncestorIds(
  nodes: TreeViewElement[],
  targetId: string,
  path: string[] = []
): string[] {
  for (const node of nodes) {
    const next = [...path, node.id];
    if (node.id === targetId) return next;
    if (Array.isArray(node.children)) {
      const found = collectAncestorIds(node.children, targetId, next);
      if (found.length) return found;
    }
  }
  return [];
}
