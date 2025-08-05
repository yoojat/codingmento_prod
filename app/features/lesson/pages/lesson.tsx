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

  return (
    <div>
      <div id="welcome">
        <h2>Welcome to the Chat!!</h2>
        <p>Please enter your room to continue</p>
      </div>
      <form>
        <input id="message-input" placeholder="room name" />
        <button id="send-button">Enter Room</button>
      </form>
    </div>
  );
}
