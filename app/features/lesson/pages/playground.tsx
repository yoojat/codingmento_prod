// src/components/Playground.tsx
import { useState, useEffect } from "react";
import { useSkulptRunner } from "~/hooks/use-skulpt-runner";

export default function Playground() {
  const { loaded, error, output, run, canvasRef } = useSkulptRunner();
  const [code, setCode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("user-code") || `print("Hello World")`;
    }
    return `print("Hello World")`;
  });

  useEffect(() => {
    const saved = localStorage.getItem("user-code");
    if (saved) setCode(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("user-code", code);
  }, [code]);

  return (
    <div style={{ padding: "1rem" }}>
      <h3>🐢 Skulpt Python Runner</h3>

      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        rows={10}
        cols={60}
        style={{ fontFamily: "monospace", fontSize: "1rem" }}
      />

      <br />
      <button onClick={() => run(code)} disabled={!loaded || !!error}>
        ▶️ Run
      </button>

      {!loaded && !error && <p>Skulpt 로딩 중…</p>}
      {error && (
        <p style={{ color: "red" }}>Skulpt 로딩 실패: {error.message}</p>
      )}

      {/* 출력용 <pre> */}
      <pre
        id="skulpt-output"
        style={{
          background: "#f3f3f3",
          padding: "1em",
          marginTop: "1em",
          whiteSpace: "pre-wrap",
        }}
      >
        {output}
      </pre>

      {/* Turtle 그래픽용 <div> */}
      <div
        id="skulpt-canvas"
        ref={canvasRef}
        style={{
          width: "800px",
          height: "600px",
          border: "1px solid #ccc",
          marginTop: "1em",
        }}
      />
    </div>
  );
}
