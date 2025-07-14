// src/components/PyEditor.tsx
import React, { useEffect, useState } from "react";

// 타입만 선언하고 실제 구현은 클라이언트에서 동적으로 로드
interface PyodideInterface {
  runPythonAsync: (code: string) => Promise<any>;
}

export default function PyEditor() {
  const [pyodide, setPyodide] = useState<PyodideInterface | null>(null);
  const [code, setCode] = useState(`print("Hello, Pyodide!")`);
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 클라이언트 사이드에서만 실행
    if (typeof window === "undefined") return;

    const loadPyodide = async () => {
      try {
        setIsLoading(true);
        // 동적으로 스크립트를 로드
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/pyodide/v0.23.2/full/pyodide.js";
        script.async = true;
        script.onload = async () => {
          // @ts-ignore - window.loadPyodide는 스크립트가 로드된 후 사용 가능
          const pyodideInstance = await window.loadPyodide();
          setPyodide(pyodideInstance);
          setIsLoading(false);
        };
        script.onerror = () => {
          console.error("Failed to load Pyodide");
          setOutput("Pyodide 로딩 실패. 브라우저에서 실행해주세요.");
          setIsLoading(false);
        };
        document.body.appendChild(script);
      } catch (error) {
        console.error("Error loading Pyodide:", error);
        setOutput("Pyodide 로딩 실패. 브라우저에서 실행해주세요.");
        setIsLoading(false);
      }
    };

    loadPyodide();
  }, []);

  const run = async () => {
    if (!pyodide) return;
    try {
      const result = await pyodide.runPythonAsync(code);
      setOutput(String(result));
    } catch (err: any) {
      setOutput(err.toString());
    }
  };

  return (
    <div className="py-4">
      <textarea
        rows={10}
        cols={60}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="w-full p-2 font-mono text-sm border border-gray-300 rounded"
      />
      <div className="mt-3">
        <button
          onClick={run}
          disabled={!pyodide || isLoading}
          className="px-4 py-2 text-black bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isLoading ? "Pyodide 로딩 중..." : "실행"}
        </button>
      </div>
      <div className="mt-4">
        <h3 className="mb-2 font-semibold">실행 결과:</h3>
        <pre className="p-3 overflow-auto bg-gray-100 rounded">{output}</pre>
      </div>
    </div>
  );
}
