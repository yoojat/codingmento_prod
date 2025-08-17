// import { useEffect, useRef, useState, useCallback } from "react";
// import { useSocket } from "../../../hooks/use-socket";
// import { Button } from "~/common/components/ui/button";
// import { Input } from "~/common/components/ui/input";
// import MediaComponent from "../components/media";
// import Face from "~/features/studylog/components/face";

// export default function Lesson() {
//   const socket = useSocket();
//   const [joined, setJoined] = useState(false);
//   const [roomName, setRoomName] = useState("");
//   const roomNameRef = useRef("");
//   const [messages, setMessages] = useState<string[]>([]);
//   const [newMessage, setNewMessage] = useState("");
//   const [nickname, setNickname] = useState("");
//   const [publicRooms, setPublicRooms] = useState<string[]>([]);
//   const [count, setCount] = useState<number>(0);
//   const [myPeerConnection, setMyPeerConnection] =
//     useState<RTCPeerConnection | null>(null);
//   const myPeerConnectionRef = useRef<RTCPeerConnection | null>(null);
//   const myFaceRef = useRef<HTMLVideoElement>(null);
//   const myDataChannelRef = useRef<RTCDataChannel | null>(null);

//   // roomName state와 ref를 동기화
//   useEffect(() => {
//     roomNameRef.current = roomName;
//   }, [roomName]);

//   // myPeerConnection state와 ref를 동기화
//   useEffect(() => {
//     myPeerConnectionRef.current = myPeerConnection;
//   }, [myPeerConnection]);

//   // 서버가 콜백으로 호출해 주면 화면 전환
//   const handleBackendDone = async (count: number) => {
//     setCount(count);
//     setJoined(true);
//     await makeConnection();
//   };

//   const handleNewMessage = (msg: string) => {
//     setMessages((prev) => [...prev, msg]);
//   };

//   const makeConnection = useCallback(async () => {
//     console.log("makeConnection called");
//     const peerConnection = new RTCPeerConnection({
//       iceServers: [
//         {
//           urls: [
//             "stun:stun.l.google.com:19302",
//             "stun:stun1.l.google.com:19302",
//             "stun:stun2.l.google.com:19302",
//             "stun:stun3.l.google.com:19302",
//             "stun:stun4.l.google.com:19302",
//           ],
//         },
//       ],
//     });

//     // 연결 상태 모니터링
//     peerConnection.onconnectionstatechange = () => {
//       console.log(
//         "Connection state changed to:",
//         peerConnection.connectionState
//       );
//     };

//     peerConnection.oniceconnectionstatechange = () => {
//       console.log(
//         "ICE connection state changed to:",
//         peerConnection.iceConnectionState
//       );
//     };

//     peerConnection.onicegatheringstatechange = () => {
//       console.log(
//         "ICE gathering state changed to:",
//         peerConnection.iceGatheringState
//       );
//     };

//     peerConnection.onicecandidate = (e) => {
//       console.log("sent ice candidate");
//       socket?.emit("ice", e.candidate, roomNameRef.current);
//     };

//     peerConnection.ontrack = (e) => {
//       myFaceRef.current!.srcObject = e.streams[0];
//     };

//     try {
//       // 미디어 스트림 가져오기
//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: true,
//         audio: true,
//       });

//       // 모든 트랙을 peer connection에 추가
//       stream.getTracks().forEach((track) => {
//         peerConnection.addTrack(track, stream);
//       });

//       setMyPeerConnection(peerConnection);
//     } catch (error) {
//       console.log("error : ", error);
//       setMyPeerConnection(peerConnection); // 스트림 없이라도 연결 시도
//     }
//   }, [socket]);

//   // 서버의 'welcome' 이벤트를 수신해서 messages에 추가
//   useEffect(() => {
//     if (!socket) return;

//     socket.on("welcome", (user, count) => {
//       handleNewMessage(`${user}님이 입장했습니다.`);
//       setCount(count);

