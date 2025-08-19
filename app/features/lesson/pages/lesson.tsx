import { useCallback, useEffect, useRef, useState } from "react";
import { useSocket } from "../../../hooks/use-socket";
import { Input } from "~/common/components/ui/input";
import { Button } from "~/common/components/ui/button";

import Chat from "../components/chat";
import VideoControls from "../components/video-controls";

interface Camera {
  deviceId: string;
  label: string;
}

interface User {
  id: string;
  nickname: string;
  joinedAt?: Date;
}

interface UserState {
  nickname: string;
  isVideoOn: boolean;
  isAudioOn: boolean;
}

// 고유 사용자 ID 생성
const generateUserId = () =>
  `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export default function Lesson() {
  const socket = useSocket();

  // 기본 상태
  const [isWelcomeHidden, setIsWelcomeHidden] = useState(false);
  const [inputRoomName, setInputRoomName] = useState("");
  const [inputNickname, setInputNickname] = useState("");
  const [roomName, setRoomName] = useState("");
  const [myUserId] = useState(generateUserId());
  const [myNickname, setMyNickname] = useState("");

  // 미디어 상태 (VideoControls로 내부화)
  const [chatMessages, setChatMessages] = useState<
    Array<{
      id: string;
      userId: string;
      nickname: string;
      message: string;
      timestamp: Date;
    }>
  >([]);

  // 다중 사용자 관리
  const [connectedUsers, setConnectedUsers] = useState<Map<string, UserState>>(
    new Map()
  ); // userId => {name, isVideoOn, isAudioOn}

  // Refs
  const myFaceRef = useRef<HTMLVideoElement>(null);
  const myStreamRef = useRef<MediaStream | null>(null);
  const roomNameRef = useRef<string>("");

  // 다중 연결 관리
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  // userId -> RTCPeerConnection
  const dataChannels = useRef<Map<string, RTCDataChannel>>(new Map());
  // userId -> RTCDataChannel
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  // userId -> HTMLVideoElement ref
  const remoteStreams = useRef<Map<string, MediaStream>>(new Map());
  // userId -> MediaStream

  // 데이터 채널 설정
  const setupDataChannel = useCallback(
    (dataChannel: RTCDataChannel, userId: string) => {
      dataChannel.onopen = () => {
        console.log(`Data channel opened with ${userId}`);
      };

      dataChannel.onmessage = (event) => {
        console.log(`Message from ${userId}:`, event.data);
        try {
          const parsedData = JSON.parse(event.data);
          parsedData.data.timestamp = new Date(parsedData.data.timestamp);
          if (parsedData.type === "chat") {
            // 채팅 메시지 수신
            setChatMessages((prev) => [...prev, parsedData.data]);
            console.log("채팅 메시지 수신");
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
    []
  );

  // Create peer connection and add to peerConnections map
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

      // ICE candidate 핸들러
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`Sending ICE candidate to ${userId}`);
          socket?.emit("ice", event.candidate, myUserId, userId);
        }
      };

      // 원격 스트림 수신
      peerConnection.ontrack = (event) => {
        console.log(`Received stream from ${userId}`);
        const stream = event.streams[0];
        remoteStreams.current.set(userId, stream);

        const videoElement = remoteVideoRefs.current.get(userId);
        if (videoElement) {
          videoElement.srcObject = stream;
        }
      };

      // 연결 상태 모니터링
      peerConnection.onconnectionstatechange = () => {
        console.log(
          `Connection with ${userId} state:`,
          peerConnection.connectionState
        );
      };

      // 내 스트림 추가
      if (myStreamRef.current) {
        myStreamRef.current.getTracks().forEach((track) => {
          peerConnection.addTrack(track, myStreamRef.current!);
        });
      }

      // 데이터 채널 처리
      if (isInitiator) {
        // Initiator가 데이터 채널 생성
        const dataChannel = peerConnection.createDataChannel("chat");
        setupDataChannel(dataChannel, userId);
        dataChannels.current.set(userId, dataChannel);
      } else {
        // Receiver는 데이터 채널 수신 대기
        peerConnection.ondatachannel = (event) => {
          const dataChannel = event.channel;
          setupDataChannel(dataChannel, userId);
          dataChannels.current.set(userId, dataChannel);
        };
      }

      peerConnections.current.set(userId, peerConnection);

      return peerConnection;
    },
    [socket, myUserId, setupDataChannel]
  );

  // 피어 연결 정리
  const closePeerConnection = useCallback((userId: string) => {
    console.log(`Closing peer connection with ${userId}`);

    // 피어 연결 정리
    const pc = peerConnections.current.get(userId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(userId);
    }

    // 데이터 채널 정리
    const dc = dataChannels.current.get(userId);
    if (dc) {
      dc.close();
      dataChannels.current.delete(userId);
    }

    // 스트림 및 UI 정리
    remoteStreams.current.delete(userId);
    remoteVideoRefs.current.delete(userId);

    // 상태에서 사용자 제거
    setConnectedUsers((prev) => {
      const newUsers = new Map(prev);
      newUsers.delete(userId);
      return newUsers;
    });
  }, []);

  // 모든 연결 정리
  const cleanupAllConnections = useCallback(() => {
    for (const userId of peerConnections.current.keys()) {
      closePeerConnection(userId);
    }
  }, [closePeerConnection]);

  // Initialize call (UI 변경만)
  const initCall = useCallback(() => {
    setIsWelcomeHidden(true);
    // 미디어 초기화는 VideoControls가 자동으로 처리
  }, []);

  const handleWelcomeSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputRoomName.trim() || !inputNickname.trim() || !socket) return;

      const newRoomName = inputRoomName.trim();
      const nickname = inputNickname.trim();

      setRoomName(newRoomName);
      setMyNickname(nickname);
      roomNameRef.current = newRoomName; // ref도 업데이트

      initCall();

      console.log(`📤 Joining room: ${newRoomName} as ${nickname}`);
      socket.emit("join_room", {
        roomName: newRoomName,
        userId: myUserId,
        nickname: nickname,
      });

      setInputNickname("");
      setInputRoomName("");
    },
    [inputNickname, inputRoomName, socket, myUserId, initCall]
  );

  //Socket event handlers
  useEffect(() => {
    if (!socket) return;

    socket.on("connect", () => {
      console.log("🟢 Socket.IO 서버 연결 성공:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("🔴 Socket.IO 서버 연결 해제");
      cleanupAllConnections();
    });

    socket.on("room_users", async (existingUsers: User[]) => {
      console.log("📥 Existing users:", existingUsers);

      for (const user of existingUsers) {
        if (user.id !== myUserId) {
          // 기존 사용자와 연결 (내가 initiator, 즉 내가 새롭게 입장)
          const pc = await createPeerConnection(user.id, true);

          setConnectedUsers((prev) =>
            new Map(prev).set(user.id, {
              nickname: user.nickname,
              isVideoOn: true,
              isAudioOn: true,
            })
          );

          // Offer 생성 및 전송
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            console.log(`📤 Sending offer to ${user.id}`);
            socket.emit("offer", offer, myUserId, user.id);
          } catch (error) {
            console.error("Error creating offer:", error);
          }
        }
      }
    });

    // 새 사용자 입장
    socket.on("user_joined", async (newUser: User) => {
      console.log("📥 New user joined:", newUser);

      if (newUser.id !== myUserId) {
        // 새 사용자와 연결 준비 (내가 receiver, 즉 새 사용자가 들어옴)

        // Create peer connection and add to peerConnections map
        await createPeerConnection(newUser.id, false);
        // Add to connected users map
        setConnectedUsers((prev) =>
          new Map(prev).set(newUser.id, {
            nickname: newUser.nickname,
            isVideoOn: true,
            isAudioOn: true,
          })
        );
      }
    });

    // 사용자 퇴장
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
        const pc = peerConnections.current.get(fromUserId);
        if (pc) {
          try {
            await pc.setRemoteDescription(offer);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            console.log(`📤 Sending answer to ${fromUserId}`);
            socket.emit("answer", answer, myUserId, fromUserId);
          } catch (error) {
            console.error("Error handling offer:", error);
          }
        }
      }
    );

    // Handle answer
    socket.on(
      "answer",
      async (
        answer: RTCSessionDescriptionInit,
        fromUserId: string,
        toUserId: string
      ) => {
        if (toUserId !== myUserId) return;

        console.log(`📥 Received answer from ${fromUserId}`);
        const pc = peerConnections.current.get(fromUserId);
        if (pc) {
          try {
            await pc.setRemoteDescription(answer);
          } catch (error) {
            console.error("Error handling answer:", error);
          }
        }
      }
    );
    // ICE Candidate 수신
    socket.on(
      "ice",
      async (
        candidate: RTCIceCandidateInit,
        fromUserId: string,
        toUserId: string
      ) => {
        if (toUserId !== myUserId) return;

        console.log(`📥 Received ICE candidate from ${fromUserId}`);
        const pc = peerConnections.current.get(fromUserId);
        if (pc && candidate) {
          try {
            await pc.addIceCandidate(candidate);
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
  }, [socket, myUserId, createPeerConnection, closePeerConnection]);

  // 채팅 메시지 전송
  const handleSendMessage = useCallback(
    (messageText: string) => {
      if (!messageText.trim() || !myNickname) return;

      const message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: myUserId,
        nickname: myNickname,
        message: messageText.trim(),
        timestamp: new Date(),
      };

      // 내 메시지를 로컬에 추가
      setChatMessages((prev) => [...prev, message]);

      // 데이터 채널을 통해 다른 사용자들에게 전송
      for (const dataChannel of dataChannels.current.values()) {
        if (dataChannel.readyState === "open") {
          dataChannel.send(
            JSON.stringify({
              type: "chat",
              data: message,
            })
          );
        }
      }
    },
    [myNickname, myUserId]
  );

  // 비디오 영역 표시 상태 로직은 VideoControls로 이동

  // 정리
  useEffect(() => {
    return () => {
      if (myStreamRef.current) {
        myStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      cleanupAllConnections();
    };
  }, [cleanupAllConnections]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {!isWelcomeHidden && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">다중 사용자 영상 채팅</h2>
          <p>방번호와 닉네임을 입력해주세요.</p>
          <form onSubmit={handleWelcomeSubmit} className="space-y-3">
            <Input
              type="text"
              placeholder="방번호를 입력하세요"
              value={inputRoomName}
              onChange={(e) => setInputRoomName(e.target.value)}
              className="flex-1"
              required
            />
            <Input
              type="text"
              placeholder="닉네임을 입력하세요"
              value={inputNickname}
              onChange={(e) => setInputNickname(e.target.value)}
              required
            />
            <Button
              type="submit"
              disabled={!socket}
              className="w-full cursor-pointer"
            >
              입장
            </Button>
          </form>
        </div>
      )}
      {isWelcomeHidden && (
        <div className="h-screen flex flex-col relative">
          {/* 상단 헤더 */}
          <div className="flex justify-between items-center p-4 bg-white border-b">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">
                방: {roomName} ({connectedUsers.size + 1}/8명)
              </h2>
              {connectedUsers.size + 1 > 4 && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  고밀도 모드
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600">
              내 ID: {myNickname} ({myUserId.slice(-8)})
            </div>
          </div>

          {/* 메인 콘텐츠 영역 */}
          <div className="flex-1 bg-gray-50 p-4 main-content">
            <div className="h-full flex items-center justify-center">
              <div className="text-gray-500 text-lg">
                화상 통화 진행 중...
                <br />
                <span className="text-sm">
                  하단에서 카메라 화면을 확인하세요
                </span>
              </div>
            </div>
          </div>

          {/* 채팅 컴포넌트 */}
          <Chat
            myUserId={myUserId}
            myNickname={myNickname}
            chatMessages={chatMessages}
            onSendMessage={handleSendMessage}
          />

          {/* 하단 컨트롤 및 비디오 영역 - VideoControls 컴포넌트 */}
          <VideoControls
            myUserId={myUserId}
            myNickname={myNickname}
            connectedUsers={connectedUsers}
            myStreamRef={myStreamRef}
            myFaceRef={myFaceRef}
            remoteVideoRefs={remoteVideoRefs}
            remoteStreams={remoteStreams}
            peerConnections={peerConnections}
            onMediaReady={async (stream) => {
              console.log("lesson.tsx: 미디어 준비 완료", !!stream);
              // 로컬 미디어가 준비된 후, 기존 피어 연결에 트랙을 연결하고 재협상
              if (!stream) return;

              try {
                const localAudioTrack = stream.getAudioTracks()[0] || null;
                const localVideoTrack = stream.getVideoTracks()[0] || null;

                for (const [peerId, pc] of peerConnections.current.entries()) {
                  // 이미 보낸 트랙이 없다면 추가
                  const hasAudioSender = pc
                    .getSenders()
                    .some((s) => s.track?.kind === "audio");
                  const hasVideoSender = pc
                    .getSenders()
                    .some((s) => s.track?.kind === "video");

                  if (localAudioTrack && !hasAudioSender) {
                    pc.addTrack(localAudioTrack, stream);
                  }
                  if (localVideoTrack && !hasVideoSender) {
                    pc.addTrack(localVideoTrack, stream);
                  }

                  // 재협상(offer) 전송
                  try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    console.log(`📤 Renegotiation offer to ${peerId}`);
                    socket?.emit("offer", offer, myUserId, peerId);
                  } catch (err) {
                    console.error("Renegotiation error:", err);
                  }
                }
              } catch (err) {
                console.error("onMediaReady handling error:", err);
              }
            }}
            onLeaveRoom={() => {
              cleanupAllConnections();
              setIsWelcomeHidden(false);
              setConnectedUsers(new Map());
              socket?.emit("user_left", myUserId);
            }}
          />
        </div>
      )}
    </div>
  );
}
