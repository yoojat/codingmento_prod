import {
  Tree,
  type TreeViewElement,
} from "~/common/components/magicui/file-tree";
import RenderTree from "../components/render-tree";
import { toTreeElements } from "../helpers/file-tree";
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
import { SaveIcon } from "lucide-react";
import { useSkulptRunner } from "~/hooks/use-skulpt-runner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/common/components/ui/dropdown-menu";
import { useFileTree } from "../hooks/use-file-tree";
import { handleFileAction } from "~/features/lesson/actions";

// helpers moved to ../helpers/file-tree

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
  return handleFileAction(client, userId, formData);
};

export default function PrivateCode({ loaderData }: Route.ComponentProps) {
  const { elements } = loaderData as unknown as { elements: TreeViewElement[] };
  const contentFetcher = useFetcher<{ content: string; name: string }>();
  const [content, setContent] = useState<string>("");
  const fileTree = useFileTree(elements);
  const [selectedName, setSelectedName] = useState<string>("");
  const saveFetcher = useFetcher<{ ok: boolean; error?: string }>();
  const [saveInfo, setSaveInfo] = useState<string>("");
  const {
    loaded,
    error: skError,
    output,
    run,
    stop,
    canvasRef,
  } = useSkulptRunner();

  // file tree logic is encapsulated in useFileTree

  useEffect(() => {
    if (!fileTree.selectedId) return;
    contentFetcher.load(`/lessons/private-code-content/${fileTree.selectedId}`);
    // 파일 전환 시 실행 결과 초기화
    fileTree.setRenamingId(undefined);
    fileTree.setRenamingValue("");
    // 콘솔 출력은 run 호출 전에만 세팅되므로 여기서는 UI만 초기화
    try {
      const pre = document.querySelector("pre");
      if (pre) pre.textContent = "";
    } catch {}
    if (canvasRef?.current) {
      canvasRef.current.innerHTML = "";
    }
  }, [fileTree.selectedId]);

  useEffect(() => {
    if (contentFetcher.state === "idle" && contentFetcher.data) {
      setContent(contentFetcher.data.content ?? "");
      setSelectedName(contentFetcher.data.name ?? "");
    }
  }, [contentFetcher.state, contentFetcher.data]);

  // focus is handled inside useFileTree

  // findNameById imported from helpers

  useEffect(() => {
    fileTree.setTreeElements(elements);
  }, [elements]);

  // updateNodeName imported from helpers

  // removeNodeById imported from helpers
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

  const startCreateRootFolder = fileTree.startCreateRootFolder;

  const startCreateRootFileBottom = fileTree.startCreateRootFileBottom;

  // addDraftChildAtTop imported from helpers

  const startCreateChildFolder = fileTree.startCreateChildFolder;

  const startCreateChildFile = fileTree.startCreateChildFile;

  const submitCreateFolder = fileTree.submitCreateFolder;

  const submitCreateFile = fileTree.submitCreateFile;

  const submitDelete = fileTree.submitDelete;

  const submitDeleteFolder = fileTree.submitDeleteFolder;
  // create results handled in hook

  // file delete handled in hook

  // folder delete handled in hook

  const submitRename = fileTree.submitRename;

  // rename results handled in hook

  // deferred rename handled in hook

  // renderTree moved to component RenderTree

  // Left click is intentionally ignored for context menu

  const handleEmptyAreaContextMenu = fileTree.handleEmptyAreaContextMenu;

  function submitSave() {
    if (!fileTree.selectedId) return;
    saveFetcher.submit(
      { intent: "save-content", id: fileTree.selectedId, content },
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
            ref={fileTree.containerRef}
            className="relative h-full"
            onContextMenu={handleEmptyAreaContextMenu}
          >
            <DropdownMenu
              open={fileTree.ctxOpen}
              onOpenChange={fileTree.setCtxOpen}
            >
              <DropdownMenuTrigger asChild>
                <button
                  ref={fileTree.triggerRef}
                  style={{
                    position: "absolute",
                    left: fileTree.ctxPos.x,
                    top: fileTree.ctxPos.y,
                    width: 1,
                    height: 1,
                    opacity: 0,
                    pointerEvents: fileTree.ctxOpen ? "auto" : "none",
                  }}
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {fileTree.ctxTarget === "empty" && (
                  <>
                    <DropdownMenuItem
                      onClick={() => {
                        startCreateRootFolder();
                        fileTree.setCtxOpen(false);
                      }}
                    >
                      새폴더
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        startCreateRootFileBottom();
                        fileTree.setCtxOpen(false);
                      }}
                    >
                      새파일
                    </DropdownMenuItem>
                  </>
                )}

                {fileTree.ctxTarget === "folder" && (
                  <>
                    <DropdownMenuItem
                      onClick={() => {
                        if (fileTree.ctxTargetId)
                          fileTree.requestRename(fileTree.ctxTargetId);
                        fileTree.setCtxOpen(false);
                      }}
                    >
                      이름바꾸기
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => {
                        if (fileTree.ctxTargetId)
                          startCreateChildFolder(fileTree.ctxTargetId);
                        fileTree.setCtxOpen(false);
                      }}
                    >
                      새폴더
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        if (fileTree.ctxTargetId)
                          startCreateChildFile(fileTree.ctxTargetId);
                        fileTree.setCtxOpen(false);
                      }}
                    >
                      새파일
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => {
                        if (fileTree.ctxTargetId)
                          submitDeleteFolder(fileTree.ctxTargetId);
                        fileTree.setCtxOpen(false);
                      }}
                    >
                      삭제
                    </DropdownMenuItem>
                  </>
                )}

                {fileTree.ctxTarget === "file" && (
                  <>
                    <DropdownMenuItem
                      onClick={() => {
                        if (fileTree.ctxTargetId)
                          fileTree.requestRename(fileTree.ctxTargetId);
                        fileTree.setCtxOpen(false);
                      }}
                    >
                      이름바꾸기
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => {
                        if (fileTree.ctxTargetId)
                          submitDelete(fileTree.ctxTargetId);
                        fileTree.setCtxOpen(false);
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
              initialExpandedItems={fileTree.expandedIds}
              key={fileTree.treeKey}
              elements={fileTree.treeElements}
              onSelectedChange={fileTree.setSelectedId}
            >
              <RenderTree
                nodes={fileTree.treeElements}
                renamingId={fileTree.renamingId}
                renamingValue={fileTree.renamingValue}
                setRenamingValue={fileTree.setRenamingValue}
                renameInputRef={fileTree.renameInputRef}
                onSubmitCreateFolder={submitCreateFolder}
                onSubmitCreateFile={submitCreateFile}
                onSubmitRename={submitRename}
                onRemoveDraftById={fileTree.removeDraftById}
                setRenamingId={fileTree.setRenamingId}
                onFolderContextMenu={fileTree.onFolderContextMenu}
                onFileContextMenu={fileTree.onFileContextMenu}
              />
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
            disabled={!fileTree.selectedId || isSaving}
          >
            {isSaving ? "저장 중…" : "저장"}
          </Button>
          <Button
            size="sm"
            onClick={() => run(content)}
            disabled={!loaded || !!skError || !fileTree.selectedId}
          >
            실행
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => stop()}
            disabled={!fileTree.selectedId}
          >
            정지
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
