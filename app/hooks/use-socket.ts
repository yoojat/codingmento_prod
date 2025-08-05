// src/hooks/useSocket.ts
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

export function useSocket() {
  const ref = useRef<Socket | null>(null);
  useEffect(() => {
    const socket = io("http://localhost:3001", {
      transports: ["websocket"],
    });
    ref.current = socket;
    socket.on("connect", () => console.log("Socket connected", socket.id));
    return () => {
      socket.disconnect();
    };
  }, []);
  return ref.current;
}
