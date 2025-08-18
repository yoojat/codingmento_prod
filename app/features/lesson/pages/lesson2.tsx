import { useEffect, useRef, useState, useCallback } from "react";
import { useSocket } from "../../../hooks/use-socket";
import { Button } from "~/common/components/ui/button";
import { Input } from "~/common/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/common/components/ui/select";

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

export default function MeshLesson() {
  const socket = useSocket();

  // 기본 상태
  const [isWelcomeHidden, setIsWelcomeHidden] = useState(false);
  const [inputRoomName, setInputRoomName] = useState("");
  const [inputNickname, setInputNickname] = useState("");
  const [roomName, setRoomName] = useState("");
  const [myUserId] = useState(() => generateUserId());
  const [myNickname, setMyNickname] = useState("");

  // 미디어 상태
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");

  // 다중 사용자 관리
  const [connectedUsers, setConnectedUsers] = useState<Map<string, UserState>>(
    new Map()
  );

  // Refs
  const myFaceRef = useRef<HTMLVideoElement>(null);
  const myStreamRef = useRef<MediaStream | null>(null);
  const roomNameRef = useRef<string>("");

  // 다중 연결 관리
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const dataChannels = useRef<Map<string, RTCDataChannel>>(new Map());
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const remoteStreams = useRef<Map<string, MediaStream>>(new Map());

  // 카메라 목록 가져오기
  const getCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );
      const cameraList: Camera[] = videoDevices.map((device) => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
      }));

      setCameras(cameraList);

      if (myStreamRef.current && cameraList.length > 0) {
        const currentCamera = myStreamRef.current.getVideoTracks()[0];
        const currentCameraDevice = cameraList.find(
          (camera) => camera.label === currentCamera.label
        );
        if (currentCameraDevice) {
          setSelectedCameraId(currentCameraDevice.deviceId);
        }
      }
    } catch (error) {
      console.error("Error getting cameras:", error);
    }
  }, []);

  // 미디어 스트림 가져오기
  const getMedia = useCallback(
    async (deviceId?: string) => {
      const initialConstraints = {
        audio: true,
        video: { facingMode: "user" },
      };

      const cameraConstraints = {
        audio: true,
        video: { deviceId: { exact: deviceId } },
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(
          deviceId ? cameraConstraints : initialConstraints
        );

        myStreamRef.current = stream;

        if (myFaceRef.current) {
          myFaceRef.current.srcObject = stream;
        }

        if (!deviceId) {
          await getCameras();
        }

        return stream;
      } catch (error) {
        console.error("Error getting media:", error);
        throw error;
      }
    },
    [getCameras]
  );

  // 데이터 채널 설정
  const setupDataChannel = useCallback(
    (dataChannel: RTCDataChannel, userId: string) => {
      dataChannel.onopen = () => {
        console.log(`Data channel opened with ${userId}`);
      };

      dataChannel.onmessage = (event) => {
        console.log(`Message from ${userId}:`, event.data);
        // 여기서 채팅 메시지 처리
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

  // 개별 피어 연결 생성
  const createPeerConnection = useCallback(
    async (userId: string, isInitiator = false) => {
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

  // 방 초기화
  const initCall = useCallback(
    async (roomName: string) => {
      setIsWelcomeHidden(true);
      await getMedia();
    },
    [getMedia]
  );

  // 방 입장 핸들러
  const handleWelcomeSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputRoomName.trim() || !inputNickname.trim() || !socket) return;

      const newRoomName = inputRoomName.trim();
      const nickname = inputNickname.trim();

      setRoomName(newRoomName);
      setMyNickname(nickname);
      roomNameRef.current = newRoomName;

      await initCall(newRoomName);

      console.log(`📤 Joining room: ${newRoomName} as ${nickname}`);
      socket.emit("join_room", {
        roomName: newRoomName,
        userId: myUserId,
        nickname: nickname,
      });

      setInputRoomName("");
      setInputNickname("");
    },
    [inputRoomName, inputNickname, socket, myUserId, initCall]
  );

  // Socket 이벤트 핸들러
  useEffect(() => {
    if (!socket) return;

    // 연결 상태
    socket.on("connect", () => {
      console.log("🟢 Socket.IO 서버 연결 성공:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("🔴 Socket.IO 서버 연결 해제");
      cleanupAllConnections();
    });

    // 기존 사용자 목록 수신
    socket.on("room_users", async (existingUsers: User[]) => {
      console.log("📥 Existing users:", existingUsers);

      for (const user of existingUsers) {
        if (user.id !== myUserId) {
          // 기존 사용자와 연결 (내가 initiator)
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
        // 새 사용자와 연결 준비 (내가 receiver)
        await createPeerConnection(newUser.id, false);

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

    // Offer 수신
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

    // Answer 수신
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
  }, [
    socket,
    myUserId,
    createPeerConnection,
    closePeerConnection,
    cleanupAllConnections,
  ]);

  // 미디어 컨트롤
  const handleMuteClick = useCallback(() => {
    if (myStreamRef.current) {
      myStreamRef.current
        .getAudioTracks()
        .forEach((track) => (track.enabled = !track.enabled));
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const handleCameraClick = useCallback(() => {
    if (myStreamRef.current) {
      myStreamRef.current
        .getVideoTracks()
        .forEach((track) => (track.enabled = !track.enabled));
      setIsCameraOff(!isCameraOff);
    }
  }, [isCameraOff]);

  const handleCameraChange = useCallback(
    async (deviceId: string) => {
      try {
        await getMedia(deviceId);
        setSelectedCameraId(deviceId);

        // 모든 피어 연결의 비디오 트랙 교체
        if (myStreamRef.current) {
          const videoTrack = myStreamRef.current.getVideoTracks()[0];
          for (const pc of peerConnections.current.values()) {
            const videoSender = pc
              .getSenders()
              .find((sender) => sender.track?.kind === "video");
            if (videoSender && videoTrack) {
              await videoSender.replaceTrack(videoTrack);
            }
          }
        }
      } catch (error) {
        console.error("Error changing camera:", error);
      }
    },
    [getMedia]
  );

  // 그리드 클래스 계산
  const getGridClass = (userCount: number) => {
    if (userCount <= 2) return "grid-cols-1 md:grid-cols-2";
    if (userCount <= 4) return "grid-cols-2 md:grid-cols-2";
    if (userCount <= 9) return "grid-cols-2 md:grid-cols-3";
    return "grid-cols-3 md:grid-cols-4";
  };

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
    <div className="p-6 max-w-6xl mx-auto">
      {/* 방 입장 화면 */}
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
              required
            />
            <Input
              type="text"
              placeholder="닉네임을 입력하세요"
              value={inputNickname}
              onChange={(e) => setInputNickname(e.target.value)}
              required
            />
            <Button type="submit" disabled={!socket} className="w-full">
              입장
            </Button>
          </form>
        </div>
      )}

      {/* 영상 채팅 화면 */}
      {isWelcomeHidden && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">
              방: {roomName} ({connectedUsers.size + 1}명)
            </h2>
            <div className="text-sm text-gray-600">
              내 ID: {myNickname} ({myUserId.slice(-8)})
            </div>
          </div>

          {/* 비디오 그리드 */}
          <div
            className={`grid gap-4 ${getGridClass(connectedUsers.size + 1)}`}
          >
            {/* 내 비디오 */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-center">
                {myNickname} (나)
              </h3>
              <div className="relative">
                <video
                  ref={myFaceRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full aspect-video rounded-lg border border-gray-200 bg-gray-100"
                  style={{ transform: "scaleX(-1)" }}
                />
                {isCameraOff && (
                  <div className="absolute inset-0 bg-black rounded-lg flex items-center justify-center">
                    <p className="text-white text-sm">Camera Off</p>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 flex space-x-1">
                  {isMuted && (
                    <div className="bg-red-500 text-white px-2 py-1 rounded text-xs">
                      음소거
                    </div>
                  )}
                  {isCameraOff && (
                    <div className="bg-red-500 text-white px-2 py-1 rounded text-xs">
                      비디오 꺼짐
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 원격 사용자들 */}
            {Array.from(connectedUsers.entries()).map(([userId, userInfo]) => (
              <div key={userId} className="space-y-2">
                <h3 className="text-sm font-semibold text-center">
                  {userInfo.nickname}
                </h3>
                <div className="relative">
                  <video
                    ref={(el) => {
                      if (el) {
                        remoteVideoRefs.current.set(userId, el);
                        const stream = remoteStreams.current.get(userId);
                        if (stream) {
                          el.srcObject = stream;
                        }
                      }
                    }}
                    autoPlay
                    playsInline
                    className="w-full aspect-video rounded-lg border border-gray-200 bg-gray-100"
                    style={{ transform: "scaleX(-1)" }}
                  />
                  <div className="absolute bottom-2 left-2">
                    <div className="bg-blue-500 text-white px-2 py-1 rounded text-xs">
                      연결됨
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 컨트롤 */}
          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              onClick={handleMuteClick}
              variant={isMuted ? "destructive" : "default"}
              size="sm"
            >
              {isMuted ? "음소거 해제" : "음소거"}
            </Button>

            <Button
              onClick={handleCameraClick}
              variant={isCameraOff ? "destructive" : "default"}
              size="sm"
            >
              {isCameraOff ? "카메라 켜기" : "카메라 끄기"}
            </Button>

            {cameras.length > 0 && (
              <Select
                value={selectedCameraId}
                onValueChange={handleCameraChange}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="카메라 선택" />
                </SelectTrigger>
                <SelectContent>
                  {cameras.map((camera) => (
                    <SelectItem key={camera.deviceId} value={camera.deviceId}>
                      {camera.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button
              onClick={() => {
                cleanupAllConnections();
                setIsWelcomeHidden(false);
                setConnectedUsers(new Map());
              }}
              variant="outline"
              size="sm"
            >
              방 나가기
            </Button>
          </div>

          {/* 연결 상태 디버그 정보 */}
          <div className="text-xs text-gray-500 text-center">
            활성 연결: {peerConnections.current.size}개 | 데이터 채널:{" "}
            {dataChannels.current.size}개
          </div>
        </div>
      )}
    </div>
  );
}