//       // 새로운 사용자가 들어왔을 때만 offer를 생성하는 기존 사용자가 데이터 채널을 생성
//       if (myPeerConnectionRef.current && count > 1) {
//         console.log("Creating data channel for new user");
//         const dataChannel = myPeerConnectionRef.current.createDataChannel(
//           "chat",
//           {
//             ordered: true,
//           }
//         );

//         dataChannel.onopen = () => {
//           console.log("Data channel opened successfully");
//           myDataChannelRef.current = dataChannel;
//         };

//         dataChannel.onmessage = (e) => {
//           console.log("Received message via data channel:", e.data);
//           handleNewMessage(`상대방: ${e.data}`);
//         };

//         dataChannel.onerror = (error) => {
//           console.error("Data channel error:", error);
//         };

//         dataChannel.onclose = () => {
//           console.log("Data channel closed");
//           myDataChannelRef.current = null;
//         };

//         // offer 생성 및 전송
//         if (
//           joined &&
//           myPeerConnectionRef.current &&
//           socket &&
//           roomNameRef.current
//         ) {
//           myPeerConnectionRef.current.createOffer().then((offer) => {
//             myPeerConnectionRef.current?.setLocalDescription(offer);
//             console.log("sent offer to room:", roomNameRef.current);
//             socket.emit("offer", offer, roomNameRef.current);
//           });
//         }
//       }
//     });

//     socket.on("offer", async (offer) => {
//       console.log("received offer");
//       console.log(myPeerConnectionRef.current);

//       if (myPeerConnectionRef.current) {
//         // 데이터 채널 수신 리스너 설정
//         myPeerConnectionRef.current.ondatachannel = (e) => {
//           console.log("Data channel received:", e.channel.label);
//           const receivedChannel = e.channel;

//           receivedChannel.onopen = () => {
//             console.log("Received data channel opened successfully");
//             myDataChannelRef.current = receivedChannel;
//           };

//           receivedChannel.onmessage = (e) => {
//             console.log("Received message via data channel:", e.data);
//             handleNewMessage(`상대방: ${e.data}`);
//           };

//           receivedChannel.onerror = (error) => {
//             console.error("Received data channel error:", error);
//           };

//           receivedChannel.onclose = () => {
//             console.log("Received data channel closed");
//             myDataChannelRef.current = null;
//           };
//         };

//         await myPeerConnectionRef.current.setRemoteDescription(offer);
//         const answer = await myPeerConnectionRef.current.createAnswer();
//         await myPeerConnectionRef.current.setLocalDescription(answer);
//         console.log("sent answer");
//         socket.emit("answer", answer, roomNameRef.current);
//       }
//     });

//     socket.on("answer", (answer) => {
//       console.log("received answer");
//       myPeerConnectionRef.current?.setRemoteDescription(answer);
//     });

//     socket.on("ice", (ice) => {
//       myPeerConnectionRef.current?.addIceCandidate(ice);
//     });

//     socket.on("bye", (id, count) => {
//       handleNewMessage(`${id}님이 나갔습니다.`);
//       setCount(count);
//     });
//     // socket.on("new_message", (msg) => {
//     //   handleNewMessage(msg);
//     // });

//     socket.on("room_change", (rooms) => {
//       setPublicRooms(rooms);
//     });

//     return () => {
//       socket.off("welcome");
//       socket.off("offer");
//       socket.off("answer");
//       socket.off("ice");
//       socket.off("bye");
//       socket.off("new_message");
//       socket.off("room_change");
//     };
//   }, [socket, makeConnection]);

//   // 폼 제출 핸들러 (enter_room 이벤트 전송)
//   const handleRoomSubmit = (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     if (!socket || !roomName || !nickname) return;

//     socket.emit("nickname", nickname);
//     socket.emit("enter_room", roomName, handleBackendDone);
//   };

//   const handleMessageSubmit = (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     console.log("handleMessageSubmit called");
//     console.log("Data channel state:", myDataChannelRef.current?.readyState);
//     console.log(
//       "Peer connection state:",
//       myPeerConnectionRef.current?.connectionState
//     );
//     console.log(
//       "ICE connection state:",
//       myPeerConnectionRef.current?.iceConnectionState
//     );

