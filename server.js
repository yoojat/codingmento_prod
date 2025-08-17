// // server.js
// import path from "path";
// import express from "express";
// import { createServer } from "http";
// import { Server as SocketIOServer } from "socket.io";
// import { instrument } from "@socket.io/admin-ui";

// // 1) React Router 빌드 산출물이 위치한 디렉터리
// const BUILD_DIR = path.resolve("./build");

// // 2) Express 앱 초기화
// const app = express();

// // 3) 정적 자원 서빙
// app.use(express.static(path.join(BUILD_DIR, "public"), { maxAge: "1h" }));
// app.use(express.static(path.join(BUILD_DIR, "client"), { maxAge: "1h" }));

// // 4) HTTP + Socket.IO 서버 래핑
// const httpServer = createServer(app);
// const wsServer = new SocketIOServer(httpServer, {
//   cors: {
//     origin: ["https://admin.socket.io"],
//     credentials: true,
//   },
// });
// instrument(wsServer, {
//   auth: false,
//   mode: "development",
// });

// function publicRooms() {
//   const {
//     sockets: {
//       adapter: { sids, rooms },
//     },
//   } = wsServer;
//   const publicRooms = [];
//   rooms.forEach((_, key) => {
//     if (sids.get(key) === undefined) {
//       publicRooms.push(key);
//     }
//   });
//   return publicRooms;
// }

// function countRoom(roomName) {
//   return wsServer.sockets.adapter.rooms.get(roomName)?.size;
// }

// wsServer.on("connection", (socket) => {
//   console.log("🟢 Socket.IO 클라이언트 연결:", socket.id);
//   socket["nickname"] = "anonymous";
//   socket.onAny((event, ...args) => {
//     // console.log(`🟢 ${event} 이벤트 발생:`, args);
//   });
//   wsServer.sockets.emit("room_change", publicRooms());
//   // socket.on("chat", (msg) => io.emit("chat", msg));
//   socket.on("disconnect", () =>
//     console.log("🔴 Socket.IO 클라이언트 해제:", socket.id)
//   );
//   socket.on("enter_room", (roomName, done) => {
//     console.log("enter_room", roomName);
//     socket.join(roomName);
//     done(countRoom(roomName));
//     socket.to(roomName).emit("welcome", socket.nickname, countRoom(roomName));
//     // 자신을 제외한 모든 사용자에게 입장 메시지 전송

//     wsServer.sockets.emit("room_change", publicRooms());
//   });
//   socket.on("disconnecting", () => {
//     socket.rooms.forEach((room) => {
//       socket.to(room).emit("bye", socket["nickname"], countRoom(room) - 1);
//     });
//   });
//   socket.on("disconnect", () => {
//     wsServer.sockets.emit("room_change", publicRooms());
//   });
//   // socket.on("new_message", (msg, room, done) => {
//   //   socket.to(room).emit("new_message", `${socket.nickname} : ${msg}`);
//   //   done();
//   // });
//   socket.on("nickname", (nickname) => {
//     socket["nickname"] = nickname;
//   });
//   socket.on("offer", (offer, room) => {
//     socket.to(room).emit("offer", offer);
//   });
//   socket.on("answer", (answer, room) => {
//     socket.to(room).emit("answer", answer);
//   });
//   socket.on("ice", (ice, room) => {
//     console.log("ice emit received");
//     console.log("ice emit received : ", room);
//     console.log("ice : ", ice);
//     socket.to(room).emit("ice", ice);
//   });
// });

// if (process.env.NODE_ENV === "production") {
//   const { createRequestHandler } = await import("@react-router/express");
//   const BUILD_DIR = path.resolve("./build");
//   const serverBuild = await import("./build/server/index.js");

//   app.use(express.static(path.join(BUILD_DIR, "client"), { maxAge: "1h" }));
//   app.all(
//     /.*/, // 슬래시 포함 모든 경로
//     createRequestHandler({
//       build: serverBuild,
//       mode: process.env.NODE_ENV || "development",
//     })
//   );
// }

// // 5) 문자열 패턴 대신 정규식으로

// // 6) 서버 시작
// const PORT = process.env.PORT || 3001;
// httpServer.listen(PORT, () => {
//   console.log(`🚀 서버 실행 중 → http://localhost:${PORT}`);
// });

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

wsServer.on("connection", (socket) => {
  console.log("🟢 Socket.IO 클라이언트 연결:", socket.id);

  socket.on("join_room", (roomName) => {
    console.log(`📥 ${socket.id} joining room: ${roomName}`);
    socket.join(roomName);

    // 방에 있는 다른 사용자들에게 새 사용자 입장 알림
    socket.to(roomName).emit("welcome");
    console.log(`📤 Sent welcome to room: ${roomName}`);
  });

  socket.on("offer", (offer, roomName) => {
    console.log(`📥 Received offer for room: ${roomName}`);
    socket.to(roomName).emit("offer", offer);
  });

  socket.on("answer", (answer, roomName) => {
    console.log(`📥 Received answer for room: ${roomName}`);
    socket.to(roomName).emit("answer", answer);
  });

  socket.on("ice", (ice, roomName) => {
    console.log(`📥 Received ICE candidate for room: ${roomName}`);
    socket.to(roomName).emit("ice", ice);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Socket.IO 클라이언트 해제:", socket.id);
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
