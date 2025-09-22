import { useCallback, useEffect, useRef, useState } from "react";
import type { TreeViewElement } from "~/common/components/magicui/file-tree";
import { useFetcher } from "react-router";
import {
  addDraftChildAtTop,
  collectAncestorIds,
  findNameById,
  removeNodeById,
  updateNodeName,
} from "../helpers/file-tree";

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export type ContextTarget = "empty" | "folder" | "file";

export interface FileTreeController {
  // state
  treeElements: TreeViewElement[];
  setTreeElements: React.Dispatch<React.SetStateAction<TreeViewElement[]>>;
  selectedId: string | undefined;
  setSelectedId: React.Dispatch<React.SetStateAction<string | undefined>>;
  expandedIds: string[];
  treeKey: number;

  // renaming / inputs
  renamingId?: string;
  renamingValue: string;
  setRenamingValue: (val: string) => void;
  setRenamingId: (id: string | undefined) => void;
  renameInputRef: React.RefObject<HTMLInputElement | null>;

  // drafts
  startCreateRootFolder: () => void;
  startCreateRootFileBottom: () => void;
  startCreateChildFolder: (parentId: string) => void;
  startCreateChildFile: (parentId: string) => void;
  removeDraftById: (id: string) => void;

  // mutations
  submitCreateFolder: (name: string) => void;
  submitCreateFile: (name: string) => void;
  submitRename: (id: string, name: string) => void;
  submitDelete: (id: string) => void;
  submitDeleteFolder: (id: string) => void;
  requestRename: (id: string) => void;

  // context menu
  ctxOpen: boolean;
  setCtxOpen: (open: boolean) => void;
  ctxPos: ContextMenuPosition;
  ctxTarget: ContextTarget;
  ctxTargetId?: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  handleEmptyAreaContextMenu: (e: React.MouseEvent<HTMLDivElement>) => void;
  onFolderContextMenu: (id: string, e: React.MouseEvent) => void;
  onFileContextMenu: (id: string, e: React.MouseEvent) => void;
}

