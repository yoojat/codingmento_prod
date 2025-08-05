// src/hooks/use-skulpt-runner.ts
import { useRef, useState } from "react";
import { useSkulpt } from "./use-skulpt"; // 기존 훅
// 파일 상단 또는 사용하기 전에 선언
declare global {
  interface Window {
    Sk: any;
  }
}

export function useSkulptRunner() {
  const { loaded, error } = useSkulpt();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [output, setOutput] = useState<string>("");

  const run = (code: string) => {
    if (!loaded) {
      alert("Skulpt가 아직 로딩 중입니다.");
      return;
    }
    if (error) {
      console.error(error);
      alert("Skulpt 로딩 에러: " + error.message);
      return;
    }

    // 1) 출력 초기화
    setOutput("");

    // 2) Skulpt용 output 함수
    const outf = (text: string) => {
      setOutput((prev) => prev + text);
    };

    // 3) Skulpt용 read 함수
    const builtinRead = (x: string) => {
      if (
        window.Sk.builtinFiles === undefined ||
        window.Sk.builtinFiles["files"][x] === undefined
      ) {
        throw new Error("File not found: '" + x + "'");
      }
      return window.Sk.builtinFiles["files"][x];
    };

    // 4) Skulpt 설정
    window.Sk.pre = "skulpt-output";
    window.Sk.configure({ output: outf, read: builtinRead });

    // 5) Turtle 그래픽 타겟 지정
    if (!window.Sk.TurtleGraphics) {
      window.Sk.TurtleGraphics = {};
    }
    window.Sk.TurtleGraphics.target = canvasRef.current?.id || "";

    // 6) 코드 실행
    window.Sk.misceval
      .asyncToPromise(() =>
        window.Sk.importMainWithBody("<stdin>", false, code, true)
      )
      .catch((err: any) => {
        outf("\n" + err.toString());
      });
  };

  return { loaded, error, output, run, canvasRef };
}
