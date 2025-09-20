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
import { useSkulptRunner } from "~/hooks/use-skulpt-runner";
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
  if (intent === "delete-folder") {
    const idRaw = formData.get("id");
    if (!idRaw) return { ok: false, error: "Missing id" };
    const rootId = Number(idRaw);

    // Load all files/folders for this user to compute descendants
    const { data: all, error: se } = await client
      .from("files")
      .select("id,parent_id,type,profile_id")
      .eq("profile_id", userId);
    if (se) return { ok: false, error: se.message };

    const idToNode = new Map<
      number,
      { id: number; parent_id: number | null; type: string }
    >();
    for (const row of all ?? []) {
      idToNode.set(Number(row.id), {
        id: Number(row.id),
        parent_id: row.parent_id == null ? null : Number(row.parent_id),
        type: String(row.type),
      });
    }

    const toDelete: number[] = [];
    function collect(id: number) {
      toDelete.push(id);
      for (const n of idToNode.values()) {
        if (n.parent_id === id) collect(n.id);
      }
    }
    collect(rootId);

    const fileIds = toDelete.filter((id) => idToNode.get(id)?.type === "file");

    if (fileIds.length) {
      // delete related contents first
      const { error: ce } = await client
        .from("file_contents")
        .delete()
        .in("id", fileIds);
      if (ce) return { ok: false, error: ce.message };
    }

    const { error: fe } = await client
      .from("files")
      .delete()
      .in("id", toDelete)
      .eq("profile_id", userId);
    if (fe) return { ok: false, error: fe.message };

    return { ok: true, id: String(rootId) };
  }
  if (intent === "delete") {
    const idRaw = formData.get("id");
    if (!idRaw) return { ok: false, error: "Missing id" };
    const idNum = Number(idRaw);

    // First delete file_contents (FK id references files.id) then delete file
    const { error: ce } = await client
      .from("file_contents")
      .delete()
      .eq("id", idNum);
    if (ce) {
      // If no file_contents row existed, it's fine; continue
      if (ce.code !== "PGRST116" /* No rows deleted */) {
        // Ignore code check if not present; proceed anyway
      }
    }

    const { error: fe } = await client
      .from("files")
      .delete()
      .eq("id", idNum)
      .eq("profile_id", userId)
      .eq("type", "file");
    if (fe) return { ok: false, error: fe.message };
    return { ok: true, id: String(idNum) };
  }
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

  if (intent === "create-file") {
    const nameRaw = formData.get("name");
    const parentIdRaw = formData.get("parentId");
    if (!nameRaw) return { ok: false, error: "Missing name" };
    const newName = String(nameRaw).trim();
    if (!newName) return { ok: false, error: "Empty name" };
    const parentId = parentIdRaw ? Number(parentIdRaw) : null;
    const { data, error } = await client
      .from("files")
      .insert({
        name: newName,
        type: "file",
        parent_id: parentId,
        profile_id: userId,
      })
      .select("id,name,parent_id")
      .single();

    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      id: String(data.id),
      name: data.name,
      parentId: data.parent_id == null ? null : String(data.parent_id),
    };
  }

  if (intent === "create-folder") {
    const nameRaw = formData.get("name");
    const parentIdRaw = formData.get("parentId");
    if (!nameRaw) return { ok: false, error: "Missing name" };
    const newName = String(nameRaw).trim();
    if (!newName) return { ok: false, error: "Empty name" };
    const parentId = parentIdRaw ? Number(parentIdRaw) : null;

    const { data, error } = await client
      .from("files")
      .insert({
        name: newName,
        type: "folder",
        parent_id: parentId,
        profile_id: userId,
      })
      .select("id,name,parent_id")
      .single();

    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      id: String(data.id),
      name: data.name,
      parentId: data.parent_id == null ? null : String(data.parent_id),
    };
  }

  if (intent === "save-content") {
    const idRaw = formData.get("id");
    const contentRaw = formData.get("content");
    if (!idRaw) return { ok: false, error: "Missing id" };
    const idNum = Number(idRaw);
    const contentStr = typeof contentRaw === "string" ? contentRaw : "";

    const { error } = await client
      .from("file_contents")
      .upsert({ id: idNum, content: contentStr }, { onConflict: "id" });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  return { ok: false, error: "Unsupported intent" };
};

