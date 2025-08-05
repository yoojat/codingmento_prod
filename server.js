// server.js
import path from "path";
import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import * as serverBuild from "./build/server/index.js";

// 1) React Router 빌드 산출물이 위치한 디렉터리
const BUILD_DIR = path.resolve("./build");

// 2) Express 앱 초기화
const app = express();

// 3) 정적 자원 서빙
app.use(express.static(path.join(BUILD_DIR, "public"), { maxAge: "1h" }));
app.use(express.static(path.join(BUILD_DIR, "client"), { maxAge: "1h" }));

// 4) HTTP + Socket.IO 서버 래핑
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log("🟢 Socket.IO 클라이언트 연결:", socket.id);
  socket.on("chat", (msg) => io.emit("chat", msg));
  socket.on("disconnect", () =>
    console.log("🔴 Socket.IO 클라이언트 해제:", socket.id)
  );
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
