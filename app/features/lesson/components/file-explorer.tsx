import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "~/common/components/ui/sidebar";
import {
  FolderIcon,
  FileIcon,
  FilePlus,
  FolderPlus,
  Pencil,
  Trash2,
} from "lucide-react";
import { Input } from "~/common/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/common/components/ui/dropdown-menu";
import { useFiles } from "~/hooks/use-files";

export interface FileNode {
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

interface FileExplorerSidebarProps {
  activeFilePath: string | null;
  onSelectFile: (path: string) => void;
  nodes?: FileNode[];
  title?: string;
}

function getParentPath(path: string): string | null {
  const idx = path.lastIndexOf("/");
  if (idx <= 0) return null;
  return path.slice(0, idx);
}

function replacePathPrefix(path: string, oldPrefix: string, newPrefix: string) {
  if (path === oldPrefix) return newPrefix;
  if (path.startsWith(oldPrefix + "/")) {
    return newPrefix + path.slice(oldPrefix.length);
  }
  return path;
}

export function FileExplorerSidebar({
  activeFilePath,
  onSelectFile,
  nodes,
  title = "Files",
}: FileExplorerSidebarProps) {
  const { getTree, setTree, subscribeTree } = useFiles();
  const [tree, setTreeState] = useState<FileNode[]>(() =>
    nodes && nodes.length ? nodes : getTree()
  );
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set(["/project", "/project/utils"])
  );

  // keep tree synced with provider unless an explicit tree is passed
  useEffect(() => {
    if (nodes && nodes.length) return; // external control
    setTreeState(getTree());
    const unsub = subscribeTree((t) => setTreeState(t));
    return unsub;
  }, [getTree, subscribeTree, nodes]);

  // Inline create / rename states
  const [createTarget, setCreateTarget] = useState<{
    parentPath: string;
    type: "file" | "folder";
  } | null>(null);
  const [renameTarget, setRenameTarget] = useState<{
    path: string;
    originalName: string;
  } | null>(null);
  const [inputName, setInputName] = useState("");
  const [inputError, setInputError] = useState<string>("");
  const [contextMenuTarget, setContextMenuTarget] = useState<string | null>(
    null
  );
  const createInputRef = useRef<HTMLInputElement | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  const handleToggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  function findNode(nodesToSearch: FileNode[], path: string): FileNode | null {
    for (const node of nodesToSearch) {
      if (node.path === path) return node;
      if (node.children) {
        const found = findNode(node.children, path);
        if (found) return found;
      }
    }
    return null;
  }

  function nameExists(parentPath: string, name: string, excludePath?: string) {
    const parent = findNode(tree, parentPath);
    if (!parent || parent.type !== "folder" || !parent.children) return false;
    return parent.children.some(
      (c) => c.name === name && (excludePath ? c.path !== excludePath : true)
    );
  }

  function findAndAdd(
    nodesToMutate: FileNode[],
    parentPath: string,
    child: FileNode
  ): FileNode[] {
    return nodesToMutate.map((node) => {
      if (node.path === parentPath && node.type === "folder") {
        const children = node.children ? [...node.children, child] : [child];
        return { ...node, children };
      }
      if (node.children && node.children.length > 0) {
        return {
          ...node,
          children: findAndAdd(node.children, parentPath, child),
        };
      }
      return node;
    });
  }

  function removeNode(
    nodesToMutate: FileNode[],
    targetPath: string
  ): FileNode[] {
    const result: FileNode[] = [];
    for (const node of nodesToMutate) {
      if (node.path === targetPath) continue;
      if (node.children && node.children.length > 0) {
        result.push({
          ...node,
          children: removeNode(node.children, targetPath),
        });
      } else {
        result.push(node);
      }
    }
    return result;
  }

  function renameNode(
    nodesToMutate: FileNode[],
    targetPath: string,
    newName: string
  ): FileNode[] {
    return nodesToMutate.map((node) => {
      if (node.path === targetPath) {
        const parent = getParentPath(targetPath);
        const newPath = parent ? `${parent}/${newName}` : `/${newName}`;
        if (node.type === "folder") {
          // update subtree paths
          const updatedChildren = (node.children ?? []).map((ch) =>
            updateSubtreePath(ch, node.path, newPath)
          );
          return {
            ...node,
            name: newName,
            path: newPath,
            children: updatedChildren,
          };
        } else {
          return { ...node, name: newName, path: newPath };
        }
      }
      if (node.children && node.children.length > 0) {
        return {
          ...node,
          children: renameNode(node.children, targetPath, newName),
        };
      }
      return node;
    });
  }

