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
import { useFiles } from "~/hooks/use-files";

export default function Playground() {
  const { loaded, error, output, run, canvasRef } = useSkulptRunner();
  const { getContent, setContent, subscribe } = useFiles();

  // Mock file system tree (will be replaced by DB later)
  const initialTree: FileNode[] = useMemo(
    () => [
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
    ],
    []
  );

  const [fileTree] = useState<FileNode[]>(initialTree);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(
    "/project/main.py"
  );
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
          <Button size="sm" variant="secondary" onClick={handleSave}>
            <SaveIcon className="w-4 h-4 mr-1" /> 저장
          </Button>
          <Button
            size="sm"
            onClick={() => run(code)}
            disabled={!loaded || !!error}
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
            <h4 className="mb-1 text-xs font-semibold text-gray-700">Turtle</h4>
            <div
              id="skulpt-canvas"
              ref={canvasRef}
              className="w-full border border-gray-200 rounded"
            />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
