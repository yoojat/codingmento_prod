import { useEffect } from "react";
import type { Socket } from "socket.io-client";

interface RoomUser {
  id: string;
  nickname: string;
  joinedAt?: Date;
}

interface ConnectedUserState {
  nickname: string;
  isVideoOn: boolean;
  isAudioOn: boolean;
}

type CreatePeerConnection = (
  userId: string,
  isInitiator?: boolean
) => Promise<RTCPeerConnection>;

type ClosePeerConnection = (userId: string) => void;

interface UseRoomSignalingArgs {
  socket: Socket | null;
  myUserId: string;
  createPeerConnection: CreatePeerConnection;
  closePeerConnection: ClosePeerConnection;
  peerConnections: React.RefObject<Map<string, RTCPeerConnection>>;
  setConnectedUsers: React.Dispatch<
    React.SetStateAction<Map<string, ConnectedUserState>>
  >;
}

export function useRoomSignaling({
  socket,
  myUserId,
  createPeerConnection,
  closePeerConnection,
  peerConnections,
  setConnectedUsers,
}: UseRoomSignalingArgs) {
  useEffect(() => {
    if (!socket) return;

    socket.on("connect", () => {
      console.log("🟢 Socket.IO 서버 연결 성공:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("🔴 Socket.IO 서버 연결 해제");
    });

    socket.on("room_users", async (existingUsers: RoomUser[]) => {
      console.log("📥 Existing users:", existingUsers);

      for (const user of existingUsers) {
        if (user.id !== myUserId) {
          // 기존 사용자와 연결 (내가 initiator)
          const peerConnection = await createPeerConnection(user.id, true);

          setConnectedUsers((previous) =>
            new Map(previous).set(user.id, {
              nickname: user.nickname,
              isVideoOn: true,
              isAudioOn: true,
            })
          );

          try {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            console.log(`📤 Sending offer to ${user.id}`);
            socket.emit("offer", offer, myUserId, user.id);
          } catch (error) {
            console.error("Error creating offer:", error);
          }
        }
      }
    });

    socket.on("user_joined", async (newUser: RoomUser) => {
      console.log("📥 New user joined:", newUser);

      if (newUser.id !== myUserId) {
        // 새 사용자와 연결 준비 (receiver)
        await createPeerConnection(newUser.id, false);
        setConnectedUsers((previous) =>
          new Map(previous).set(newUser.id, {
            nickname: newUser.nickname,
            isVideoOn: true,
            isAudioOn: true,
          })
        );
      }
    });

    socket.on("user_left", (userId: string) => {
      console.log("📥 User left:", userId);
      closePeerConnection(userId);
    });

    socket.on(
      "offer",
      async (
        offer: RTCSessionDescriptionInit,
        fromUserId: string,
        toUserId: string
      ) => {
        if (toUserId !== myUserId) return;

        console.log(`📥 Received offer from ${fromUserId}`);
        const peerConnection = peerConnections.current.get(fromUserId);
        if (peerConnection) {
          try {
            await peerConnection.setRemoteDescription(offer);
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            console.log(`📤 Sending answer to ${fromUserId}`);
            socket.emit("answer", answer, myUserId, fromUserId);
          } catch (error) {
            console.error("Error handling offer:", error);
          }
        }
      }
    );

    socket.on(
      "answer",
      async (
        answer: RTCSessionDescriptionInit,
        fromUserId: string,
        toUserId: string
      ) => {
        if (toUserId !== myUserId) return;

        console.log(`📥 Received answer from ${fromUserId}`);
        const peerConnection = peerConnections.current.get(fromUserId);
        if (peerConnection) {
          try {
            await peerConnection.setRemoteDescription(answer);
          } catch (error) {
            console.error("Error handling answer:", error);
          }
        }
      }
    );

    socket.on(
      "ice",
      async (
        candidate: RTCIceCandidateInit,
        fromUserId: string,
        toUserId: string
      ) => {
        if (toUserId !== myUserId) return;

        console.log(`📥 Received ICE candidate from ${fromUserId}`);
        const peerConnection = peerConnections.current.get(fromUserId);
        if (peerConnection && candidate) {
          try {
            await peerConnection.addIceCandidate(candidate);
          } catch (error) {
            console.error("Error adding ICE candidate:", error);
          }
        }
      }
    );

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("room_users");
      socket.off("user_joined");
      socket.off("user_left");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice");
    };
  }, [
    socket,
    myUserId,
    createPeerConnection,
    closePeerConnection,
    peerConnections,
    setConnectedUsers,
  ]);
}
