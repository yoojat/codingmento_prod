import { useCallback, useRef } from "react";
import type { Socket } from "socket.io-client";

interface ChatMessage {
  id: string;
  userId: string;
  nickname: string;
  message: string;
  timestamp: Date;
}

interface UserState {
  nickname: string;
  isVideoOn: boolean;
  isAudioOn: boolean;
}

interface EditorUpdate {
  userId: string;
  content: string;
}

interface UsePeerConnectionsArgs {
  socket: Socket | null;
  myUserId: string;
  myStreamRef: React.RefObject<MediaStream | null>;
  setConnectedUsers: React.Dispatch<
    React.SetStateAction<Map<string, UserState>>
  >;
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setEditorContents?: React.Dispatch<React.SetStateAction<Map<string, string>>>;
  getLocalEditorContent?: () => string;
}

export function usePeerConnections({
  socket,
  myUserId,
  myStreamRef,
  setConnectedUsers,
  setChatMessages,
  setEditorContents,
  getLocalEditorContent,
}: UsePeerConnectionsArgs) {
  // Connections and channels
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const dataChannels = useRef<Map<string, RTCDataChannel>>(new Map());

  // Remote media refs
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const remoteStreams = useRef<Map<string, MediaStream>>(new Map());

  const setupDataChannel = useCallback(
    (dataChannel: RTCDataChannel, userId: string) => {
      dataChannel.onopen = () => {
        console.log(`Data channel opened with ${userId}`);
        // 초기 에디터 동기화: 내 현재 코드 전송
        try {
          const content = getLocalEditorContent?.();
          if (typeof content === "string") {
            dataChannel.send(
              JSON.stringify({
                type: "editor",
                data: { userId: myUserId, content },
              })
            );
          }
        } catch (e) {
          console.warn("Failed to send initial editor sync:", e);
        }
      };

      dataChannel.onmessage = (event) => {
        console.log(`Message from ${userId}:`, event.data);
        try {
          const parsedData = JSON.parse(event.data);
          if (parsedData?.data?.timestamp) {
            parsedData.data.timestamp = new Date(parsedData.data.timestamp);
          }
          if (parsedData.type === "chat") {
            setChatMessages((prev) => [
              ...prev,
              parsedData.data as ChatMessage,
            ]);
            console.log("채팅 메시지 수신");
          } else if (parsedData.type === "editor") {
            const update = parsedData.data as EditorUpdate;
            if (update?.userId != null && typeof update.content === "string") {
              setEditorContents?.((previous) => {
                const next = new Map(previous);
                next.set(update.userId, update.content);
                return next;
              });
            }
          }
        } catch (error) {
          console.error("Error parsing data channel message:", error);
        }
      };

      dataChannel.onerror = (error) => {
        console.error(`Data channel error with ${userId}:`, error);
      };

      dataChannel.onclose = () => {
        console.log(`Data channel closed with ${userId}`);
      };
    },
    [setChatMessages, setEditorContents, getLocalEditorContent, myUserId]
  );

  const createPeerConnection = useCallback(
    async (userId: string, isInitiator: boolean = false) => {
      console.log(
        `Creating peer connection with ${userId}, initiator: ${isInitiator}`
      );

      const peerConnection = new RTCPeerConnection({
        iceServers: [
          {
            urls: [
              "stun:stun.l.google.com:19302",
              "stun:stun1.l.google.com:19302",
              "stun:stun2.l.google.com:19302",
              "stun:stun3.l.google.com:19302",
              "stun:stun4.l.google.com:19302",
            ],
          },
        ],
      });

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`Sending ICE candidate to ${userId}`);
          socket?.emit("ice", event.candidate, myUserId, userId);
        }
      };

      peerConnection.ontrack = (event) => {
        console.log(`Received stream from ${userId}`);
        const stream = event.streams[0];
        remoteStreams.current.set(userId, stream);

        const videoElement = remoteVideoRefs.current.get(userId);
        if (videoElement) {
          videoElement.srcObject = stream;
        }
      };

      peerConnection.onconnectionstatechange = () => {
        console.log(
          `Connection with ${userId} state:`,
          peerConnection.connectionState
        );
      };

      // Add local tracks if available
      if (myStreamRef.current) {
        myStreamRef.current.getTracks().forEach((track) => {
          peerConnection.addTrack(track, myStreamRef.current!);
        });
      }

      // Data channel setup
      if (isInitiator) {
        const dataChannel = peerConnection.createDataChannel("chat");
        setupDataChannel(dataChannel, userId);
        dataChannels.current.set(userId, dataChannel);
      } else {
        peerConnection.ondatachannel = (event) => {
          const dataChannel = event.channel;
          setupDataChannel(dataChannel, userId);
          dataChannels.current.set(userId, dataChannel);
        };
      }

      peerConnections.current.set(userId, peerConnection);

      return peerConnection;
    },
    [socket, myUserId, myStreamRef, setupDataChannel]
  );

  const closePeerConnection = useCallback(
    (userId: string) => {
      console.log(`Closing peer connection with ${userId}`);

      const pc = peerConnections.current.get(userId);
      if (pc) {
        pc.close();
        peerConnections.current.delete(userId);
      }

      const dc = dataChannels.current.get(userId);
      if (dc) {
        dc.close();
        dataChannels.current.delete(userId);
      }

      remoteStreams.current.delete(userId);
      remoteVideoRefs.current.delete(userId);

      setConnectedUsers((prev) => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    },
    [setConnectedUsers]
  );

  const cleanupAllConnections = useCallback(() => {
    for (const userId of peerConnections.current.keys()) {
      closePeerConnection(userId);
    }
  }, [closePeerConnection]);

  return {
    peerConnections,
    dataChannels,
    remoteVideoRefs,
    remoteStreams,
    createPeerConnection,
    closePeerConnection,
    cleanupAllConnections,
  } as const;
}