//     if (myDataChannelRef.current?.readyState === "open") {
//       myDataChannelRef.current.send(newMessage);
//       handleNewMessage(`나: ${newMessage}`);
//       setNewMessage("");
//     } else {
//       console.error(
//         "Data channel is not open. State:",
//         myDataChannelRef.current?.readyState
//       );

//       // 디버깅을 위한 추가 정보
//       if (!myDataChannelRef.current) {
//         handleNewMessage("데이터 채널이 생성되지 않았습니다.");
//       } else {
//         handleNewMessage(
//           `데이터 채널 상태: ${myDataChannelRef.current.readyState}`
//         );
//       }

//       // 연결 재시도 로직
//       if (
//         myPeerConnectionRef.current?.connectionState === "connected" &&
//         !myDataChannelRef.current
//       ) {
//         console.log("Attempting to recreate data channel...");
//         const dataChannel = myPeerConnectionRef.current.createDataChannel(
//           "chat",
//           {
//             ordered: true,
//           }
//         );

//         dataChannel.onopen = () => {
//           console.log("Recreated data channel opened successfully");
//           myDataChannelRef.current = dataChannel;
//           handleNewMessage("데이터 채널이 다시 연결되었습니다.");
//         };

//         dataChannel.onmessage = (e) => {
//           console.log("Received message via recreated data channel:", e.data);
//           handleNewMessage(`상대방: ${e.data}`);
//         };

//         dataChannel.onerror = (error) => {
//           console.error("Recreated data channel error:", error);
//         };
//       }
//     }
//   };

//   // 첫 번째 사용자는 대기만 함 (데이터 채널 생성은 두 번째 사용자가 들어올 때)
//   useEffect(() => {
//     if (
//       joined &&
//       myPeerConnection &&
//       socket &&
//       roomNameRef.current &&
//       count === 1
//     ) {
//       console.log("First user in room, waiting for other users...");
//     }
//   }, [joined, myPeerConnection, socket, count]);

//   return (
//     <div className="p-6 max-w-md mx-auto">
//       {!joined ? (
//         <div id="welcome" className="space-y-4">
//           <h2 className="text-2xl font-bold">방번호를 입력해주세요!</h2>
//           <p>방번호를 입력하면 방에 입장합니다.</p>

//           <form onSubmit={handleRoomSubmit} className="flex flex-col space-y-2">
//             <Input
//               type="text"
//               required
//               placeholder="방번호"
//               value={roomName}
//               onChange={(e) => setRoomName(e.target.value.trim())}
//             />
//             <Input
//               type="text"
//               required
//               placeholder="닉네임"
//               value={nickname}
//               onChange={(e) => setNickname(e.target.value.trim())}
//             />
//             <Button
//               className="hover:cursor-pointer"
//               type="submit"
//               disabled={!socket}
//             >
//               입장
//             </Button>
//           </form>
//           <h4>Public Rooms</h4>
//           <ul>
//             {publicRooms.map((room) => (
//               <li key={room}>{room}</li>
//             ))}
//           </ul>
//         </div>
//       ) : (
//         <div id="room" className="space-y-4">
//           <h3 className="text-xl font-semibold">Room {roomName}</h3>
//           <p>서버가 입장을 확인했습니다! {count}명 입장</p>
//           {/* 들어온 welcome 메시지들을 리스트로 표시 */}
//           <ul className="list-disc pl-5 space-y-1">
//             {messages.map((msg, i) => (
//               <li key={i}>{msg}</li>
//             ))}
//           </ul>
//           <form onSubmit={handleMessageSubmit} className="flex space-x-2">
//             <input
//               type="text"
//               placeholder="메시지를 입력해주세요."
//               required
//               value={newMessage}
//               onChange={(e) => setNewMessage(e.target.value)}
//             />
//             <Button
//               className="hover:cursor-pointer"
//               variant={"secondary"}
//               disabled={myDataChannelRef.current?.readyState !== "open"}
//             >
//               전송
//             </Button>
//           </form>
//         </div>
//       )}
//       <MediaComponent myPeerConnection={myPeerConnection ?? undefined} />
//       <Face myFaceRef={myFaceRef} />
//     </div>
//   );
// }

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

