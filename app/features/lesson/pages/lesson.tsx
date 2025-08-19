import { useCallback, useEffect, useRef, useState } from "react";
import { useSocket } from "../../../hooks/use-socket";
import { useRoomSignaling } from "../../../hooks/use-room-signaling";
import { Input } from "~/common/components/ui/input";
import { Button } from "~/common/components/ui/button";

import Chat from "../components/chat";
import VideoControls from "../components/video-controls";
import { usePeerConnections } from "../../../hooks/use-peer-connections";

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

  // 다중 연결 관리 훅
  const {
    peerConnections,
    dataChannels,
    remoteVideoRefs,
    remoteStreams,
    createPeerConnection,
    closePeerConnection,
    cleanupAllConnections,
  } = usePeerConnections({
    socket,
    myUserId,
    myStreamRef,
    setConnectedUsers,
    setChatMessages,
  });

  const handleWelcomeSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputRoomName.trim() || !inputNickname.trim() || !socket) return;

      const newRoomName = inputRoomName.trim();
      const nickname = inputNickname.trim();

      setRoomName(newRoomName);
      setMyNickname(nickname);
      roomNameRef.current = newRoomName; // ref도 업데이트

      setIsWelcomeHidden(true);

      console.log(`📤 Joining room: ${newRoomName} as ${nickname}`);
      socket.emit("join_room", {
        roomName: newRoomName,
        userId: myUserId,
        nickname: nickname,
      });

      setInputNickname("");
      setInputRoomName("");
    },
    [inputNickname, inputRoomName, socket, myUserId]
  );

  // WebRTC 시그널링 훅으로 분리
  useRoomSignaling({
    socket,
    myUserId,
    createPeerConnection,
    closePeerConnection,
    peerConnections,
    setConnectedUsers,
  });

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
