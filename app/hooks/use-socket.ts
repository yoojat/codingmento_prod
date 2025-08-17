// src/hooks/useSocket.ts
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

export function useSocket(): Socket | null {
  const socketRef = useRef<Socket | null>(null);
  useEffect(() => {
    const socket = io(
      import.meta.env.VITE_SOCKET_URL ?? window.location.origin,
      {
        transports: ["websocket"],
      }
    );
    socketRef.current = socket;
    socket.on("connect", () => console.log("Socket connected", socket.id));

    return () => {
      socket.disconnect();
    };
  }, []);
  return socketRef.current;
}