export default function PrivateCode({ loaderData }: Route.ComponentProps) {
  const { elements } = loaderData as unknown as { elements: TreeViewElement[] };
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const contentFetcher = useFetcher<{ content: string; name: string }>();
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
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const [ctxTargetId, setCtxTargetId] = useState<string | undefined>(undefined);
  const deleteFetcher = useFetcher<{
    ok: boolean;
    id?: string;
    error?: string;
  }>();
  const deleteFolderFetcher = useFetcher<{
    ok: boolean;
    id?: string;
    error?: string;
  }>();
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [treeKey, setTreeKey] = useState(0);
  const [selectedName, setSelectedName] = useState<string>("");
  const saveFetcher = useFetcher<{ ok: boolean; error?: string }>();
  const [saveInfo, setSaveInfo] = useState<string>("");
  const { loaded, error: skError, output, run, canvasRef } = useSkulptRunner();

  function collectAncestorIds(
    nodes: TreeViewElement[],
    targetId: string,
    path: string[] = []
  ): string[] {
    for (const node of nodes) {
      const next = [...path, node.id];
      if (node.id === targetId) return next; // 루트→타겟 경로
      if (Array.isArray(node.children)) {
        const found = collectAncestorIds(node.children, targetId, next);
        if (found.length) return found;
      }
    }
    return [];
  }

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
  }, [selectedId]);

  useEffect(() => {
    if (contentFetcher.state === "idle" && contentFetcher.data) {
      setContent(contentFetcher.data.content ?? "");
      setSelectedName(contentFetcher.data.name ?? "");
    }
  }, [contentFetcher.state, contentFetcher.data]);

  useEffect(() => {
    function isHiddenByAria(el: HTMLElement | null): boolean {
      let cur: HTMLElement | null = el;
      while (cur) {
        const ariaHidden = cur.getAttribute("aria-hidden");
        const dataAriaHidden = cur.getAttribute("data-aria-hidden");
        if (ariaHidden === "true" || dataAriaHidden === "true") return true;
        cur = cur.parentElement;
      }
      return false;
    }

    function focusWhenVisible(retries = 10) {
      if (!renamingId || ctxOpen) return;
      const el = renameInputRef.current;
      if (!el) {
        if (retries > 0)
          requestAnimationFrame(() => focusWhenVisible(retries - 1));
        return;
      }
      if (isHiddenByAria(el)) {
        if (retries > 0) setTimeout(() => focusWhenVisible(retries - 1), 50);
        return;
      }
      el.focus();
      el.select?.();
    }

    if (renamingId && !ctxOpen) focusWhenVisible();
  }, [renamingId, ctxOpen]);

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
  // function startCreateChildFolder(parentId: string) {
  //   const draftId = `draft-folder-${Date.now()}`;
  //   setTreeElements((prev) => {
  //     const sample = addDraftChildAtTop(prev, parentId, draftId, false);
  //     return sample;
  //   });
  //   setRenamingValue("");
  //   setDraftParentId(parentId);
  //   setPendingRenameId(undefined); // 충돌 방지
  //   setTimeout(() => setRenamingId(draftId), 0);
  // }

  // FIXME
  function startCreateRootFolder() {
    const draftId = `draft-folder-${Date.now()}`;
    setTreeElements((prev) => [
      { id: draftId, name: "zzzz", children: [] as TreeViewElement[] },
      ...prev,
    ]);
    setRenamingValue("");
    setTimeout(() => setRenamingId(draftId), 0);
  }

  function startCreateRootFileBottom() {
    const draftId = `draft-file-${Date.now()}`;
    setTreeElements((prev) => [...prev, { id: draftId, name: "" }]);
    setRenamingValue("");
    setTimeout(() => setRenamingId(draftId), 0);
  }

  function addDraftChildAtTop(
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
          children: addDraftChildAtTop(
            node.children,
            parentId,
            draftId,
            isFile
          ),
        };
      }
      return node;
    });
  }

  function startCreateChildFolder(parentId: string) {
    const draftId = `draft-folder-${Date.now()}`;
    setTreeElements((prev) => {
      const sample = addDraftChildAtTop(prev, parentId, draftId, false);
      return sample;
    });
    setRenamingValue("");
    setDraftParentId(parentId);
    setPendingRenameId(undefined); // 충돌 방지
    setTimeout(() => setRenamingId(draftId), 0);
  }

  function startCreateChildFile(parentId: string) {
    const draftId = `draft-file-${Date.now()}`;
    setTreeElements((prev) =>
      addDraftChildAtTop(prev, parentId, draftId, true)
    );
    setRenamingValue("");
    setDraftParentId(parentId);
    setPendingRenameId(undefined); // 충돌 방지
    setTimeout(() => setRenamingId(draftId), 0);
  }

  const createRootFetcher = useFetcher<{
    ok: boolean;
    id?: string;
    name?: string;
    error?: string;
  }>();

  const [draftParentId, setDraftParentId] = useState<string | null>(null);

  function submitCreateFolder(name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      if (renamingId?.startsWith("draft-folder-")) {
        setTreeElements((prev) => removeNodeById(prev, renamingId));
      }
      setRenamingId(undefined);
      setRenamingValue("");
      setPendingRenameId(undefined);
      return;
    }
    createRootFetcher.submit(
      { intent: "create-folder", name: trimmed, parentId: draftParentId ?? "" },
      { method: "post" }
    );
  }

  function submitCreateFile(name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      if (renamingId?.startsWith("draft-file-")) {
        setTreeElements((prev) => removeNodeById(prev, renamingId));
      }
      setRenamingId(undefined);
      setRenamingValue("");
      return;
    }
    createRootFetcher.submit(
      { intent: "create-file", name: trimmed, parentId: draftParentId ?? "" },
      { method: "post" }
    );
  }

  function submitDelete(id: string) {
    deleteFetcher.submit({ intent: "delete", id }, { method: "post" });
  }

  function submitDeleteFolder(id: string) {
    deleteFolderFetcher.submit(
      { intent: "delete-folder", id },
      { method: "post" }
    );
  }

  function submitSave() {
    if (!selectedId) return;
    saveFetcher.submit(
      { intent: "save-content", id: selectedId, content },
      { method: "post" }
    );
  }

  const isSaving = saveFetcher.state !== "idle";

  useEffect(() => {
    if (saveFetcher.state === "idle" && saveFetcher.data) {
      if (saveFetcher.data.ok) {
        setSaveInfo("저장 완료");
      } else {
        setSaveInfo(
          `저장 실패${
            saveFetcher.data.error ? `: ${saveFetcher.data.error}` : ""
          }`
        );
      }
      const t = setTimeout(() => setSaveInfo(""), 1500);
      return () => clearTimeout(t);
    }
  }, [saveFetcher.state, saveFetcher.data]);

  useEffect(() => {
    if (createRootFetcher.state === "idle" && createRootFetcher.data?.ok) {
      const { id, name } = createRootFetcher.data;
      if (id && name && renamingId?.startsWith("draft-folder-")) {
        setTreeElements((prev) => {
          const result = updateNodeName(prev, renamingId, name);
          return result;
        });
        // setTreeElements((prev) => {
        //   console.log({ renamingId });
        //   const result = prev.map((node) =>
        //     node.id === renamingId
        //       ? { ...node, id }
        //       : {
        //           ...node,
        //           children: Array.isArray(node.children)
        //             ? node.children!.map((c) => c)
        //             : node.children,
        //         }
        //   );
        //   console.log("result2", result);
        //   return result;
        // });
        // setRenamingId(undefined);
        setRenamingValue("");
        // setDraftParentId(null);
      }
      if (id && name && renamingId?.startsWith("draft-file-")) {
        setTreeElements((prev) =>
          prev.map((node) =>
            node.id === renamingId ? { ...node, id, name } : node
          )
        );
        // setRenamingId(undefined);
        setRenamingValue("");
      }
    }
  }, [createRootFetcher.state, createRootFetcher.data, renamingId]);

  useEffect(() => {
    if (
      deleteFetcher.state === "idle" &&
      deleteFetcher.data?.ok &&
      deleteFetcher.data.id
    ) {
      const deletedId = deleteFetcher.data.id;
      setTreeElements((prev) => removeNodeById(prev, deletedId));
      if (selectedId === deletedId) setSelectedId(undefined);
      // If the open content pane is showing deleted file, clear it
      if (contentFetcher.state === "idle" && selectedId === deletedId) {
        setContent("");
      }
      if (renamingId === deletedId) setRenamingId(undefined);
    }
  }, [deleteFetcher.state, deleteFetcher.data]);

  useEffect(() => {
    if (
      deleteFolderFetcher.state === "idle" &&
      deleteFolderFetcher.data?.ok &&
      deleteFolderFetcher.data.id
    ) {
      const deletedId = deleteFolderFetcher.data.id;
      setTreeElements((prev) => removeNodeById(prev, deletedId));
      if (selectedId === deletedId) {
        setSelectedId(undefined);
        setContent("");
      }
      if (renamingId === deletedId) setRenamingId(undefined);
    }
  }, [deleteFolderFetcher.state, deleteFolderFetcher.data]);

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
                  ref={renameInputRef}
                  className="h-6 rounded border px-1 text-xs"
                  value={renamingValue}
                  placeholder={"폴더이름을 작성해주세요"}
                  onChange={(e) => setRenamingValue(e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={() => {
                    const trimmed = renamingValue.trim();
                    if (renamingId?.startsWith("draft-folder-")) {
                      submitCreateFolder(renamingValue);
                    } else if (renamingId) {
                      if (!trimmed) {
                        setRenamingId(undefined);
                      } else {
                        submitRename(renamingId, renamingValue);
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (renamingId?.startsWith("draft-folder-")) {
                        submitCreateFolder(renamingValue);
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
              setCtxTargetId(node.id);
              setCtxTarget("folder");
              openMenuAt(e.clientX, e.clientY);
              const path = collectAncestorIds(treeElements, node.id);
              setExpandedIds(path);
              setTreeKey((k) => k + 1);
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
            setCtxTargetId(node.id);
            setCtxTarget("file");
            openMenuAt(e.clientX, e.clientY);
          }}
        >
          {renamingId === node.id ? (
            <input
              ref={renameInputRef}
              className="h-6 rounded border px-1 text-xs"
              value={renamingValue}
              placeholder={"파일이름을 작성해주세요"}
              onChange={(e) => setRenamingValue(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onBlur={() => {
                const trimmed = renamingValue.trim();
                if (renamingId?.startsWith("draft-file-")) {
                  submitCreateFile(renamingValue);
                } else if (renamingId) {
                  if (!trimmed) {
                    setRenamingId(undefined);
                  } else {
                    submitRename(renamingId, renamingValue);
                  }
                }
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (renamingId?.startsWith("draft-file-")) {
                    submitCreateFile(renamingValue);
                  } else if (renamingId) {
                    submitRename(renamingId, renamingValue);
                  }
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  if (renamingId?.startsWith("draft-file-")) {
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
                        startCreateRootFileBottom();
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
                        if (ctxTargetId) setPendingRenameId(ctxTargetId);
                        setCtxOpen(false);
                      }}
                    >
                      이름바꾸기
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => {
                        if (ctxTargetId) startCreateChildFolder(ctxTargetId);
                        setCtxOpen(false);
                      }}
                    >
                      새폴더
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        if (ctxTargetId) startCreateChildFile(ctxTargetId);
                        setCtxOpen(false);
                      }}
                    >
                      새파일
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => {
                        if (ctxTargetId) submitDeleteFolder(ctxTargetId);
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
                        if (ctxTargetId) setPendingRenameId(ctxTargetId);
                        setCtxOpen(false);
                      }}
                    >
                      이름바꾸기
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => {
                        if (ctxTargetId) submitDelete(ctxTargetId);
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
              initialExpandedItems={expandedIds}
              key={treeKey}
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
            {selectedName ? `${selectedName}` : "파일을 선택하세요"}
          </div>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="secondary"
            onClick={submitSave}
            disabled={!selectedId || isSaving}
          >
            {isSaving ? "저장 중…" : "저장"}
          </Button>
          <Button
            size="sm"
            onClick={() => run(content)}
            disabled={!loaded || !!skError || !selectedId}
          >
            실행
          </Button>
        </div>

        <div className="p-4">
          <div className="w-full whitespace-pre-wrap text-sm text-muted-foreground grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              {contentFetcher.state === "loading" ? (
                "Loading..."
              ) : (
                <div>
                  <h4 className="mb-1 text-xs font-semibold text-gray-700">
                    {saveInfo ? (
                      <div className="mb-2 text-xs text-green-600">
                        {saveInfo}
                      </div>
                    ) : (
                      "editor"
                    )}
                  </h4>
                  <CodeMirror
                    value={contentFetcher.data?.content ?? ""}
                    height="420px"
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
                </div>
              )}
              <div className="mt-3">
                <h4 className="mb-1 text-xs font-semibold text-gray-700">
                  콘솔
                </h4>
                <pre className="p-2 bg-gray-100 rounded text-xs overflow-auto max-h-48 md:max-h-80">
                  {output}
                </pre>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {!loaded && !skError && (
                <span className="text-xs text-gray-500">Skulpt 로딩 중…</span>
              )}
              {skError && (
                <span className="text-xs text-red-600">Skulpt 로딩 실패</span>
              )}
              <div>
                <h4 className="mb-1 text-xs font-semibold text-gray-700">
                  Turtle
                </h4>
                <div
                  ref={canvasRef}
                  className="w-full h-[220px] md:h-[500px] border border-gray-200 rounded"
                />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
