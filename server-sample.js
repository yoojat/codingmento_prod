import http from "http";
import { Server as SocketIOServer } from "socket.io";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUILD_DIR = path.resolve("./build");
const app = express();

app.use(express.static(path.join(BUILD_DIR, "public"), { maxAge: "1h" }));
app.use(express.static(path.join(BUILD_DIR, "client"), { maxAge: "1h" }));

const httpServer = http.createServer(app);
const wsServer = new SocketIOServer(httpServer, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://admin.socket.io",
    ],
    credentials: true,
  },
});

// 방별 사용자 관리
const rooms = new Map(); // roomName -> Map<userId, {socketId, nickname, joinedAt}>

// userId로 소켓 찾기
const findSocketByUserId = (userId) => {
  for (const [socketId, socket] of wsServer.sockets.sockets) {
    if (socket.userId === userId) {
      return socket;
    }
  }
  return null;
};

wsServer.on("connection", (socket) => {
  console.log("🟢 Socket.IO 클라이언트 연결:", socket.id);

  socket.on("join_room", ({ roomName, userId, nickname }) => {
    console.log(`📥 ${userId}(${nickname}) joining room: ${roomName}`);

    // 소켓에 사용자 정보 저장
    socket.userId = userId;
    socket.nickname = nickname;
    socket.currentRoom = roomName;

    // 방 참가
    socket.join(roomName);

    // 방 초기화
    if (!rooms.has(roomName)) {
      rooms.set(roomName, new Map());
    }

    const roomUsers = rooms.get(roomName);

    // 기존 사용자 목록을 새 사용자에게 전송
    const existingUsers = Array.from(roomUsers.values()).map((user) => ({
      id: user.userId,
      nickname: user.nickname,
      joinedAt: user.joinedAt,
    }));

    socket.emit("room_users", existingUsers);

    // 기존 사용자들에게 새 사용자 입장 알림
    socket.to(roomName).emit("user_joined", {
      id: userId,
      nickname: nickname,
    });

    // 새 사용자를 방에 추가
    roomUsers.set(userId, {
      socketId: socket.id,
      userId: userId,
      nickname: nickname,
      joinedAt: new Date(),
    });

    console.log(`📤 Room ${roomName} now has ${roomUsers.size} users`);
  });

  // 1:1 시그널링 - Offer
  socket.on("offer", (offer, fromUserId, toUserId) => {
    console.log(`📥 Offer from ${fromUserId} to ${toUserId}`);
    const targetSocket = findSocketByUserId(toUserId);
    if (targetSocket) {
      targetSocket.emit("offer", offer, fromUserId, toUserId);
      console.log(`📤 Offer forwarded to ${toUserId}`);
    }
  });

  // 1:1 시그널링 - Answer
  socket.on("answer", (answer, fromUserId, toUserId) => {
    console.log(`📥 Answer from ${fromUserId} to ${toUserId}`);
    const targetSocket = findSocketByUserId(toUserId);
    if (targetSocket) {
      targetSocket.emit("answer", answer, fromUserId, toUserId);
      console.log(`📤 Answer forwarded to ${toUserId}`);
    }
  });

  // 1:1 시그널링 - ICE Candidate
  socket.on("ice", (candidate, fromUserId, toUserId) => {
    console.log(`📥 ICE candidate from ${fromUserId} to ${toUserId}`);
    const targetSocket = findSocketByUserId(toUserId);
    if (targetSocket) {
      targetSocket.emit("ice", candidate, fromUserId, toUserId);
    }
  });

  // 데이터 채널 메시지
  socket.on("data_message", (message, fromUserId, toUserId) => {
    const targetSocket = findSocketByUserId(toUserId);
    if (targetSocket) {
      targetSocket.emit("data_message", message, fromUserId);
    }
  });

  // 연결 해제 처리
  socket.on("disconnect", () => {
    console.log("🔴 Socket.IO 클라이언트 해제:", socket.id);

    if (socket.currentRoom && socket.userId) {
      const roomUsers = rooms.get(socket.currentRoom);
      if (roomUsers) {
        roomUsers.delete(socket.userId);

        // 방에 남은 사용자들에게 퇴장 알림
        socket.to(socket.currentRoom).emit("user_left", socket.userId);

        console.log(`📤 User ${socket.userId} left room ${socket.currentRoom}`);

        // 방이 비었으면 삭제
        if (roomUsers.size === 0) {
          rooms.delete(socket.currentRoom);
          console.log(`🗑️  Empty room ${socket.currentRoom} deleted`);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 서버 실행 중 → http://localhost:${PORT}`);
});