  function updateSubtreePath(
    node: FileNode,
    oldPrefix: string,
    newPrefix: string
  ): FileNode {
    const newPath = replacePathPrefix(node.path, oldPrefix, newPrefix);
    if (node.children && node.children.length > 0) {
      return {
        ...node,
        path: newPath,
        children: node.children.map((c) =>
          updateSubtreePath(c, oldPrefix, newPrefix)
        ),
      };
    }
    return { ...node, path: newPath };
  }

  function ensureExpanded(path: string) {
    setExpandedFolders((prev) => new Set(prev).add(path));
  }

  const openCreateInline = useCallback(
    (parentPath: string, type: "file" | "folder") => {
      setCreateTarget({ parentPath, type });
      setRenameTarget(null);
      setInputName("");
      setInputError("");
      ensureExpanded(parentPath);
      setContextMenuTarget(null);
    },
    []
  );

  const openRenameInline = useCallback((path: string, currentName: string) => {
    setRenameTarget({ path, originalName: currentName });
    setCreateTarget(null);
    setInputName(currentName);
    setInputError("");
    setContextMenuTarget(null);
  }, []);

  const commitCreate = useCallback(() => {
    if (!createTarget) return;
    let name = inputName.trim();
    if (!name) return;
    if (createTarget.type === "file" && !name.includes(".")) {
      name = `${name}.py`;
    }
    if (nameExists(createTarget.parentPath, name)) {
      setInputError("동일한 이름이 이미 존재합니다.");
      return;
    }
    const newPath = `${createTarget.parentPath}/${name}`;
    const newNode: FileNode = {
      id: `${createTarget.type}_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 7)}`,
      userId: 1,
      name,
      type: createTarget.type,
      parentId: createTarget.parentPath,
      path: newPath,
      children: createTarget.type === "folder" ? [] : undefined,
    };
    if (nodes && nodes.length) {
      setTreeState((prev) =>
        findAndAdd(prev, createTarget.parentPath, newNode)
      );
    } else {
      setTree((prev) => findAndAdd(prev, createTarget.parentPath, newNode));
    }
    if (createTarget.type === "file") onSelectFile(newPath);
    setCreateTarget(null);
    setInputName("");
    setInputError("");
  }, [createTarget, inputName, onSelectFile, nodes, setTree]);

  const commitRename = useCallback(() => {
    if (!renameTarget) return;
    const parentPath = getParentPath(renameTarget.path) ?? "/";
    let name = inputName.trim();
    if (!name) return;
    const isFile =
      (findNode(tree, renameTarget.path)?.type ?? "file") === "file";
    if (isFile && !name.includes(".")) name = `${name}.py`;
    if (nameExists(parentPath, name, renameTarget.path)) {
      setInputError("동일한 이름이 이미 존재합니다.");
      return;
    }
    const oldPath = renameTarget.path;
    const newParent = parentPath;
    const newPath = `${newParent}/${name}`;
    if (nodes && nodes.length) {
      setTreeState((prev) => renameNode(prev, oldPath, name));
    } else {
      setTree((prev) => renameNode(prev, oldPath, name));
    }
    setExpandedFolders((prev) => {
      const next = new Set<string>();
      for (const key of prev) {
        next.add(replacePathPrefix(key, oldPath, newPath));
      }
      return next;
    });
    if (
      activeFilePath &&
      (activeFilePath === oldPath || activeFilePath.startsWith(oldPath + "/"))
    ) {
      const updated = replacePathPrefix(activeFilePath, oldPath, newPath);
      onSelectFile(updated);
    }
    setRenameTarget(null);
    setInputName("");
    setInputError("");
  }, [
    renameTarget,
    inputName,
    tree,
    activeFilePath,
    onSelectFile,
    nodes,
    setTree,
  ]);

  const commitDelete = useCallback(
    (targetPath: string) => {
      if (nodes && nodes.length) {
        setTreeState((prev) => removeNode(prev, targetPath));
      } else {
        setTree((prev) => removeNode(prev, targetPath));
      }
      setExpandedFolders((prev) => {
        const next = new Set<string>();
        for (const key of prev) if (!key.startsWith(targetPath)) next.add(key);
        return next;
      });
      if (
        activeFilePath &&
        (activeFilePath === targetPath ||
          activeFilePath.startsWith(targetPath + "/"))
      ) {
        onSelectFile("");
      }
    },
    [activeFilePath, onSelectFile, nodes, setTree]
  );

  useEffect(() => {
    if (createTarget) {
      requestAnimationFrame(() => {
        createInputRef.current?.focus();
        createInputRef.current?.select();
      });
    }
  }, [createTarget]);

  useEffect(() => {
    if (renameTarget) {
      requestAnimationFrame(() => {
        renameInputRef.current?.focus();
        renameInputRef.current?.select();
      });
    }
  }, [renameTarget]);

