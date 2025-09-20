import { useEffect, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { Button } from "~/common/components/ui/button";
import { useSkulptRunner } from "~/hooks/use-skulpt-runner";

export default function Playground() {
  const [code, setCode] = useState<string>("");
  const { loaded, error, output, run, stop, canvasRef } = useSkulptRunner();

  const STORAGE_KEY = "playground:code";
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved != null) setCode(saved);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, code);
      }, 300);
    } catch {}
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [code]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="text-sm text-muted-foreground">Playground</div>
        <div className="flex-1" />
        <Button
          size="sm"
          onClick={() => run(code)}
          disabled={!loaded || !!error}
        >
          실행
        </Button>
        <Button size="sm" variant="destructive" onClick={() => stop()}>
          정지
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
        <div>
          <CodeMirror
            placeholder={"파이썬 코드를 작성해주세요!"}
            value={code}
            height="420px"
            onChange={(value) => setCode(value)}
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
          <div className="mt-3">
            <h4 className="mb-1 text-xs font-semibold text-gray-700">콘솔</h4>
            <pre className="p-2 bg-gray-100 rounded text-xs overflow-auto max-h-48 md:max-h-80">
              {output}
            </pre>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {!loaded && !error && (
            <span className="text-xs text-gray-500">Skulpt 로딩 중…</span>
          )}
          {error && (
            <span className="text-xs text-red-600">Skulpt 로딩 실패</span>
          )}
          <div>
            <h4 className="mb-1 text-xs font-semibold text-gray-700">Turtle</h4>
            <div
              ref={canvasRef}
              className="w-full h-[220px] md:h-[500px] border border-gray-200 rounded"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