export function useFileTree(
  initialElements: TreeViewElement[]
): FileTreeController {
  const [treeElements, setTreeElements] =
    useState<TreeViewElement[]>(initialElements);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [treeKey, setTreeKey] = useState(0);

  const [renamingId, setRenamingId] = useState<string | undefined>(undefined);
  const [renamingValue, setRenamingValue] = useState<string>("");
  const [pendingRenameId, setPendingRenameId] = useState<string | undefined>(
    undefined
  );
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctxPos, setCtxPos] = useState<ContextMenuPosition>({ x: 0, y: 0 });
  const [ctxTarget, setCtxTarget] = useState<ContextTarget>("empty");
  const [ctxTargetId, setCtxTargetId] = useState<string | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const createFetcher = useFetcher<{
    ok: boolean;
    id?: string;
    name?: string;
    error?: string;
  }>();
  const renameFetcher = useFetcher<{
    ok: boolean;
    id?: string;
    name?: string;
    error?: string;
  }>();
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

  const openMenuAt = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setCtxPos({ x: clientX - rect.left, y: clientY - rect.top });
    setCtxOpen(true);
  }, []);

  // focus handling for rename input (avoids aria-hidden focus issues)
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
      (el as HTMLInputElement).select?.();
    }

    if (renamingId && !ctxOpen) focusWhenVisible();
  }, [renamingId, ctxOpen]);

  useEffect(() => {
    setTreeElements(initialElements);
  }, [initialElements]);

  function startCreateRootFolder() {
    const draftId = `draft-folder-${Date.now()}`;
    setTreeElements((prev) => [
      { id: draftId, name: "", children: [] as TreeViewElement[] },
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

  const [draftParentId, setDraftParentId] = useState<string | null>(null);

  function startCreateChildFolder(parentId: string) {
    const draftId = `draft-folder-${Date.now()}`;
    setTreeElements((prev) =>
      addDraftChildAtTop(prev, parentId, draftId, false)
    );
    setRenamingValue("");
    setDraftParentId(parentId);
    setPendingRenameId(undefined);
    setTimeout(() => setRenamingId(draftId), 0);
  }

  function startCreateChildFile(parentId: string) {
    const draftId = `draft-file-${Date.now()}`;
    setTreeElements((prev) =>
      addDraftChildAtTop(prev, parentId, draftId, true)
    );
    setRenamingValue("");
    setDraftParentId(parentId);
    setPendingRenameId(undefined);
    setTimeout(() => setRenamingId(draftId), 0);
  }

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
    createFetcher.submit(
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
    createFetcher.submit(
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
    if (createFetcher.state === "idle" && createFetcher.data?.ok) {
      const { id, name } = createFetcher.data;
      if (id && name && renamingId?.startsWith("draft-folder-")) {
        setTreeElements((prev) => updateNodeName(prev, renamingId, name));
        setRenamingValue("");
      }
      if (id && name && renamingId?.startsWith("draft-file-")) {
        setTreeElements((prev) =>
          prev.map((n) => (n.id === renamingId ? { ...n, id, name } : n))
        );
        setRenamingValue("");
      }
    }
  }, [createFetcher.state, createFetcher.data, renamingId]);

  useEffect(() => {
    if (
      deleteFetcher.state === "idle" &&
      deleteFetcher.data?.ok &&
      deleteFetcher.data.id
    ) {
      const deletedId = deleteFetcher.data.id;
      setTreeElements((prev) => removeNodeById(prev, deletedId));
      if (selectedId === deletedId) setSelectedId(undefined);
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
      if (selectedId === deletedId) setSelectedId(undefined);
      if (renamingId === deletedId) setRenamingId(undefined);
    }
  }, [deleteFolderFetcher.state, deleteFolderFetcher.data]);

  useEffect(() => {
    if (!ctxOpen && pendingRenameId) {
      const currentName = findNameById(treeElements, pendingRenameId) ?? "";
      setRenamingId(pendingRenameId);
      setRenamingValue(currentName);
      setPendingRenameId(undefined);
    }
  }, [ctxOpen, pendingRenameId, treeElements]);

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

  const onFolderContextMenu = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent?.stopImmediatePropagation?.();
      setCtxTargetId(id);
      setCtxTarget("folder");
      openMenuAt(
        (e as React.MouseEvent).clientX,
        (e as React.MouseEvent).clientY
      );
      const path = collectAncestorIds(treeElements, id);
      setExpandedIds(path);
      setTreeKey((k) => k + 1);
    },
    [treeElements, openMenuAt]
  );

  const onFileContextMenu = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent?.stopImmediatePropagation?.();
      setCtxTargetId(id);
      setCtxTarget("file");
      openMenuAt(
        (e as React.MouseEvent).clientX,
        (e as React.MouseEvent).clientY
      );
    },
    [openMenuAt]
  );

  function removeDraftById(id: string) {
    setTreeElements((prev) => removeNodeById(prev, id));
  }

  function requestRename(id: string) {
    setPendingRenameId(id);
  }

  return {
    treeElements,
    setTreeElements,
    selectedId,
    setSelectedId,
    expandedIds,
    treeKey,

    renamingId,
    renamingValue,
    setRenamingValue,
    setRenamingId,
    renameInputRef,

    startCreateRootFolder,
    startCreateRootFileBottom,
    startCreateChildFolder,
    startCreateChildFile,
    removeDraftById,

    submitCreateFolder,
    submitCreateFile,
    submitRename,
    submitDelete,
    submitDeleteFolder,
    requestRename,

    ctxOpen,
    setCtxOpen,
    ctxPos,
    ctxTarget,
    ctxTargetId,
    containerRef,
    triggerRef,
    handleEmptyAreaContextMenu,
    onFolderContextMenu,
    onFileContextMenu,
  };
}

export default useFileTree;
