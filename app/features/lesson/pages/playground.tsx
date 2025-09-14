// src/components/Playground.tsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { useSkulptRunner } from "~/hooks/use-skulpt-runner";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { keymap } from "@codemirror/view";
import { defaultKeymap, historyKeymap } from "@codemirror/commands";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "~/common/components/ui/sidebar";
import { Button } from "~/common/components/ui/button";
import { SaveIcon, PlayIcon } from "lucide-react";
import FileExplorerSidebar, {
  type FileNode,
} from "~/features/lesson/components/file-explorer";
import { FilesProvider, useFiles } from "~/hooks/use-files";
import type { Route } from "./+types/playground";
import { makeSSRClient } from "~/supa-client";
import { getLoggedInUserId } from "~/features/users/queries";

type DbFileRow = {
  id: number;
  name: string;
  type: "file" | "folder";
  parent_id: number | null;
  path: string | null;
};

export const loader = async ({ request }: Route.LoaderArgs) => {
  const { client } = makeSSRClient(request);
  const userId = await getLoggedInUserId(client);

  const { data: files, error: fe } = await client
    .from("files")
    .select("id,name,type,parent_id,path")
    .eq("profile_id", userId)
    .order("updated_at", { ascending: false });
  if (fe) throw new Error(fe.message);

  const ids = (files ?? []).map((f) => f.id);
  const { data: contents, error: ce } = await client
    .from("file_contents")
    .select("id,content")
    .in("id", ids.length ? ids : [-1]);
  if (ce) throw new Error(ce.message);

  return { files: files ?? [], contents: contents ?? [], userId };
};

export default function Playground({ loaderData }: Route.ComponentProps) {
  const { files, contents, userId } = loaderData as {
    files: {
      id: number;
      name: string;
      type: "file" | "folder";
      parent_id: number | null;
      path: string | null;
    }[];
    contents: { id: number; content: string | null }[];
    userId: string;
  };
  const { loaded, error, output, run, canvasRef } = useSkulptRunner();
  const { getContent, setContent, subscribe } = useFiles();
  const hasFiles = files.length > 0;

  function buildTree(rows: DbFileRow[]): FileNode[] {
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
    return roots;
  }

  const initialTree: FileNode[] = useMemo(() => buildTree(files), [files]);

  const [fileTree] = useState<FileNode[]>(initialTree);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(() => {
    // pick first file node path if exists
    function findFirstFile(nodes: FileNode[]): string | null {
      for (const n of nodes) {
        if (n.type === "file" && n.path) return n.path;
        if (n.children) {
          const found = findFirstFile(n.children);
          if (found) return found;
        }
      }
      return null;
    }
    return findFirstFile(initialTree);
  });
  const [code, setCode] = useState<string>("");
  const [saveInfo, setSaveInfo] = useState<string>("");

  // Load active file content from localStorage or defaults
  useEffect(() => {
    if (!activeFilePath) return;
    setCode(getContent(activeFilePath));
    const unsub = subscribe(activeFilePath, (content) => setCode(content));
    return unsub;
  }, [activeFilePath, getContent, subscribe]);

  // 1) Mod-Enter 키 눌렀을 때 run 실행
  const runKeymap = keymap.of([
    {
      key: "Mod-Enter",
      run: () => {
        run(code);
        return true; // 기본 동작(엔터 입력 등) 막음
      },
    },
  ]);
  // 2) 기본 키맵 & 히스토리 키맵을 Extension 으로 변환
  const defaultKeymapExt = keymap.of(defaultKeymap);
  const historyKeymapExt = keymap.of(historyKeymap);

  const handleSave = useCallback(() => {
    if (!activeFilePath) return;
    setContent(activeFilePath, code);
    setSaveInfo(`${activeFilePath} 저장 완료`);
    setTimeout(() => setSaveInfo(""), 1500);
  }, [activeFilePath, code, setContent]);

  return (
    <FilesProvider
      initialDbFiles={files}
      initialDbContents={contents}
      currentUserId={userId}
    >
      <SidebarProvider>
        <FileExplorerSidebar
          activeFilePath={activeFilePath}
          onSelectFile={(p) => setActiveFilePath(p)}
          nodes={fileTree}
        />
        <SidebarInset>
          <div className="p-3 border-b flex items-center gap-2">
            <SidebarTrigger />
            <div className="text-sm text-muted-foreground truncate">
              {activeFilePath ?? "새 파일"}
            </div>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSave}
              disabled={!activeFilePath}
            >
              <SaveIcon className="w-4 h-4 mr-1" /> 저장
            </Button>
            <Button
              size="sm"
              onClick={() => run(code)}
              disabled={!loaded || !!error || !activeFilePath}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4 mr-1"
              >
                <path d="M5 3.879v16.242a1 1 0 0 0 1.555.832l12.243-8.12a1 1 0 0 0 0-1.664L6.555 3.047A1 1 0 0 0 5 3.879Z" />
              </svg>
              Run
            </Button>
          </div>
          <div className="p-4 space-y-3">
            {saveInfo ? (
              <div className="text-xs text-green-600">{saveInfo}</div>
            ) : null}
            {!hasFiles || !activeFilePath ? (
              <div className="text-sm text-muted-foreground">
                파일이 없습니다. 파일을 생성한 뒤 내용을 편집하세요.
              </div>
            ) : (
              <CodeMirror
                value={code}
                height="400px"
                extensions={[
                  runKeymap,
                  python(),
                  defaultKeymapExt,
                  historyKeymapExt,
                ]}
                onChange={(value) => setCode(value)}
                basicSetup={{
                  lineNumbers: true,
                  highlightActiveLine: true,
                  highlightActiveLineGutter: true,
                  indentOnInput: true,
                  bracketMatching: true,
                  foldGutter: true,
                  defaultKeymap: false,
                  history: true,
                  allowMultipleSelections: true,
                }}
                theme="light"
                style={{ border: "1px solid #ddd" }}
              />
            )}

            {!loaded && !error && (
              <span className="text-xs text-gray-500">Skulpt 로딩 중…</span>
            )}
            {error && (
              <span className="text-xs text-red-600">Skulpt 로딩 실패</span>
            )}

            <div>
              <h4 className="mb-1 text-xs font-semibold text-gray-700">콘솔</h4>
              <pre
                id="skulpt-output"
                className="p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32"
              >
                {output}
              </pre>
            </div>
            <div>
              <h4 className="mb-1 text-xs font-semibold text-gray-700">
                Turtle
              </h4>
              <div
                id="skulpt-canvas"
                ref={canvasRef}
                className="w-full border border-gray-200 rounded"
              />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </FilesProvider>
  );
}
