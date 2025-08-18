import { useState, useEffect } from "react";
import { useSkulptRunner } from "~/hooks/use-skulpt-runner";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { keymap } from "@codemirror/view";
import { defaultKeymap, historyKeymap } from "@codemirror/commands";
import { Button } from "~/common/components/ui/button";

interface PythonEditorProps {
  initialCode?: string;
  onCodeChange?: (code: string) => void;
  height?: string;
  className?: string;
}

export default function PythonEditor({
  initialCode = `print("Hello World")`,
  onCodeChange,
  height = "300px",
  className = "",
}: PythonEditorProps) {
  const { loaded, error, output, run, canvasRef } = useSkulptRunner();
  const [code, setCode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("user-code") || initialCode;
    }
    return initialCode;
  });

  useEffect(() => {
    const saved = localStorage.getItem("user-code");
    if (saved) setCode(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("user-code", code);
    onCodeChange?.(code);
  }, [code, onCodeChange]);

  // Cmd/Ctrl + Enter 키로 실행
  const runKeymap = keymap.of([
    {
      key: "Mod-Enter",
      run: () => {
        run(code);
        return true;
      },
    },
  ]);

  const defaultKeymapExt = keymap.of(defaultKeymap);
  const historyKeymapExt = keymap.of(historyKeymap);

  const handleRun = () => {
    run(code);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">🐍 Python 에디터</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Ctrl/Cmd + Enter로 실행</span>
          <Button
            onClick={handleRun}
            disabled={!loaded || !!error}
            size="sm"
            className="bg-green-600 hover:bg-green-700"
          >
            ▶️ 실행
          </Button>
        </div>
      </div>

      {/* 에디터 */}
      <div className="border rounded-lg overflow-hidden">
        <CodeMirror
          value={code}
          height={height}
          extensions={[runKeymap, python(), defaultKeymapExt, historyKeymapExt]}
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
          className="text-sm"
        />
      </div>

      {/* 상태 표시 */}
      {!loaded && !error && (
        <div className="text-center py-2">
          <span className="text-sm text-gray-500">Skulpt 로딩 중...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-600 text-sm">
            Skulpt 로딩 실패: {error.message}
          </p>
        </div>
      )}

      {/* 출력 영역 */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">출력:</h4>
        <pre
          id="skulpt-output"
          className="bg-gray-50 border rounded-lg p-4 text-sm font-mono whitespace-pre-wrap min-h-[100px] overflow-auto"
        >
          {output || "코드를 실행하면 결과가 여기에 표시됩니다."}
        </pre>
      </div>

      {/* Turtle 그래픽 영역 */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">그래픽 출력:</h4>
        <div
          id="skulpt-canvas"
          ref={canvasRef}
          className="w-full border rounded-lg p-2 bg-white min-h-[200px] flex items-center justify-center text-gray-400 text-sm"
          style={{
            maxWidth: "100%",
            position: "relative",
          }}
        >
          turtle 모듈을 사용하면 그래픽이 여기에 표시됩니다.
        </div>
      </div>
    </div>
  );
}
