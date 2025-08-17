import { useEffect, useRef, useState } from "react";
import { useMediaStream } from "~/hooks/use-media-stream";
import { Button } from "~/common/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/common/components/ui/select";

interface MediaComponentProps {
  className?: string;
  videoWidth?: number;
  showControls?: boolean;
  myPeerConnection?: RTCPeerConnection;
  mirror?: boolean;
}

export default function MediaComponent({
  className = "",
  videoWidth = 400,
  showControls = true,
  myPeerConnection,
  mirror = true,
}: MediaComponentProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const {
    stream,
    cameras,
    error,
    isLoading,
    switchCamera,
    toggleAudio,
    toggleVideo,
  } = useMediaStream();

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");

  // 비디오 요소에 stream 연결
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (myPeerConnection) {
      stream?.getTracks().forEach((track) => {
        myPeerConnection.addTrack(track, stream);
      });
    }
  }, [myPeerConnection, stream]);

  // 첫 번째 카메라를 기본으로 설정
  useEffect(() => {
    if (cameras.length > 0 && !selectedCameraId) {
      setSelectedCameraId(cameras[0].deviceId);
    }
  }, [cameras, selectedCameraId]);

  const handleToggleAudio = () => {
    toggleAudio();
    setIsAudioMuted((prev) => !prev);
  };

  const handleToggleVideo = () => {
    toggleVideo();
    setIsVideoOff((prev) => !prev);
  };

  const handleCameraChange = async (deviceId: string) => {
    try {
      await switchCamera(deviceId);
      setSelectedCameraId(deviceId);
      if (myPeerConnection) {
        console.log("camera changed");
        const videoTrack = stream?.getVideoTracks()[0];
        const videoSender = myPeerConnection
          .getSenders()
          .find((sender) => sender.track?.kind === "video");
        if (videoSender && videoTrack) {
          videoSender.replaceTrack(videoTrack);
          console.log("camera changed2");
          console.log(videoSender);
          console.log(videoTrack);
        }
      }
    } catch (err) {
      console.error("Failed to switch camera:", err);
    }
  };

  return (
    <div className={`p-4 ${className}`}>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">Camera Error: {error.message}</p>
        </div>
      )}

      <div className="relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted // 항상 음소거로 설정하여 자동 재생 허용
          className="rounded-lg border border-gray-200"
          style={{
            width: `${videoWidth}px`,
            height: `${(videoWidth * 3) / 4}px`, // 4:3 비율 유지
            backgroundColor: "#f3f4f6", // 로딩 중 배경색
            transform: mirror ? "scaleX(-1)" : undefined,
          }}
        />

        {isLoading && (
          <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto mb-2"></div>
              <p className="text-gray-600 text-sm">Loading camera...</p>
            </div>
          </div>
        )}

        {isVideoOff && !isLoading && (
          <div className="absolute inset-0 bg-black rounded-lg flex items-center justify-center">
            <p className="text-white text-lg">Camera Off</p>
          </div>
        )}
      </div>

      {showControls && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={handleToggleAudio}
            variant={isAudioMuted ? "destructive" : "default"}
            size="sm"
          >
            {isAudioMuted ? "Unmute" : "Mute"}
          </Button>

          <Button
            onClick={handleToggleVideo}
            variant={isVideoOff ? "destructive" : "default"}
            size="sm"
          >
            {isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
          </Button>

          {cameras.length > 0 && (
            <Select value={selectedCameraId} onValueChange={handleCameraChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select camera" />
              </SelectTrigger>
              <SelectContent>
                {cameras.map((camera) => (
                  <SelectItem key={camera.deviceId} value={camera.deviceId}>
                    {camera.label || `Camera ${camera.deviceId.slice(0, 8)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
}
