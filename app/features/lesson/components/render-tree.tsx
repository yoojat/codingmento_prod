import React from "react";
import {
  File,
  Folder,
  type TreeViewElement,
} from "~/common/components/magicui/file-tree";

export interface RenderTreeProps {
  nodes: TreeViewElement[];
  renamingId?: string;
  renamingValue: string;
  setRenamingValue: (value: string) => void;
  renameInputRef: React.RefObject<HTMLInputElement | null>;
  onSubmitCreateFolder: (name: string) => void;
  onSubmitCreateFile: (name: string) => void;
  onSubmitRename: (id: string, name: string) => void;
  onRemoveDraftById: (id: string) => void;
  setRenamingId: (id: string | undefined) => void;
  onFolderContextMenu: (id: string, e: React.MouseEvent) => void;
  onFileContextMenu: (id: string, e: React.MouseEvent) => void;
}

export function RenderTree(props: RenderTreeProps) {
  const {
    nodes,
    renamingId,
    renamingValue,
    setRenamingValue,
    renameInputRef,
    onSubmitCreateFolder,
    onSubmitCreateFile,
    onSubmitRename,
    onRemoveDraftById,
    setRenamingId,
    onFolderContextMenu,
    onFileContextMenu,
  } = props;

  function render(nodesToRender: TreeViewElement[]): React.ReactNode {
    return nodesToRender.map((node) => {
      const hasChildren = Array.isArray(node.children);
      if (hasChildren) {
        return (
          <Folder
            key={node.id}
            value={node.id}
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
                      onSubmitCreateFolder(renamingValue);
                    } else if (renamingId) {
                      if (!trimmed) {
                        setRenamingId(undefined);
                      } else {
                        onSubmitRename(renamingId, renamingValue);
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (renamingId?.startsWith("draft-folder-")) {
                        onSubmitCreateFolder(renamingValue);
                      } else if (renamingId) {
                        onSubmitRename(renamingId, renamingValue);
                      }
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      if (renamingId?.startsWith("draft-folder-")) {
                        onRemoveDraftById(renamingId);
                      }
                      setRenamingId(undefined);
                    }
                  }}
                />
              ) : (
                node.name
              )
            }
            onContextMenu={(e) => onFolderContextMenu(node.id, e)}
          >
            {node.children ? render(node.children) : null}
          </Folder>
        );
      }
      return (
        <File
          key={node.id}
          value={node.id}
          onContextMenu={(e) => onFileContextMenu(node.id, e)}
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
                  onSubmitCreateFile(renamingValue);
                } else if (renamingId) {
                  if (!trimmed) {
                    setRenamingId(undefined);
                  } else {
                    onSubmitRename(renamingId, renamingValue);
                  }
                }
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (renamingId?.startsWith("draft-file-")) {
                    onSubmitCreateFile(renamingValue);
                  } else if (renamingId) {
                    onSubmitRename(renamingId, renamingValue);
                  }
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  if (renamingId?.startsWith("draft-file-")) {
                    onRemoveDraftById(renamingId);
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

  return <>{render(nodes)}</>;
}

export default RenderTree;
