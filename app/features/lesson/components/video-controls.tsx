import { useCallback, useEffect, useState } from "react";
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

interface UserState {
  nickname: string;
  isVideoOn: boolean;
  isAudioOn: boolean;
}

interface VideoControlsProps {
  // 사용자 관련
  myUserId: string;
  myNickname: string;
  connectedUsers: Map<string, UserState>;

  // 미디어 스트림 참조
  myStreamRef: React.RefObject<MediaStream | null>;
  myFaceRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRefs: React.RefObject<Map<string, HTMLVideoElement>>;
  remoteStreams: React.RefObject<Map<string, MediaStream>>;

  // WebRTC 연결 관련
  peerConnections: React.RefObject<Map<string, RTCPeerConnection>>;

  // 외부 함수들
  onLeaveRoom: () => void;

  // 미디어 준비 완료 콜백 (옵션)
  onMediaReady?: (stream: MediaStream | null) => void;
}

export default function VideoControls({
  myUserId,
  myNickname,
  connectedUsers,
  myStreamRef,
  myFaceRef,
  remoteVideoRefs,
  remoteStreams,
  peerConnections,
  onLeaveRoom,
  onMediaReady,
}: VideoControlsProps) {
  // 내부 상태
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isVideoAreaVisible, setIsVideoAreaVisible] = useState(true);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  // 내부 미디어 관련 함수들 (순수 함수)
  const getCamerasInternal = useCallback(async (): Promise<Camera[]> => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );
      const cameraList: Camera[] = videoDevices.map((device) => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
      }));

      return cameraList;
    } catch (error) {
      console.error("Error getting cameras:", error);
      return [];
    }
  }, []);

  const getMediaInternal = useCallback(
    async (deviceId?: string): Promise<MediaStream | null> => {
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

        // 카메라 목록 업데이트 (deviceId가 없을 때만)
        if (!deviceId) {
          const cameraList = await getCamerasInternal();
          setCameras(cameraList);

          // 현재 사용 중인 카메라 설정
          if (cameraList.length > 0) {
            const currentCamera = stream.getVideoTracks()[0];
            const currentCameraDevice = cameraList.find(
              (camera) => camera.label === currentCamera.label
            );
            if (currentCameraDevice) {
              setSelectedCameraId(currentCameraDevice.deviceId);
            }
          }
        }

        return stream;
      } catch (error) {
        console.error("Error getting media:", error);
        return null;
      }
    },
    [
      myStreamRef,
      myFaceRef,
      getCamerasInternal,
      setCameras,
      setSelectedCameraId,
    ]
  );

  // 컴포넌트 마운트 시 자동 미디어 초기화 (한 번만)
  useEffect(() => {
    let mounted = true;

    const initializeMedia = async () => {
      try {
        console.log("VideoControls: 미디어 초기화 시작");
        const stream = await getMediaInternal();

        if (mounted) {
          if (stream && onMediaReady) {
            onMediaReady(stream);
          }
          console.log("VideoControls: 미디어 초기화 완료", !!stream);
        }
      } catch (error) {
        console.error("VideoControls: 미디어 초기화 실패", error);
        if (mounted && onMediaReady) {
          onMediaReady(null);
        }
      }
    };

    initializeMedia();

    return () => {
      mounted = false;
    };
  }, []); // 빈 배열로 한 번만 실행

  // 내 비디오 스트림 연결 관리
  useEffect(() => {
    if (myFaceRef.current && myStreamRef.current) {
      if (myFaceRef.current.srcObject !== myStreamRef.current) {
        myFaceRef.current.srcObject = myStreamRef.current;
        console.log("My video stream connected");
      }
    }
  }); // 매 렌더링마다 체크하되, 조건문으로 불필요한 할당 방지

  // 원격 비디오 스트림 연결 관리
  useEffect(() => {
    if (remoteVideoRefs.current && remoteStreams.current) {
      for (const [userId, stream] of remoteStreams.current.entries()) {
        const videoElement = remoteVideoRefs.current.get(userId);
        if (videoElement && videoElement.srcObject !== stream) {
          videoElement.srcObject = stream;
          console.log("Remote stream connected for:", userId);
        }
      }
    }
  }, [connectedUsers]); // connectedUsers가 변경될 때만 확인

  // 미디어 컨트롤 핸들러들
  const handleMuteClick = useCallback(() => {
    if (myStreamRef.current) {
      myStreamRef.current
        .getAudioTracks()
        .forEach((track) => (track.enabled = !track.enabled));
      setIsMuted(!isMuted);
    }
  }, [isMuted, myStreamRef, setIsMuted]);

  const handleCameraClick = useCallback(() => {
    if (myStreamRef.current) {
      myStreamRef.current
        .getVideoTracks()
        .forEach((track) => (track.enabled = !track.enabled));
      setIsCameraOff(!isCameraOff);
    }
  }, [isCameraOff, myStreamRef, setIsCameraOff]);

  const handleCameraChange = useCallback(
    async (deviceId: string) => {
      try {
        const stream = await getMediaInternal(deviceId);
        if (!stream) {
          console.error("Failed to get media stream");
          return;
        }

        setSelectedCameraId(deviceId);

        // 모든 피어 연결의 비디오 트랙 교체
        if (myStreamRef.current) {
          const videoTrack = myStreamRef.current.getVideoTracks()[0];
          for (const pc of peerConnections.current?.values() || []) {
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
    [getMediaInternal, setSelectedCameraId, myStreamRef, peerConnections]
  );

  const handleVideoAreaToggle = useCallback(() => {
    setIsVideoAreaVisible(!isVideoAreaVisible);
  }, [isVideoAreaVisible, setIsVideoAreaVisible]);

  // 하단 비디오 스트립을 위한 그리드 클래스와 비디오 크기 계산
  const getVideoLayoutConfig = useCallback((totalUsers: number) => {
    if (totalUsers === 1) {
      return {
        gridClass: "flex justify-center",
        videoHeight: "h-80", // 320px - 혼자일 때 가장 크게
        videoWidth: "w-64", // 256px
        containerClass: "flex justify-center items-center",
      };
    } else if (totalUsers === 2) {
      return {
        gridClass: "grid grid-cols-2 gap-6 justify-center",
        videoHeight: "h-72", // 288px - 둘일 때 크게
        videoWidth: "w-56", // 224px
        containerClass: "flex justify-center",
      };
    } else if (totalUsers <= 4) {
      return {
        gridClass: `grid grid-cols-${totalUsers} gap-4 justify-center`,
        videoHeight: "h-64", // 256px
        videoWidth: "w-48", // 192px
        containerClass: "flex justify-center",
      };
    } else if (totalUsers <= 6) {
      return {
        gridClass: `grid grid-cols-${totalUsers} gap-3 justify-center`,
        videoHeight: "h-56", // 224px
        videoWidth: "w-40", // 160px
        containerClass: "flex justify-center",
      };
    } else if (totalUsers <= 8) {
      return {
        gridClass: `grid grid-cols-${totalUsers} gap-2 justify-center`,
        videoHeight: "h-48", // 192px
        videoWidth: "w-32", // 128px
        containerClass: "flex justify-center",
      };
    } else {
      // 8명 초과시에도 8열 유지, 더 작게
      return {
        gridClass: "grid grid-cols-8 gap-2 justify-center",
        videoHeight: "h-40", // 160px
        videoWidth: "w-28", // 112px
        containerClass: "flex justify-center",
      };
    }
  }, []);

  const totalUsers = connectedUsers.size + 1;
  const config = getVideoLayoutConfig(totalUsers);

  return (
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
          onClick={handleVideoAreaToggle}
          variant="default"
          size="sm"
          className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
        >
          {isVideoAreaVisible ? "📺 비디오 숨기기" : "📺 비디오 보기"}
        </Button>

        {cameras.length > 0 && (
          <Select value={selectedCameraId} onValueChange={handleCameraChange}>
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
          onClick={onLeaveRoom}
          variant="outline"
          size="sm"
          className="bg-red-600 hover:bg-red-500 text-white border-red-500"
        >
          📞 방 나가기
        </Button>
      </div>

      {/* 비디오 스트립 - 조건부 렌더링 */}
      {isVideoAreaVisible && (
        <div className={`${config.containerClass} w-full`}>
          <div className={`${config.gridClass} max-w-fit`}>
            {/* 내 비디오 */}
            <div className="relative flex-shrink-0">
              <div className="relative group">
                <video
                  ref={myFaceRef}
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
                  {totalUsers > 6 ? myNickname.slice(0, 4) : myNickname} (나)
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
            {Array.from(connectedUsers.entries()).map(([userId, userInfo]) => (
              <div key={userId} className="relative flex-shrink-0">
                <div className="relative group">
                  <video
                    ref={(el) => {
                      if (el) {
                        remoteVideoRefs.current?.set(userId, el);
                        const stream = remoteStreams.current?.get(userId);
                        if (stream && el.srcObject !== stream) {
                          el.srcObject = stream;
                          console.log("Remote stream connected for:", userId);
                        }
                      } else {
                        // 엘리먼트가 언마운트될 때 ref에서 제거
                        remoteVideoRefs.current?.delete(userId);
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
