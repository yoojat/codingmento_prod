import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSocket } from "../../../hooks/use-socket";
import { useRoomSignaling } from "../../../hooks/use-room-signaling";
import { Input } from "~/common/components/ui/input";
import { Button } from "~/common/components/ui/button";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "~/common/components/ui/sidebar";

import Chat from "../components/chat";
import VideoControls from "../components/video-controls";
import { usePeerConnections } from "../../../hooks/use-peer-connections";
import { Textarea } from "~/common/components/ui/textarea";
import { useSkulptRunner } from "~/hooks/use-skulpt-runner";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { keymap } from "@codemirror/view";
import { defaultKeymap, historyKeymap } from "@codemirror/commands";
import FileExplorerSidebar, {
  type FileNode,
} from "~/features/lesson/components/file-explorer";
import { SaveIcon } from "lucide-react";
import { useFiles } from "~/hooks/use-files";

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
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => setIsHydrated(true), []);

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

  // 에디터 상태: userId -> content
  const [editorContents, setEditorContents] = useState<Map<string, string>>(
    new Map()
  );

  // 다중 사용자 관리
  const [connectedUsers, setConnectedUsers] = useState<Map<string, UserState>>(
    new Map()
  ); // userId => {name, isVideoOn, isAudioOn}

  // Refs
  const myFaceRef = useRef<HTMLVideoElement>(null);
  const myStreamRef = useRef<MediaStream | null>(null);
  const roomNameRef = useRef<string>("");

  // FilesProvider hooks
  const { getContent, setContent, subscribe } = useFiles();

  // Local-only file explorer state for my editor
  const initialTree: FileNode[] = useMemo(
    () => [
      {
        id: "root",
        userId: 1,
        name: "project",
        type: "folder",
        parentId: null,
        path: "/project",
        children: [
          {
            id: "main_py",
            userId: 1,
            name: "main.py",
            type: "file",
            parentId: "root",
            path: "/project/main.py",
          },
          {
            id: "utils",
            userId: 1,
            name: "utils",
            type: "folder",
            parentId: "root",
            path: "/project/utils",
            children: [
              {
                id: "helpers_py",
                userId: 1,
                name: "helpers.py",
                type: "file",
                parentId: "utils",
                path: "/project/utils/helpers.py",
              },
            ],
          },
        ],
      },
    ],
    []
  );
  const [fileTree] = useState<FileNode[]>(initialTree);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(
    "/project/main.py"
  );
  const [saveInfo, setSaveInfo] = useState<string>("");

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
    setEditorContents,
    getLocalEditorContent: () => editorContents.get(myUserId) ?? "",
  });

  // WebRTC 시그널링 훅으로 분리
  useRoomSignaling({
    socket,
    myUserId,
    createPeerConnection,
    closePeerConnection,
    peerConnections,
    setConnectedUsers,
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

  // 정리
  useEffect(() => {
    return () => {
      if (myStreamRef.current) {
        myStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      cleanupAllConnections();
    };
  }, [cleanupAllConnections]);

  // Load selected file into my editor content only for myUserId (via FilesProvider)
  useEffect(() => {
    if (!activeFilePath) return;
    const content = getContent(activeFilePath);
    setEditorContents((previous) => {
      const copy = new Map(previous);
      copy.set(myUserId, content);
      return copy;
    });
    const unsub = subscribe(activeFilePath, (next) => {
      setEditorContents((previous) => {
        const copy = new Map(previous);
        copy.set(myUserId, next);
        return copy;
      });
    });
    return unsub;
  }, [activeFilePath, myUserId, getContent, subscribe]);

  const handleSaveMyFile = useCallback(() => {
    if (!activeFilePath) return;
    const content = editorContents.get(myUserId) ?? "";
    setContent(activeFilePath, content);
    setSaveInfo(`${activeFilePath} 저장 완료`);
    setTimeout(() => setSaveInfo(""), 1500);
  }, [activeFilePath, editorContents, myUserId, setContent]);

  const myEditorHeader = (
    <div className="flex items-center gap-2 p-2 bg-white border-b">
      <SidebarTrigger />
      <div className="text-sm text-muted-foreground truncate">
        {activeFilePath ?? "새 파일"}
      </div>
      <div className="flex-1" />
      <Button size="sm" variant="secondary" onClick={handleSaveMyFile}>
        <SaveIcon className="w-4 h-4 mr-1" /> 저장
      </Button>
    </div>
  );

  return (
    <SidebarProvider>
      <FileExplorerSidebar
        activeFilePath={activeFilePath}
        onSelectFile={(p) => setActiveFilePath(p)}
        nodes={fileTree}
      />
      <SidebarInset>
        <div className="p-6 max-w-none w-full">
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
                  내 ID: {myNickname}{" "}
                  {isHydrated && myUserId ? `(${myUserId.slice(-8)})` : null}
                </div>
              </div>

              {/* 메인 콘텐츠 영역 */}
              <div className="flex-1 bg-gray-50 p-0 main-content">
                {/* 사용자별 에디터 그리드: 최대 2열, 가로 폭 최대 사용 */}
                <div className="grid gap-0 md:gap-0 grid-cols-1 md:grid-cols-2 w-full">
                  {/* 내 에디터 */}
                  <UserEditor
                    key={myUserId}
                    userId={myUserId}
                    nickname={myNickname || "나"}
                    value={editorContents.get(myUserId) ?? ""}
                    onChange={(next) => {
                      setEditorContents((previous) => {
                        const copy = new Map(previous);
                        copy.set(myUserId, next);
                        return copy;
                      });
                      // 데이터채널 브로드캐스트
                      for (const dc of dataChannels.current.values()) {
                        if (dc.readyState === "open") {
                          dc.send(
                            JSON.stringify({
                              type: "editor",
                              data: { userId: myUserId, content: next },
                            })
                          );
                        }
                      }
                    }}
                    showIdSuffix={isHydrated}
                    header={myEditorHeader}
                  />

                  {/* 원격 사용자 에디터들 */}
                  {Array.from(connectedUsers.entries()).map(([uid, u]) => (
                    <UserEditor
                      key={uid}
                      userId={uid}
                      nickname={u.nickname}
                      value={editorContents.get(uid) ?? ""}
                      readOnly
                      showIdSuffix={isHydrated}
                    />
                  ))}
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

                    for (const [
                      peerId,
                      pc,
                    ] of peerConnections.current.entries()) {
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
      </SidebarInset>
    </SidebarProvider>
  );
}

interface UserEditorProps {
  userId: string;
  nickname: string;
  value: string;
  onChange?: (next: string) => void;
  readOnly?: boolean;
  showIdSuffix?: boolean;
  header?: React.ReactNode;
}

function UserEditor({
  userId,
  nickname,
  value,
  onChange,
  readOnly,
  showIdSuffix = false,
  header,
}: UserEditorProps) {
  const preId = showIdSuffix ? `skulpt-output-${userId}` : "skulpt-output-ssr";
  const { loaded, error, output, run, canvasRef } = useSkulptRunner(preId);

  const runKeymap = keymap.of([
    {
      key: "Mod-Enter",
      run: () => {
        run(value);
        return true;
      },
    },
  ]);
  const defaultKeymapExt = keymap.of(defaultKeymap);
  const historyKeymapExt = keymap.of(historyKeymap);

  return (
    <div className="bg-white rounded-lg shadow p-0 border flex flex-col">
      {/* Top bar placeholder to keep equal height across editors */}
      <div className="min-h-12">{header}</div>
      <div className="p-3 space-y-3">
        <div className="mb-2 text-sm font-medium text-gray-700">
          {nickname}
          {showIdSuffix ? ` — ${userId.slice(-6)}` : null}
        </div>
        <CodeMirror
          value={value}
          height="280px"
          extensions={[runKeymap, python(), defaultKeymapExt, historyKeymapExt]}
          onChange={(v) => onChange?.(v)}
          readOnly={!!readOnly}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLine: true,
            highlightActiveLineGutter: true,
            indentOnInput: true,
            bracketMatching: true,
            foldGutter: true,
            defaultKeymap: false,
            history: true,
            allowMultipleSelections: true,
          }}
          theme="light"
          style={{ border: "1px solid #ddd" }}
        />
        <div className="flex items-center gap-2">
          <Button
            onClick={() => run(value)}
            disabled={!loaded || !!error}
            size="sm"
          >
            ▶️ Run
          </Button>
          {!loaded && !error && (
            <span className="text-xs text-gray-500">Skulpt 로딩 중…</span>
          )}
          {error && (
            <span className="text-xs text-red-600">Skulpt 로딩 실패</span>
          )}
        </div>
        <div>
          <h4 className="mb-1 text-xs font-semibold text-gray-700">콘솔</h4>
          <pre
            id={preId}
            className="p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32"
          >
            {output}
          </pre>
        </div>
        <div>
          <h4 className="mb-1 text-xs font-semibold text-gray-700">Turtle</h4>
          <div
            ref={canvasRef}
            className="w-full border border-gray-200 rounded"
          />
        </div>
      </div>
    </div>
  );
}
