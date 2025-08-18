// server.js
import path from "path";
import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";

// 1) React Router 빌드 산출물이 위치한 디렉터리
const BUILD_DIR = path.resolve("./build");

// 2) Express 앱 초기화
const app = express();

// 3) 정적 자원 서빙
app.use(express.static(path.join(BUILD_DIR, "public"), { maxAge: "1h" }));
app.use(express.static(path.join(BUILD_DIR, "client"), { maxAge: "1h" }));

// 4) HTTP + Socket.IO 서버 래핑
const httpServer = createServer(app);
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

    // 방 초기화, 없으면 만들어줌
    if (!rooms.has(roomName)) {
      rooms.set(roomName, new Map());
    }

    // 방에 있는 사용자 목록 가져오기
    const roomUsers = rooms.get(roomName);

    // 방에 있는 사용자 목록을 배열로 변환
    const existingUsers = Array.from(roomUsers.values()).map((user) => ({
      id: user.userId,
      nickname: user.nickname,
      joinedAt: user.joinedAt,
    }));

    socket.emit("room_users", existingUsers);

    // 기존 사용자들에게 새 사용자 입장 알림
    socket.to(roomName).emit("user_joined", {
      id: userId,
      nickname,
    });

    // 새 사용자를 방에 추가
    roomUsers.set(userId, {
      socketId: socket.id,
      userId,
      nickname,
      joinedAt: new Date(),
    });

    // 방에 있는 사용자 목록을 배열로 변환
  });

  socket.on("offer", (offer, fromUserId, toUserId) => {
    console.log(`📥 Offer from ${fromUserId} to ${toUserId}`);
    const targetSocket = findSocketByUserId(toUserId);
    if (targetSocket) {
      targetSocket.emit("offer", offer, fromUserId, toUserId);
      console.log(`📤 Offer sent to ${toUserId}`);
    }
  });

  socket.on("answer", (answer, fromUserId, toUserId) => {
    console.log(`📥 Answer from ${fromUserId} to ${toUserId}`);
    const targetSocket = findSocketByUserId(toUserId);
    if (targetSocket) {
      targetSocket.emit("answer", answer, fromUserId, toUserId);
      console.log(`📤 Answer sent to ${toUserId}`);
    }
  });

  socket.on("ice", (candidate, fromUserId, toUserId) => {
    console.log(`📥 ICE candidate from ${fromUserId} to ${toUserId}`);
    const targetSocket = findSocketByUserId(toUserId);
    if (targetSocket) {
      targetSocket.emit("ice", candidate, fromUserId, toUserId);
    }
  });

  socket.on("disconnect", () => {
    console.log("🔴 Socket.IO 클라이언트 해제:", socket.id);
    if (socket.userId) {
      const roomUsers = rooms.get(socket.currentRoom);
      if (roomUsers) {
        roomUsers.delete(socket.userId);
        socket.to(socket.currentRoom).emit("user_left", socket.userId);
      }
    }
  });

  socket.on("user_left", (userId) => {
    console.log("🔴 User left:", userId);
    const roomUsers = rooms.get(socket.currentRoom);
    if (roomUsers) {
      roomUsers.delete(userId);
      socket.to(socket.currentRoom).emit("user_left", userId);
    }
  });
});

if (process.env.NODE_ENV === "production") {
  const { createRequestHandler } = await import("@react-router/express");
  const BUILD_DIR = path.resolve("./build");
  const serverBuild = await import("./build/server/index.js");

  app.use(express.static(path.join(BUILD_DIR, "client"), { maxAge: "1h" }));
  app.all(
    /.*/, // 슬래시 포함 모든 경로
    createRequestHandler({
      build: serverBuild,
      mode: process.env.NODE_ENV || "development",
    })
  );
}

// 5) 문자열 패턴 대신 정규식으로

// 6) 서버 시작
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 서버 실행 중 → http://localhost:${PORT}`);
});
