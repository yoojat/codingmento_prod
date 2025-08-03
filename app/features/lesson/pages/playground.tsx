import { useEffect, useRef, useState } from "react";
// 파일 상단 또는 사용하기 전에 선언
declare global {
  interface Window {
    Sk: any;
  }
}
export default function Playground() {
  const [code, setCode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("user-code") || `print("Hello World")`;
    }
    return `print("Hello World")`; // SSR 시 기본값
  });
  const outputRef = useRef<HTMLPreElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // 외부 스크립트 로딩
  useEffect(() => {
    const loadScript = (src: string): Promise<void> =>
      new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.async = false; // ✅ 순서 보장
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.body.appendChild(script);
      });

    async function loadSkulpt() {
      try {
        await loadScript(
          "https://cdn.jsdelivr.net/npm/skulpt@latest/dist/skulpt.min.js"
        );
        await loadScript(
          "https://cdn.jsdelivr.net/npm/skulpt@latest/dist/skulpt-stdlib.js"
        );
        console.log("Skulpt scripts loaded.");
      } catch (err) {
        console.error(err);
      }
    }

    loadSkulpt();
  }, []);
  const runCode = () => {
    if (!window.Sk || !window.Sk.misceval) {
      alert("Skulpt가 아직 준비되지 않았습니다.");
      return;
    }

    if (outputRef.current) {
      outputRef.current.innerText = "";
    }

    function outf(text: string) {
      if (outputRef.current) {
        outputRef.current.innerText += text;
      }
    }

    function builtinRead(x: string) {
      if (
        window.Sk.builtinFiles === undefined ||
        window.Sk.builtinFiles["files"][x] === undefined
      ) {
        throw "File not found: '" + x + "'";
      }
      return window.Sk.builtinFiles["files"][x];
    }

    window.Sk.pre = "output";
    window.Sk.configure({
      output: outf,
      read: builtinRead,
    });

    // Turtle 타겟을 지정
    if (!window.Sk.TurtleGraphics) {
      window.Sk.TurtleGraphics = {};
    }
    window.Sk.TurtleGraphics.target = canvasRef.current?.id;

    const myPromise = window.Sk.misceval.asyncToPromise(() =>
      window.Sk.importMainWithBody("<stdin>", false, code, true)
    );

    myPromise.then(
      () => {
        console.log("Success");
      },
      (err: any) => {
        console.log(err.toString());
        if (outputRef.current) {
          outputRef.current.innerText += "\n" + err.toString();
        }
      }
    );
  };

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
      <button onClick={runCode}>▶️ Run</button>
      <pre
        id="output"
        ref={outputRef}
        style={{ background: "#f3f3f3", padding: "1em", marginTop: "1em" }}
      />
      <div
        id="mycanvas"
        ref={canvasRef}
        style={{
          width: "800px",
          height: "600px",
          border: "1px solid #ccc",
          marginTop: "1em",
        }}
      ></div>
    </div>
  );
}
