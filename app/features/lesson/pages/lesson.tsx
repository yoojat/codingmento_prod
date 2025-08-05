import { useEffect } from "react";
import { useSocket } from "../../../hooks/use-socket";

export default function Lesson() {
  const socket = useSocket();

  useEffect(() => {
    if (socket) {
      socket.on("connect", () =>
        console.log("🔌 Socket.IO 연결됨:", socket.id)
      );
    }
  }, [socket]);

  return <div>Lesson</div>;
}
