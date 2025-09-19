import {
  File,
  Folder,
  Tree,
  type TreeViewElement,
} from "~/common/components/magicui/file-tree";
import type { Route } from "./+types/private-code";
import { makeSSRClient } from "~/supa-client";
import { getLoggedInUserId } from "~/features/users/queries";
import { useState, useEffect, useCallback, useRef } from "react";
import { useFetcher } from "react-router";
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
  SidebarTrigger,
  SidebarHeader,
  SidebarContent,
} from "~/common/components/ui/sidebar";
import CodeMirror, { keymap } from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { Button } from "~/common/components/ui/button";
import { FilePlusIcon, FolderPlusIcon, SaveIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/common/components/ui/dropdown-menu";

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

export const action = async ({ request }: Route.ActionArgs) => {
  const { client } = makeSSRClient(request);
  const userId = await getLoggedInUserId(client);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  if (intent === "rename") {
    const idRaw = formData.get("id");
    const nameRaw = formData.get("name");
    if (!idRaw || !nameRaw) return { ok: false, error: "Missing fields" };
    const idNum = Number(idRaw);
    const newName = String(nameRaw).trim();
    if (!newName) return { ok: false, error: "Empty name" };

    const { data, error } = await client
      .from("files")
      .update({ name: newName })
      .eq("id", idNum)
      .eq("profile_id", userId)
      .select("id,name")
      .single();

    if (error) return { ok: false, error: error.message };
    return { ok: true, id: String(data.id), name: data.name };
  }

  if (intent === "create-folder") {
    const nameRaw = formData.get("name");
    if (!nameRaw) return { ok: false, error: "Missing name" };
    const newName = String(nameRaw).trim();
    if (!newName) return { ok: false, error: "Empty name" };

    const { data, error } = await client
      .from("files")
      .insert({
        name: newName,
        type: "folder",
        parent_id: null,
        profile_id: userId,
      })
      .select("id,name")
      .single();

    if (error) return { ok: false, error: error.message };
    return { ok: true, id: String(data.id), name: data.name };
  }

  return { ok: false, error: "Unsupported intent" };
};

export default function PrivateCode({ loaderData }: Route.ComponentProps) {
  const { elements } = loaderData as unknown as { elements: TreeViewElement[] };
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const contentFetcher = useFetcher<{ content: string }>();
  const renameFetcher = useFetcher<{
    ok: boolean;
    id?: string;
    name?: string;
    error?: string;
  }>();
  const [content, setContent] = useState<string>("");
  const [treeElements, setTreeElements] = useState<TreeViewElement[]>(elements);
  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctxPos, setCtxPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [ctxTarget, setCtxTarget] = useState<"empty" | "folder" | "file">(
    "empty"
  );
  const [renamingId, setRenamingId] = useState<string | undefined>(undefined);
  const [renamingValue, setRenamingValue] = useState<string>("");
  const [pendingRenameId, setPendingRenameId] = useState<string | undefined>(
    undefined
  );
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const openMenuAt = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setCtxPos({ x: clientX - rect.left, y: clientY - rect.top });
    setCtxOpen(true);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    contentFetcher.load(`/lessons/private-code-content/${selectedId}`);
    setContent(contentFetcher.data?.content ?? "");
  }, [selectedId]);

  function findNameById(
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

  useEffect(() => {
    setTreeElements(elements);
  }, [elements]);

  function updateNodeName(
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

  function removeNodeById(
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

  function startCreateRootFolder() {
    const draftId = `draft-folder-${Date.now()}`;
    setTreeElements((prev) => [
      { id: draftId, name: "", children: [] as TreeViewElement[] },
      ...prev,
    ]);
    setRenamingId(draftId);
    setRenamingValue("");
  }

  const createRootFetcher = useFetcher<{
    ok: boolean;
    id?: string;
    name?: string;
    error?: string;
  }>();

  function submitCreateRootFolder(name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      if (renamingId?.startsWith("draft-folder-")) {
        setTreeElements((prev) => removeNodeById(prev, renamingId));
      }
      setRenamingId(undefined);
      setRenamingValue("");
      return;
    }
    createRootFetcher.submit(
      { intent: "create-folder", name: trimmed },
      { method: "post" }
    );
  }

  useEffect(() => {
    if (createRootFetcher.state === "idle" && createRootFetcher.data?.ok) {
      const { id, name } = createRootFetcher.data;
      if (id && name && renamingId?.startsWith("draft-folder-")) {
        setTreeElements((prev) => updateNodeName(prev, renamingId, name));
        // replace draft id with real id
        setTreeElements((prev) =>
          prev.map((node) =>
            node.id === renamingId
              ? { ...node, id }
              : {
                  ...node,
                  children: Array.isArray(node.children)
                    ? node.children!.map((c) => c)
                    : node.children,
                }
          )
        );
        setRenamingId(undefined);
        setRenamingValue("");
      }
    }
  }, [createRootFetcher.state, createRootFetcher.data, renamingId]);

  function submitRename(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      setRenamingId(undefined);
      return;
    }
    renameFetcher.submit(
      { intent: "rename", id, name: trimmed },
      { method: "post" }
    );
  }

  useEffect(() => {
    if (renameFetcher.state === "idle" && renameFetcher.data?.ok) {
      const { id, name } = renameFetcher.data;
      if (id && name) {
        setTreeElements((prev) => updateNodeName(prev, id, name));
        setRenamingId(undefined);
        setRenamingValue("");
      }
    }
  }, [renameFetcher.state, renameFetcher.data]);

  // Start rename only after context menu closes to avoid focus being stolen
  useEffect(() => {
    if (!ctxOpen && pendingRenameId) {
      const currentName = findNameById(treeElements, pendingRenameId) ?? "";
      setRenamingId(pendingRenameId);
      setRenamingValue(currentName);
      setPendingRenameId(undefined);
    }
  }, [ctxOpen, pendingRenameId, treeElements]);

  function renderTree(nodes: TreeViewElement[]) {
    return nodes.map((node) => {
      const hasChildren = Array.isArray(node.children);
      if (hasChildren) {
        return (
          <Folder
            key={node.id}
            element={
              renamingId === node.id ? (
                <input
                  className="h-6 rounded border px-1 text-xs"
                  value={renamingValue}
                  placeholder={node.name}
                  onChange={(e) => setRenamingValue(e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (renamingId?.startsWith("draft-folder-")) {
                        submitCreateRootFolder(renamingValue);
                      } else if (renamingId) {
                        submitRename(renamingId, renamingValue);
                      }
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      if (renamingId?.startsWith("draft-folder-")) {
                        setTreeElements((prev) =>
                          removeNodeById(prev, renamingId)
                        );
                      }
                      setRenamingId(undefined);
                    }
                  }}
                />
              ) : (
                node.name
              )
            }
            value={node.id}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation?.();
              console.log("context menu");
              console.log(node.id);
              setSelectedId(node.id);
              setCtxTarget("folder");
              openMenuAt(e.clientX, e.clientY);
            }}
          >
            {renderTree(node.children!)}
          </Folder>
        );
      }
      return (
        <File
          key={node.id}
          value={node.id}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation?.();
            setSelectedId(node.id);
            setCtxTarget("file");
            openMenuAt(e.clientX, e.clientY);
          }}
        >
          {renamingId === node.id ? (
            <input
              className="h-6 rounded border px-1 text-xs"
              value={renamingValue}
              placeholder={node.name}
              onChange={(e) => setRenamingValue(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (renamingId?.startsWith("draft-folder-")) {
                    const next = renamingValue.trim();
                    if (!next) {
                      setTreeElements((prev) =>
                        removeNodeById(prev, renamingId)
                      );
                    } else {
                      setTreeElements((prev) =>
                        updateNodeName(prev, renamingId!, next)
                      );
                    }
                    setRenamingId(undefined);
                    setRenamingValue("");
                  } else if (renamingId) {
                    submitRename(renamingId, renamingValue);
                  }
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  if (renamingId?.startsWith("draft-folder-")) {
                    setTreeElements((prev) => removeNodeById(prev, renamingId));
                  }
                  setRenamingId(undefined);
                }
              }}
            />
          ) : (
            <p>{node.name}</p>
          )}
        </File>
      );
    });
  }

  // Left click is intentionally ignored for context menu

  const handleEmptyAreaContextMenu = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      const target = e.target as HTMLElement;
      const clickedInteractive = target.closest(
        "button, [role='button'], [data-radix-accordion-trigger]"
      );
      if (clickedInteractive) return;

      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      setSelectedId(undefined);
      setCtxTarget("empty");
      setCtxPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setCtxOpen(true);
    },
    []
  );

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="pt-20 px-2 text-xs font-medium flex items-center justify-between">
            <div>Files</div>
          </div>
        </SidebarHeader>
        <SidebarContent className="h-full">
          <div
            ref={containerRef}
            className="relative h-full"
            onContextMenu={handleEmptyAreaContextMenu}
          >
            <DropdownMenu open={ctxOpen} onOpenChange={setCtxOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  ref={triggerRef}
                  style={{
                    position: "absolute",
                    left: ctxPos.x,
                    top: ctxPos.y,
                    width: 1,
                    height: 1,
                    opacity: 0,
                    pointerEvents: ctxOpen ? "auto" : "none",
                  }}
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {ctxTarget === "empty" && (
                  <>
                    <DropdownMenuItem
                      onClick={() => {
                        startCreateRootFolder();
                        setCtxOpen(false);
                      }}
                    >
                      새폴더
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        console.log(selectedId, "새파일");
                        setCtxOpen(false);
                      }}
                    >
                      새파일
                    </DropdownMenuItem>
                  </>
                )}

                {ctxTarget === "folder" && (
                  <>
                    <DropdownMenuItem
                      onClick={() => {
                        if (selectedId) setPendingRenameId(selectedId);
                        setCtxOpen(false);
                      }}
                    >
                      이름바꾸기
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => {
                        console.log(selectedId, "삭제");
                        setCtxOpen(false);
                      }}
                    >
                      삭제
                    </DropdownMenuItem>
                  </>
                )}

                {ctxTarget === "file" && (
                  <>
                    <DropdownMenuItem
                      onClick={() => {
                        if (selectedId) setPendingRenameId(selectedId);
                        setCtxOpen(false);
                      }}
                    >
                      이름바꾸기
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => {
                        console.log(selectedId, "삭제");
                        setCtxOpen(false);
                      }}
                    >
                      삭제
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Tree
              className="overflow-hidden rounded-md bg-background p-2"
              initialSelectedId="7"
              initialExpandedItems={
                [
                  // "1",
                  // "2",
                  // "3",
                  // ...
                ]
              }
              elements={treeElements}
              onSelectedChange={setSelectedId}
            >
              {renderTree(treeElements)}
            </Tree>
          </div>
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <div className="flex items-center gap-2 border-b p-3">
          <SidebarTrigger />
          <div className="truncate text-sm text-muted-foreground">
            {selectedId ? `File #${selectedId}` : "파일을 선택하세요"}
          </div>
        </div>

        <div className="p-4">
          <div className="w-full whitespace-pre-wrap text-sm text-muted-foreground">
            {contentFetcher.state === "loading"
              ? "Loading..."
              : contentFetcher.data?.content && (
                  <CodeMirror
                    value={contentFetcher.data.content}
                    height="400px"
                    onChange={(value) => setContent(value)}
                    basicSetup={{
                      lineNumbers: true,
                      highlightActiveLine: true,
                      highlightActiveLineGutter: true,
                      indentOnInput: true,
                    }}
                    theme="light"
                    style={{ border: "1px solid #ddd" }}
                    extensions={[python()]}
                  />
                )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
