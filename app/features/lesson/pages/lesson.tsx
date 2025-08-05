import { useEffect, useState } from "react";
import { useSocket } from "../../../hooks/use-socket";

export default function Lesson() {
  const socket = useSocket();
  const [roomName, setRoomName] = useState("");
  function backendDone(msg: string) {
    console.log(`The backend says: `, msg);
  }

  // 폼 제출 핸들러 (enter_room 이벤트 전송)
  const handleRoomSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!socket) return;

    socket.emit("enter_room", roomName, backendDone);

    // 입력 초기화
    setRoomName("");
  };
  return (
    <div>
      <div id="welcome" className="mb-4">
        <h2 className="text-2xl font-bold">방번호를 입력해주세요!</h2>
        <p>방번호를 입력하면 방에 입장합니다.</p>
      </div>

      <form onSubmit={handleRoomSubmit} className="flex space-x-2">
        <input
          type="text"
          required
          placeholder="방번호"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          className="border px-2 py-1 flex-1"
        />
        <button
          type="submit"
          className="px-4 py-1 bg-blue-600 text-white rounded"
          disabled={!socket}
        >
          입장
        </button>
      </form>
    </div>
  );
}