export default function Lesson() {
  const socket = useSocket();

  // UI State
  const [isWelcomeHidden, setIsWelcomeHidden] = useState(false);
  const [inputRoomName, setInputRoomName] = useState("");
  const [roomName, setRoomName] = useState("");
  const roomNameRef = useRef<string>("");

  // MediaState
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
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  // Handle camera toggle
  const handleCameraClick = useCallback(() => {
    if (myStreamRef.current) {
      myStreamRef.current
        .getVideoTracks()
        .forEach((track) => (track.enabled = !track.enabled));
      setIsCameraOff(!isCameraOff);
    }
  }, [isCameraOff]);

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
        console.error("Error changing camera:", error);
      }
    },
    [getMedia]
  );
  // Create peer connection
  const makeConnection = useCallback(
    (newRoomName: string) => {
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

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("Sending ICE candidate");
          socket?.emit("ice", event.candidate, newRoomName);
        }
      };

      // Handle incoming stream
      peerConnection.ontrack = (event) => {
        console.log("Received remote stream");
        if (peerFaceRef.current) {
          peerFaceRef.current.srcObject = event.streams[0];
        }
      };

      // Add local stream to peer connection
      if (myStreamRef.current) {
        myStreamRef.current.getTracks().forEach((track) => {
          peerConnection.addTrack(track, myStreamRef.current!);
        });
      }

      myPeerConnectionRef.current = peerConnection;
      return peerConnection;
    },
    [socket, roomName]
  );

  // Initialize call
  const initCall = useCallback(
    async (newRoomName: string) => {
      setIsWelcomeHidden(true);
      await getMedia();
      makeConnection(newRoomName);
    },
    [getMedia, makeConnection]
  );

  const handleWelcomeSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputRoomName.trim() || !socket) return;

      const newRoomName = inputRoomName.trim();
      setRoomName(newRoomName);
      roomNameRef.current = newRoomName; // ref도 업데이트
      await initCall(newRoomName);
      console.log("📤 Joining room:", newRoomName);
      socket.emit("join_room", newRoomName);
      setInputRoomName("");
    },
    [inputRoomName, initCall, socket]
  );

  //Socket event handlers
  useEffect(() => {
    if (!socket) return;

    socket.on("connect", () => {
      console.log("🟢 Socket.IO 서버 연결 성공:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("🔴 Socket.IO 서버 연결 해제");
    });

    socket.on("welcome", async () => {
      console.log("📥 Welcome received - creating offer!!!!!!");
      if (myPeerConnectionRef.current) {
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
          console.log("Sending offer to room:", roomNameRef.current);
          socket.emit("offer", offer, roomNameRef.current);
        } catch (error) {
          console.error("Error creating offer:", error);
        }
      }
    });

    socket.on("offer", async (offer) => {
      console.log("Received offer");
      if (myPeerConnectionRef.current) {
        // Set up data channel receiver

        myPeerConnectionRef.current.ondatachannel = (event) => {
          console.log("Received data channel");
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
          socket.emit("answer", answer, roomNameRef.current);
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
    socket.on("ice", async (ice) => {
      console.log("Received ICE candidate");
      if (myPeerConnectionRef.current && ice) {
        try {
          await myPeerConnectionRef.current.addIceCandidate(ice);
        } catch (error) {
          console.error("Error adding ICE candidate:", error);
        }
      }
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
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
            <Button type="submit">입장</Button>
          </form>
        </div>
      )}
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
                    transform: "scaleX(-1)",
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
              <div className="relative">
                <video
                  ref={peerFaceRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-lg border border-gray-200"
                  style={{
                    transform: "scaleX(-1)",
                    backgroundColor: "#f3f4f6",
                  }}
                />
              </div>
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

      <Button
        onClick={() => {
          console.log(myDataChannelRef.current);
          myDataChannelRef.current?.send("bye");
        }}
      >
        나가기
      </Button>
    </div>
  );
}
