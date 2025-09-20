// src/hooks/use-skulpt-runner.ts
import { useEffect, useRef, useState } from "react";
import { useSkulpt } from "./use-skulpt"; // 기존 훅
// 파일 상단 또는 사용하기 전에 선언
declare global {
  interface Window {
    Sk: any;
  }
}

export function useSkulptRunner(preId: string = "skulpt-output") {
  const { loaded, error } = useSkulpt();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [output, setOutput] = useState<string>("");
  const currentRunIdRef = useRef<number>(0);
  const runCounterRef = useRef<number>(0);

  const run = (code: string) => {
    // 안전성 체크
    if (!loaded) {
      alert("Skulpt가 아직 로딩 중입니다.");
      return;
    }
    if (error) {
      console.error(error);
      alert("Skulpt 로딩 에러: " + error.message);
      return;
    }
    if (!canvasRef.current) {
      console.warn("Canvas 참조가 없습니다.");
      return;
    }

    // 1) 출력 초기화 및 실행 세션 id 고정
    setOutput("");
    const myRunId = ++runCounterRef.current;
    currentRunIdRef.current = myRunId;

    // 2) Skulpt용 output 함수
    const outf = (text: string) => {
      if (currentRunIdRef.current !== myRunId) return; // 정지/무효화된 실행 무시
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

    try {
      // 4) Skulpt 설정
      window.Sk.pre = preId;
      window.Sk.configure({ output: outf, read: builtinRead });

      // 5) Turtle 그래픽 설정 (개선된 버전)
      if (!window.Sk.TurtleGraphics) {
        window.Sk.TurtleGraphics = {};
      }

      // Canvas 컨테이너 완전 초기화
      canvasRef.current.innerHTML = "";

      // 고유한 canvas ID 생성 (중복 방지)
      const canvasId = `turtle-canvas-${Date.now()}`;
      canvasRef.current.id = canvasId;

      // 컨테이너 크기 측정
      const containerWidth = canvasRef.current.clientWidth || 600; // 기본값 설정
      const containerHeight = Math.floor((containerWidth * 3) / 4) || 450;

      // Skulpt TurtleGraphics 설정
      window.Sk.TurtleGraphics.target = canvasId;
      window.Sk.TurtleGraphics.width = containerWidth;
      window.Sk.TurtleGraphics.height = containerHeight;

      console.log("Turtle Graphics 설정:", {
        target: canvasId,
        width: containerWidth,
        height: containerHeight,
      });

      // 6) 코드 실행
      window.Sk.misceval
        .asyncToPromise(() =>
          window.Sk.importMainWithBody("<stdin>", false, code, true)
        )
        .then(() => {
          if (currentRunIdRef.current === myRunId) {
            console.log("Python 코드 실행 완료");
          }
        })
        .catch((err: any) => {
          if (currentRunIdRef.current === myRunId) {
            console.error("Python 실행 오류:", err);
            outf("\n" + err.toString());
          }
        });
    } catch (error) {
      console.error("Skulpt 설정 중 오류:", error);
      setOutput("실행 중 오류가 발생했습니다: " + error);
    }
  };

  const stop = () => {
    // 새 실행 id 로 무효화하여 이후 출력 무시
    currentRunIdRef.current = runCounterRef.current + 1;
    setOutput("");
    if (canvasRef.current) {
      canvasRef.current.innerHTML = "";
    }
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    const ro = new ResizeObserver(() => {
      // 안전성 체크
      if (
        !canvasRef.current ||
        !window.Sk ||
        !window.Sk.TurtleGraphics ||
        !loaded
      ) {
        return;
      }

      // 같은 로직으로 Skulpt 해상도 업데이트
      const w = canvasRef.current.clientWidth;
      window.Sk.TurtleGraphics.width = w;
      window.Sk.TurtleGraphics.height = Math.floor((w * 3) / 4);

      console.log("ResizeObserver: Turtle Graphics 크기 업데이트", {
        width: w,
        height: Math.floor((w * 3) / 4),
      });
    });
    ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, [canvasRef, loaded]);

  return { loaded, error, output, run, stop, canvasRef };
}
