// src/hooks/useSocket.ts
import { useRef, useEffect } from "react";
import { io, Socket } from "socket.io-client";

export function useSocket(): Socket | null {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io({
      path: "/socket.io",
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", () => console.log("🔌 Socket.IO 연결됨:", socket.id));

    return () => {
      socket.disconnect();
    };
  }, []);

  return socketRef.current;
}