  function renderCreateInline(parentPath: string, depth: number) {
    if (!createTarget || createTarget.parentPath !== parentPath) return null;
    return (
      <SidebarMenuItem>
        <div className="px-2 py-1" style={{ paddingLeft: (depth + 1) * 12 }}>
          <div className="flex items-center gap-2">
            {createTarget.type === "file" ? <FileIcon /> : <FolderIcon />}
            <Input
              autoFocus
              ref={createInputRef}
              value={inputName}
              onChange={(e) => {
                setInputName(e.target.value);
                setInputError("");
              }}
              placeholder={
                createTarget.type === "file"
                  ? `${parentPath}/name.py`
                  : `${parentPath}/folder`
              }
              className="h-8"
              onKeyDown={(e) => {
                if (e.key === "Enter") commitCreate();
                if (e.key === "Escape") {
                  setCreateTarget(null);
                  setInputName("");
                  setInputError("");
                }
              }}
            />
          </div>
          {inputError ? (
            <div className="text-xs text-destructive mt-1">{inputError}</div>
          ) : null}
        </div>
      </SidebarMenuItem>
    );
  }

  function renderTree(nodesToRender: FileNode[], depth = 0) {
    return (
      <SidebarMenu>
        {nodesToRender.map((node) => (
          <SidebarMenuItem key={node.path}>
            {renameTarget?.path === node.path ? (
              <div className="px-2 py-1" style={{ paddingLeft: depth * 12 }}>
                <div className="flex items-center gap-2">
                  {node.type === "file" ? <FileIcon /> : <FolderIcon />}
                  <Input
                    autoFocus
                    ref={renameInputRef}
                    value={inputName}
                    onChange={(e) => {
                      setInputName(e.target.value);
                      setInputError("");
                    }}
                    className="h-8"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") {
                        setRenameTarget(null);
                        setInputName("");
                        setInputError("");
                      }
                    }}
                  />
                </div>
                {inputError ? (
                  <div className="text-xs text-destructive mt-1">
                    {inputError}
                  </div>
                ) : null}
              </div>
            ) : node.type === "folder" ? (
              <DropdownMenu
                open={contextMenuTarget === node.path}
                onOpenChange={(o) => {
                  if (!o) setContextMenuTarget(null);
                }}
              >
                <DropdownMenuTrigger asChild>
                  <div
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenuTarget(node.path);
                    }}
                  >
                    <SidebarMenuButton
                      onClick={() => handleToggleFolder(node.path)}
                      isActive={expandedFolders.has(node.path)}
                    >
                      <FolderIcon />
                      <span>{node.name}</span>
                    </SidebarMenuButton>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start">
                  <DropdownMenuItem
                    onClick={() => openCreateInline(node.path, "file")}
                  >
                    <FilePlus className="w-4 h-4" /> 새파일
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => openCreateInline(node.path, "folder")}
                  >
                    <FolderPlus className="w-4 h-4" /> 새폴더
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => openRenameInline(node.path, node.name)}
                  >
                    <Pencil className="w-4 h-4" /> 이름 변경
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => commitDelete(node.path)}>
                    <Trash2 className="w-4 h-4" /> 삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <DropdownMenu
                open={contextMenuTarget === node.path}
                onOpenChange={(o) => {
                  if (!o) setContextMenuTarget(null);
                }}
              >
                <DropdownMenuTrigger asChild>
                  <div
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenuTarget(node.path);
                    }}
                  >
                    <SidebarMenuButton
                      isActive={activeFilePath === node.path}
                      onClick={() => onSelectFile(node.path)}
                    >
                      <FileIcon />
                      <span>{node.name}</span>
                    </SidebarMenuButton>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start">
                  <DropdownMenuItem
                    onClick={() => openRenameInline(node.path, node.name)}
                  >
                    <Pencil className="w-4 h-4" /> 이름 변경
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => commitDelete(node.path)}>
                    <Trash2 className="w-4 h-4" /> 삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {node.type === "folder" && expandedFolders.has(node.path) ? (
              <div style={{ paddingLeft: (depth + 1) * 12 }}>
                {renderCreateInline(node.path, depth)}
                {node.children && node.children.length > 0
                  ? renderTree(node.children, depth + 1)
                  : null}
              </div>
            ) : null}
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    );
  }

  return (
    <Sidebar collapsible="offcanvas" className="mt-15">
      <SidebarHeader>
        <SidebarGroup>
          <SidebarGroupLabel>{title}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarContent>{renderTree(tree, 0)}</SidebarContent>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarHeader>
    </Sidebar>
  );
}

export default FileExplorerSidebar;
