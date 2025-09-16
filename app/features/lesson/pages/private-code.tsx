import {
  File,
  Folder,
  Tree,
  type TreeViewElement,
} from "~/common/components/magicui/file-tree";
import type { Route } from "./+types/private-code";
import { makeSSRClient } from "~/supa-client";
import { getLoggedInUserId } from "~/features/users/queries";
import { useState, useEffect } from "react";
import { useFetcher } from "react-router";
// import { data } from "react-router";

const ELEMENTS = [
  {
    id: "1",
    name: "src",
    children: [
      {
        id: "2",
        name: "app",
        children: [
          {
            id: "3",
            name: "layout.tsx",
          },
          {
            id: "4",
            name: "page.tsx",
          },
        ],
      },
      {
        id: "5",
        name: "components",
        children: [
          {
            id: "6",

            name: "header.tsx",
          },
          {
            id: "7",
            name: "footer.tsx",
          },
        ],
      },
      {
        id: "8",
        name: "lib",
        children: [
          {
            id: "9",
            name: "utils.ts",
          },
        ],
      },
    ],
  },
];

function toTreeElements(
  rows: Array<{
    id: string | number;
    name: string;
    type: string;
    parent_id: string | number | null;
  }>
): TreeViewElement[] {
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

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const { client } = makeSSRClient(request);
  const userId = await getLoggedInUserId(client);

  // const fileId = Number(params.fileId);

  // if (!fileId || Number.isNaN(fileId)) {
  //   throw data({ message: "Invalid file id" }, { status: 400 });
  // }

  const { data: files, error: fileError } = await client
    .from("files")
    .select("id,name,type,parent_id,path")
    .eq("profile_id", userId)
    .order("updated_at", { ascending: false });
  if (fileError) throw new Error(fileError.message);

  return {
    files: files ?? [],
    elements: toTreeElements(files ?? []),
  };
};

export default function PrivateCode({ loaderData }: Route.ComponentProps) {
  const { elements } = loaderData as unknown as { elements: TreeViewElement[] };
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const contentFetcher = useFetcher<{ content: string }>();

  useEffect(() => {
    if (!selectedId) return;
    contentFetcher.load(`/lessons/private-code-content/${selectedId}`);
  }, [selectedId]);

  function renderTree(nodes: TreeViewElement[]) {
    return nodes.map((node) => {
      const hasChildren = node.children && node.children.length > 0;
      if (hasChildren) {
        return (
          <Folder key={node.id} element={node.name} value={node.id}>
            {renderTree(node.children!)}
          </Folder>
        );
      }
      return (
        <File key={node.id} value={node.id}>
          <p>{node.name}</p>
        </File>
      );
    });
  }

  return (
    <div className="relative flex h-[300px] w-1/2 flex-col items-center justify-center overflow-hidden rounded-lg border bg-background">
      <p>Selected ID: {selectedId}</p>
      <Tree
        className="overflow-hidden rounded-md bg-background p-2"
        initialSelectedId="7"
        initialExpandedItems={
          [
            // "1",
            // "2",
            // "3",
            // "4",
            // "5",
            // "6",
            // "7",
            // "8",
            // "9",
            // "10",
            // "11",
          ]
        }
        elements={elements}
        onSelectedChange={setSelectedId}
      >
        {renderTree(elements)}
      </Tree>
      <div>{contentFetcher.data?.content}</div>
    </div>
  );
}
