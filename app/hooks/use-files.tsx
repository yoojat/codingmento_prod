import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type FilePath = string;
interface FileNode {
  id: string;
  userId: number;
  name: string;
  type: "folder" | "file";
  parentId: string | null;
  path: string;
  size?: number;
  mimeType?: string;
  children?: FileNode[];
}

// DB rows for files and contents
export interface DbFileRow {
  id: number;
  name: string;
  type: "file" | "folder";
  parent_id: number | null;
  path: string | null;
}

export interface DbFileContent {
  id: number;
  content: string | null;
}

interface FilesContextValue {
  getContent: (path: FilePath) => string;
  setContent: (path: FilePath, content: string) => void;
  subscribe: (path: FilePath, cb: (content: string) => void) => () => void;
  getTree: () => FileNode[];
  setTree: (updater: FileNode[] | ((prev: FileNode[]) => FileNode[])) => void;
  subscribeTree: (cb: (tree: FileNode[]) => void) => () => void;
}

const FilesContext = createContext<FilesContextValue | null>(null);

export function FilesProvider({
  children,
  initialDbFiles,
  initialDbContents,
  currentUserId,
}: {
  children: React.ReactNode;
  initialDbFiles?: DbFileRow[];
  initialDbContents?: DbFileContent[];
  currentUserId?: string;
}) {
  const [cache, setCache] = useState<Map<FilePath, string>>(() => new Map());
  const listeners = useRef(new Map<FilePath, Set<(content: string) => void>>());
  const treeListeners = useRef(new Set<(tree: FileNode[]) => void>());

  function getDefaultTree(): FileNode[] {
    return [
      // {
      //   id: "root",
      //   userId: 1,
      //   name: "project",
      //   type: "folder",
      //   parentId: null,
      //   path: "/project",
      //   children: [
      //     {
      //       id: "main_py",
      //       userId: 1,
      //       name: "main.py",
      //       type: "file",
      //       parentId: "root",
      //       path: "/project/main.py",
      //     },
      //   ],
      // },
    ];
  }

  // Build tree from DB rows
  function buildTreeFromDb(rows: DbFileRow[]): FileNode[] {
    const byId = new Map<number, FileNode>();
    const roots: FileNode[] = [];
    for (const r of rows) {
      byId.set(r.id, {
        id: String(r.id),
        userId: 0,
        name: r.name,
        type: r.type,
        parentId: r.parent_id ? String(r.parent_id) : null,
        path: r.path ?? "",
        children: r.type === "folder" ? [] : undefined,
      });
    }
    for (const r of rows) {
      const node = byId.get(r.id)!;
      if (r.parent_id && byId.has(r.parent_id)) {
        const parent = byId.get(r.parent_id)!;
        if (!parent.children) parent.children = [];
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots.length ? roots : [];
  }

  const [tree, _setTree] = useState<FileNode[]>(() => {
    try {
      if (currentUserId) {
        const storedUser = localStorage.getItem("fs:user");
        if (storedUser && storedUser !== currentUserId) {
          throw new Error("stale-user");
        }
      }
    } catch {}
    // 1) If DB provided (after login), prefer DB tree as default
    if (initialDbFiles && initialDbFiles.length) {
      const t = buildTreeFromDb(initialDbFiles);
      try {
        localStorage.setItem("fs:tree", JSON.stringify(t));
        if (currentUserId) localStorage.setItem("fs:user", currentUserId);
      } catch {}
      return t;
    }
    // 2) Else use locally stored tree
    try {
      const stored = localStorage.getItem("fs:tree");
      if (stored) return JSON.parse(stored) as FileNode[];
    } catch {}
    // 3) Fallback to default
    return getDefaultTree();
  });

  const getContent = useCallback(
    (path: FilePath) => {
      const cached = cache.get(path);
      if (cached != null) return cached;
      const stored = localStorage.getItem(`fs:${path}`);
      return stored ?? "";
    },
    [cache]
  );

  const setContent = useCallback((path: FilePath, content: string) => {
    setCache((prev) => {
      const next = new Map(prev);
      next.set(path, content);
      return next;
    });
    localStorage.setItem(`fs:${path}`, content);
    // notify local listeners
    const setForPath = listeners.current.get(path);
    if (setForPath) {
      setForPath.forEach((cb) => cb(content));
    }
  }, []);

  // Seed DB file contents to local cache/storage once when provided
  useEffect(() => {
    // On user change, clear previous fs:* cache to avoid cross-user bleed
    if (currentUserId) {
      const storedUser = localStorage.getItem("fs:user");
      if (storedUser !== currentUserId) {
        try {
          const keys: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith("fs:")) keys.push(key);
          }
          keys.forEach((k) => localStorage.removeItem(k));
          localStorage.setItem("fs:user", currentUserId);
          if (initialDbFiles && initialDbFiles.length) {
            const t = buildTreeFromDb(initialDbFiles);
            localStorage.setItem("fs:tree", JSON.stringify(t));
            _setTree(t);
          } else {
            _setTree(getDefaultTree());
          }
        } catch {}
      }
    }
    if (
      !initialDbFiles ||
      !initialDbFiles.length ||
      !initialDbContents ||
      !initialDbContents.length
    )
      return;
    const idToPath = new Map<number, string>();
    for (const f of initialDbFiles) if (f.path) idToPath.set(f.id, f.path);
    for (const c of initialDbContents) {
      const path = idToPath.get(c.id);
      if (path != null) setContent(path, c.content ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDbFiles, initialDbContents, currentUserId]);

  const subscribe = useCallback(
    (path: FilePath, cb: (content: string) => void) => {
      let setForPath = listeners.current.get(path);
      if (!setForPath) {
        setForPath = new Set();
        listeners.current.set(path, setForPath);
      }
      setForPath.add(cb);
      return () => {
        setForPath?.delete(cb);
      };
    },
    []
  );

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key || !e.key.startsWith("fs:")) return;
      const path = e.key.slice(3);
      if (path === "tree") {
        const newTree = e.newValue
          ? (JSON.parse(e.newValue) as FileNode[])
          : getDefaultTree();
        _setTree(newTree);
        treeListeners.current.forEach((cb) => cb(newTree));
        return;
      }
      const value = e.newValue ?? "";
      setCache((prev) => {
        const next = new Map(prev);
        next.set(path, value);
        return next;
      });
      const setForPath = listeners.current.get(path);
      if (setForPath) setForPath.forEach((cb) => cb(value));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const getTree = useCallback(() => tree, [tree]);
  const setTree = useCallback(
    (updater: FileNode[] | ((prev: FileNode[]) => FileNode[])) => {
      _setTree((prev) => {
        const next =
          typeof updater === "function" ? (updater as any)(prev) : updater;
        localStorage.setItem("fs:tree", JSON.stringify(next));
        treeListeners.current.forEach((cb) => cb(next));
        return next;
      });
    },
    []
  );
  const subscribeTree = useCallback((cb: (tree: FileNode[]) => void) => {
    treeListeners.current.add(cb);
    return () => treeListeners.current.delete(cb);
  }, []);

  const value = useMemo<FilesContextValue>(
    () => ({
      getContent,
      setContent,
      subscribe,
      getTree,
      setTree,
      subscribeTree,
    }),
    [getContent, setContent, subscribe, getTree, setTree, subscribeTree]
  );

  return (
    <FilesContext.Provider value={value}>{children}</FilesContext.Provider>
  );
}

export function useFiles() {
  const ctx = useContext(FilesContext);
  if (!ctx) throw new Error("useFiles must be used within FilesProvider");
  return ctx;
}
