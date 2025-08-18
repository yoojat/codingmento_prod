import { useCallback, useEffect, useRef, useState } from "react";
import { useSocket } from "../../../hooks/use-socket";
import { Input } from "~/common/components/ui/input";
import { Button } from "~/common/components/ui/button";
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

export default function Lesson() {
  const socket = useSocket();

  // 기본 상태
  const [isWelcomeHidden, setIsWelcomeHidden] = useState(false);
  const [inputRoomName, setInputRoomName] = useState("");
  const [inputNickname, setInputNickname] = useState("");
  const [roomName, setRoomName] = useState("");
  const [myUserId] = useState(generateUserId());
  const [myNickname, setMyNickname] = useState("");

  // 미디어 상태
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [isVideoAreaVisible, setIsVideoAreaVisible] = useState(true);

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

  // Get available cameras
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

  // Get media stream
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

  // Initialize call
  const initCall = useCallback(
    async (newRoomName: string) => {
      setIsWelcomeHidden(true);
      await getMedia();
    },
    [getMedia]
  );

  const handleWelcomeSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputRoomName.trim() || !inputNickname.trim() || !socket) return;

      const newRoomName = inputRoomName.trim();
      const nickname = inputNickname.trim();

      setRoomName(newRoomName);
      setMyNickname(nickname);
      roomNameRef.current = newRoomName; // ref도 업데이트

      await initCall(newRoomName);

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

  // 하단 비디오 스트립을 위한 그리드 클래스와 비디오 크기 계산 (2배 크기)
  const getVideoLayoutConfig = (totalUsers: number) => {
    if (totalUsers === 1) {
      return {
        gridClass: "flex justify-center",
        videoHeight: "h-80", // 320px - 혼자일 때 가장 크게 (160px -> 320px)
        videoWidth: "w-64", // 256px (128px -> 256px)
        containerClass: "flex justify-center items-center",
      };
    } else if (totalUsers === 2) {
      return {
        gridClass: "grid grid-cols-2 gap-6 justify-center",
        videoHeight: "h-72", // 288px - 둘일 때 크게 (144px -> 288px)
        videoWidth: "w-56", // 224px (112px -> 224px)
        containerClass: "flex justify-center",
      };
    } else if (totalUsers <= 4) {
      return {
        gridClass: `grid grid-cols-${totalUsers} gap-4 justify-center`,
        videoHeight: "h-64", // 256px (128px -> 256px)
        videoWidth: "w-48", // 192px (96px -> 192px)
        containerClass: "flex justify-center",
      };
    } else if (totalUsers <= 6) {
      return {
        gridClass: `grid grid-cols-${totalUsers} gap-3 justify-center`,
        videoHeight: "h-56", // 224px (112px -> 224px)
        videoWidth: "w-40", // 160px (80px -> 160px)
        containerClass: "flex justify-center",
      };
    } else if (totalUsers <= 8) {
      return {
        gridClass: `grid grid-cols-${totalUsers} gap-2 justify-center`,
        videoHeight: "h-48", // 192px (96px -> 192px)
        videoWidth: "w-32", // 128px (64px -> 128px)
        containerClass: "flex justify-center",
      };
    } else {
      // 8명 초과시에도 8열 유지, 더 작게
      return {
        gridClass: "grid grid-cols-8 gap-2 justify-center",
        videoHeight: "h-40", // 160px (80px -> 160px)
        videoWidth: "w-28", // 112px (56px -> 112px)
        containerClass: "flex justify-center",
      };
    }
  };

  // 비디오 영역이 다시 보일 때 스트림 재연결
  useEffect(() => {
    if (isVideoAreaVisible && myStreamRef.current && myFaceRef.current) {
      // 내 비디오 재연결
      myFaceRef.current.srcObject = myStreamRef.current;

      // 원격 비디오들 재연결
      for (const [userId, stream] of remoteStreams.current.entries()) {
        const videoElement = remoteVideoRefs.current.get(userId);
        if (videoElement && stream) {
          videoElement.srcObject = stream;
        }
      }
    }
  }, [isVideoAreaVisible]);

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

          {/* 메인 콘텐츠 영역 - 여기에 다른 콘텐츠를 추가할 수 있습니다 */}
          <div className="flex-1 bg-gray-50 p-4">
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

          {/* 하단 컨트롤 및 비디오 영역 - 고정 위치 */}
          <div className="fixed bottom-0 left-0 right-0 bg-black bg-opacity-90 p-3 space-y-3">
            {/* 컨트롤 버튼들 */}
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                onClick={handleMuteClick}
                variant={isMuted ? "destructive" : "default"}
                size="sm"
                className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
              >
                {isMuted ? "🔇 음소거 해제" : "🎤 음소거"}
              </Button>

              <Button
                onClick={handleCameraClick}
                variant={isCameraOff ? "destructive" : "default"}
                size="sm"
                className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
              >
                {isCameraOff ? "📷 카메라 켜기" : "📹 카메라 끄기"}
              </Button>

              <Button
                onClick={() => setIsVideoAreaVisible(!isVideoAreaVisible)}
                variant="default"
                size="sm"
                className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
              >
                {isVideoAreaVisible ? "📺 비디오 숨기기" : "📺 비디오 보기"}
              </Button>

              {cameras.length > 0 && (
                <Select
                  value={selectedCameraId}
                  onValueChange={handleCameraChange}
                >
                  <SelectTrigger className="w-48 bg-gray-700 text-white border-gray-600">
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
                  socket?.emit("user_left", myUserId);
                  setIsCameraOff(false);
                  setIsMuted(false);
                }}
                variant="outline"
                size="sm"
                className="bg-red-600 hover:bg-red-500 text-white border-red-500"
              >
                📞 방 나가기
              </Button>
            </div>

            {/* 비디오 스트립 - 조건부 렌더링 */}
            {isVideoAreaVisible &&
              (() => {
                const totalUsers = connectedUsers.size + 1;
                const config = getVideoLayoutConfig(totalUsers);

                return (
                  <div className={`${config.containerClass} w-full`}>
                    <div className={`${config.gridClass} max-w-fit`}>
                      {/* 내 비디오 */}
                      <div className="relative flex-shrink-0">
                        <div className="relative group">
                          <video
                            ref={(el) => {
                              myFaceRef.current = el;
                              if (el && myStreamRef.current) {
                                el.srcObject = myStreamRef.current;
                                console.log("My video stream reconnected");
                              }
                            }}
                            autoPlay
                            playsInline
                            muted
                            className={`${config.videoWidth} ${config.videoHeight} object-cover rounded-lg border border-gray-300 bg-gray-800`}
                            style={{ transform: "scaleX(-1)" }}
                          />
                          {isCameraOff && (
                            <div className="absolute inset-0 bg-black rounded-lg flex items-center justify-center">
                              <p className="text-white text-xs">Camera Off</p>
                            </div>
                          )}
                          {/* 사용자 이름 라벨 */}
                          <div className="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white px-1 py-0.5 rounded text-xs">
                            {totalUsers > 6
                              ? myNickname.slice(0, 4)
                              : myNickname}{" "}
                            (나)
                          </div>
                          {/* 상태 표시 */}
                          <div className="absolute top-1 right-1 flex space-x-1">
                            {isMuted && (
                              <div className="bg-red-500 text-white p-0.5 rounded text-xs">
                                🔇
                              </div>
                            )}
                            {isCameraOff && (
                              <div className="bg-red-500 text-white p-0.5 rounded text-xs">
                                📷
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 원격 사용자들 */}
                      {Array.from(connectedUsers.entries()).map(
                        ([userId, userInfo]) => (
                          <div key={userId} className="relative flex-shrink-0">
                            <div className="relative group">
                              <video
                                ref={(el) => {
                                  if (el) {
                                    remoteVideoRefs.current.set(userId, el);
                                    const stream =
                                      remoteStreams.current.get(userId);
                                    if (stream) {
                                      el.srcObject = stream;
                                      console.log(
                                        "Remote stream reconnected for:",
                                        userId
                                      );
                                    }
                                  } else {
                                    // 엘리먼트가 언마운트될 때 ref에서 제거
                                    remoteVideoRefs.current.delete(userId);
                                  }
                                }}
                                autoPlay
                                playsInline
                                className={`${config.videoWidth} ${config.videoHeight} object-cover rounded-lg border border-gray-300 bg-gray-800`}
                                style={{ transform: "scaleX(-1)" }}
                              />
                              {/* 사용자 이름 라벨 */}
                              <div className="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white px-1 py-0.5 rounded text-xs">
                                {totalUsers > 6
                                  ? userInfo.nickname.slice(0, 4)
                                  : userInfo.nickname}
                              </div>
                              {/* 연결 상태 */}
                              <div className="absolute top-1 right-1">
                                <div className="bg-green-500 text-white p-0.5 rounded text-xs">
                                  ●
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                );
              })()}

            {/* 연결 상태 디버그 정보 */}
            <div className="text-xs text-gray-400 text-center">
              활성 연결: {peerConnections.current.size}개 | 데이터 채널:{" "}
              {dataChannels.current.size}개
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
