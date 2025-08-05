// src/hooks/useSkulpt.ts
import { useState, useEffect } from "react";

const SKULPT_URL =
  "https://cdn.jsdelivr.net/npm/skulpt@latest/dist/skulpt.min.js";
const SKULPT_STD_URL =
  "https://cdn.jsdelivr.net/npm/skulpt@latest/dist/skulpt-stdlib.js";

/**
 * 주어진 URL의 script 태그를 body에 추가하고,
 * 로드가 완료되면 resolve, 실패하면 reject 하는 Promise를 반환합니다.
 * 동일 src가 이미 로드되어 있다면 추가 로드를 방지하고 바로 resolve 합니다.
 */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // 이미 삽입된 스크립트가 있는지 확인
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`
    );
    if (existing) {
      // 로드가 끝났으면 바로 resolve
      if (existing.getAttribute("data-loaded") === "true") {
        resolve();
      } else {
        // 아직 로딩 중이면 이벤트 리스너로 대기
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () =>
          reject(new Error(`Failed to load ${src}`))
        );
      }
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = false; // 순서 보장
    script.onload = () => {
      script.setAttribute("data-loaded", "true");
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

/**
 * useSkulpt Hook
 * - 컴포넌트 마운트 시 Skulpt 엔진과 stdlib를 순차 로드
 * - loaded: 로드가 완료되면 true
 * - error: 로드 중 에러가 발생하면 해당 Error 객체
 */
export function useSkulpt(): {
  loaded: boolean;
  error: Error | null;
} {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAll() {
      try {
        await loadScript(SKULPT_URL);
        await loadScript(SKULPT_STD_URL);
        if (isMounted) setLoaded(true);
      } catch (err: any) {
        if (isMounted) setError(err);
      }
    }

    loadAll();

    return () => {
      isMounted = false;
    };
  }, []);

  return { loaded, error };
}
