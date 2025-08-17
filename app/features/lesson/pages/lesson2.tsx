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

export default function Lesson2() {
  const socket = useSocket();

  // UI State
  const [isWelcomeHidden, setIsWelcomeHidden] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [inputRoomName, setInputRoomName] = useState("");

  // Media State
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  // Refs
  const myFaceRef = useRef<HTMLVideoElement>(null);
  const peerFaceRef = useRef<HTMLVideoElement>(null);
  const myStreamRef = useRef<MediaStream | null>(null);
  const myPeerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const myDataChannelRef = useRef<RTCDataChannel | null>(null);

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

  // Handle mute toggle
  const handleMuteClick = useCallback(() => {
    if (myStreamRef.current) {
      myStreamRef.current
        .getAudioTracks()
        .forEach((track) => (track.enabled = !track.enabled));
      setIsMuted((prev) => !prev);
    }
  }, []);

  // Handle camera toggle
  const handleCameraClick = useCallback(() => {
    if (myStreamRef.current) {
      myStreamRef.current
        .getVideoTracks()
        .forEach((track) => (track.enabled = !track.enabled));
      setIsCameraOff((prev) => !prev);
    }
  }, []);

  // Handle camera change
  const handleCameraChange = useCallback(
    async (deviceId: string) => {
      try {
        await getMedia(deviceId);
        setSelectedCameraId(deviceId);

        if (myPeerConnectionRef.current && myStreamRef.current) {
          const videoTrack = myStreamRef.current.getVideoTracks()[0];
          const videoSender = myPeerConnectionRef.current
            .getSenders()
            .find((sender) => sender.track?.kind === "video");

          if (videoSender && videoTrack) {
            await videoSender.replaceTrack(videoTrack);
          }
        }
      } catch (error) {
        console.error("Failed to switch camera:", error);
      }
    },
    [getMedia]
  );

  // Create peer connection
  const makeConnection = useCallback(() => {
    console.log("Creating peer connection");
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

    // ICE candidate handler
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate");
        socket?.emit("ice", event.candidate, roomName);
        console.log("roomName", roomName);
      }
    };

    // Handle incoming stream
    peerConnection.ontrack = (event) => {
      console.log("Received remote stream");
      if (peerFaceRef.current) {
        peerFaceRef.current.srcObject = event.streams[0];
      }
    };

    // Add local tracks
    if (myStreamRef.current) {
      myStreamRef.current.getTracks().forEach((track) => {
        peerConnection.addTrack(track, myStreamRef.current!);
      });
    }

    myPeerConnectionRef.current = peerConnection;
    return peerConnection;
  }, [socket, roomName]);

  // Initialize call
  const initCall = useCallback(async () => {
    setIsWelcomeHidden(true);
    await getMedia();
    makeConnection();
  }, [getMedia, makeConnection]);

  // Handle welcome form submit
  const handleWelcomeSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputRoomName.trim()) return;

      setRoomName(inputRoomName.trim());
      await initCall();
      socket?.emit("join_room", inputRoomName.trim());
      setInputRoomName("");
    },
    [inputRoomName, initCall, socket]
  );

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    // Handle welcome event (first user in room)
    socket.on("welcome", async () => {
      console.log("Welcome received - creating offer");
      if (myPeerConnectionRef.current) {
        // Create data channel
        const dataChannel =
          myPeerConnectionRef.current.createDataChannel("chat");
        myDataChannelRef.current = dataChannel;

        dataChannel.onmessage = (event) => {
          console.log("Received message via data channel:", event.data);
        };

        dataChannel.onopen = () => {
          console.log("Data channel opened");
        };

        // Create and send offer
        try {
          const offer = await myPeerConnectionRef.current.createOffer();
          await myPeerConnectionRef.current.setLocalDescription(offer);
          console.log("Sending offer");
          socket.emit("offer", offer, roomName);
        } catch (error) {
          console.error("Error creating offer:", error);
        }
      }
    });

    // Handle offer (second user)
    socket.on("offer", async (offer) => {
      console.log("Received offer");
      if (myPeerConnectionRef.current) {
        // Set up data channel receiver
        myPeerConnectionRef.current.ondatachannel = (event) => {
          const dataChannel = event.channel;
          myDataChannelRef.current = dataChannel;

          dataChannel.onmessage = (event) => {
            console.log("Received message via data channel:", event.data);
          };

          dataChannel.onopen = () => {
            console.log("Data channel opened");
          };
        };

        try {
          await myPeerConnectionRef.current.setRemoteDescription(offer);
          const answer = await myPeerConnectionRef.current.createAnswer();
          await myPeerConnectionRef.current.setLocalDescription(answer);
          console.log("Sending answer");
          socket.emit("answer", answer, roomName);
        } catch (error) {
          console.error("Error handling offer:", error);
        }
      }
    });

    // Handle answer
    socket.on("answer", async (answer) => {
      console.log("Received answer");
      if (myPeerConnectionRef.current) {
        try {
          await myPeerConnectionRef.current.setRemoteDescription(answer);
        } catch (error) {
          console.error("Error handling answer:", error);
        }
      }
    });

    // Handle ICE candidate
    socket.on("ice", async (candidate) => {
      console.log("Received ICE candidate");
      if (myPeerConnectionRef.current && candidate) {
        try {
          await myPeerConnectionRef.current.addIceCandidate(candidate);
        } catch (error) {
          console.error("Error adding ICE candidate:", error);
        }
      }
    });

    return () => {
      socket.off("welcome");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice");
    };
  }, [socket, roomName]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (myStreamRef.current) {
        myStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (myPeerConnectionRef.current) {
        myPeerConnectionRef.current.close();
      }
    };
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Welcome Section */}
      {!isWelcomeHidden && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">방번호를 입력해주세요!</h2>
          <form onSubmit={handleWelcomeSubmit} className="flex space-x-2">
            <Input
              type="text"
              placeholder="방번호를 입력하세요"
              value={inputRoomName}
              onChange={(e) => setInputRoomName(e.target.value)}
              className="flex-1"
              required
            />
            <Button type="submit" disabled={!socket}>
              입장
            </Button>
          </form>
        </div>
      )}

      {/* Call Section */}
      {isWelcomeHidden && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">방: {roomName}</h2>

          {/* Video Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* My Video */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">내 화면</h3>
              <div className="relative">
                <video
                  ref={myFaceRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full rounded-lg border border-gray-200"
                  style={{
                    transform: "scaleX(-1)", // Mirror effect
                    backgroundColor: "#f3f4f6",
                  }}
                />
                {isCameraOff && (
                  <div className="absolute inset-0 bg-black rounded-lg flex items-center justify-center">
                    <p className="text-white text-lg">Camera Off</p>
                  </div>
                )}
              </div>
            </div>

            {/* Peer Video */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">상대방 화면</h3>
              <video
                ref={peerFaceRef}
                autoPlay
                playsInline
                className="w-full rounded-lg border border-gray-200"
                style={{ backgroundColor: "#f3f4f6" }}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleMuteClick}
              variant={isMuted ? "destructive" : "default"}
              size="sm"
            >
              {isMuted ? "Unmute" : "Mute"}
            </Button>

            <Button
              onClick={handleCameraClick}
              variant={isCameraOff ? "destructive" : "default"}
              size="sm"
            >
              {isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
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
          </div>
        </div>
      )}
    </div>
  );
}
