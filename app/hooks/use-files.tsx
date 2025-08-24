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

interface FilesContextValue {
  getContent: (path: FilePath) => string;
  setContent: (path: FilePath, content: string) => void;
  subscribe: (path: FilePath, cb: (content: string) => void) => () => void;
  getTree: () => FileNode[];
  setTree: (updater: FileNode[] | ((prev: FileNode[]) => FileNode[])) => void;
  subscribeTree: (cb: (tree: FileNode[]) => void) => () => void;
}

const FilesContext = createContext<FilesContextValue | null>(null);

export function FilesProvider({ children }: { children: React.ReactNode }) {
  const [cache, setCache] = useState<Map<FilePath, string>>(() => new Map());
  const listeners = useRef(new Map<FilePath, Set<(content: string) => void>>());
  const treeListeners = useRef(new Set<(tree: FileNode[]) => void>());

  function getDefaultTree(): FileNode[] {
    return [
      {
        id: "root",
        userId: 1,
        name: "project",
        type: "folder",
        parentId: null,
        path: "/project",
        children: [
          {
            id: "main_py",
            userId: 1,
            name: "main.py",
            type: "file",
            parentId: "root",
            path: "/project/main.py",
          },
        ],
      },
    ];
  }

  const [tree, _setTree] = useState<FileNode[]>(() => {
    try {
      const stored = localStorage.getItem("fs:tree");
      if (stored) return JSON.parse(stored) as FileNode[];
    } catch {}
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
