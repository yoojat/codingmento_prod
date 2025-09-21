import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSocket } from "../../../hooks/use-socket";
import { useRoomSignaling } from "../../../hooks/use-room-signaling";
// import { Input } from "~/common/components/ui/input";
import { Button } from "~/common/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/common/components/ui/select";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  Sidebar,
  SidebarHeader,
  SidebarContent,
} from "~/common/components/ui/sidebar";

import Chat from "../components/chat";
import { usePeerConnections } from "../../../hooks/use-peer-connections";
import { useSkulptRunner } from "~/hooks/use-skulpt-runner";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { keymap } from "@codemirror/view";
import { defaultKeymap, historyKeymap } from "@codemirror/commands";
import { useFileTree } from "../hooks/use-file-tree";
import {
  Tree,
  type TreeViewElement,
} from "~/common/components/magicui/file-tree";
import { toTreeElements } from "../helpers/file-tree";
import { getLoggedInUserId } from "~/features/users/queries";
import { makeSSRClient } from "~/supa-client";
import type { Route } from "./+types/lesson";
import { RenderTree } from "../components/render-tree";
import { useFetcher } from "react-router";
import { handleFileAction } from "~/features/lesson/actions";

interface UserState {
  nickname: string;
  isVideoOn: boolean;
  isAudioOn: boolean;
}

// 고유 사용자 ID 생성
const generateUserId = () =>
  `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const loader = async ({ request }: Route.LoaderArgs) => {
  const { client } = makeSSRClient(request);
  const userId = await getLoggedInUserId(client);
  const { data: files, error: fileError } = await client
    .from("files")
    .select("id,name,type,parent_id,path")
    .eq("profile_id", userId)
    .order("updated_at", { ascending: false });
  if (fileError) throw new Error(fileError.message);
  // preset nickname from profile and role
  const { data: profile } = await client
    .from("profiles")
    .select("name,is_teacher")
    .eq("profile_id", userId)
    .limit(1)
    .maybeSingle();
  // available rooms: for students: their membership; for teachers: all their groups
  let availableRooms: string[] = [];
  if (profile?.is_teacher) {
    const { data: groups } = await (client as any)
      .from("lesson_groups")
      .select("name")
      .eq("teacher_id", userId)
      .order("created_at", { ascending: false });
    availableRooms = (groups ?? [])
      .map((g: any) => g?.name as string | null)
      .filter((n: string | null): n is string => !!n);
  } else {
    const { data: membership } = await (client as any)
      .from("lesson_group_students")
      .select("lesson_group_id")
      .eq("student_id", userId)
      .limit(1)
      .maybeSingle();
    if (membership?.lesson_group_id != null) {
      const { data: group } = await (client as any)
        .from("lesson_groups")
        .select("name")
        .eq("id", Number(membership.lesson_group_id))
        .limit(1)
        .maybeSingle();
      if (group?.name) availableRooms = [group.name];
    }
  }

  return {
    elements: toTreeElements(files ?? []),
    availableRooms,
    presetRoomName: availableRooms[0] ?? null,
    presetNickname: profile?.name ?? null,
  };
};

export const action = async ({ request }: Route.ActionArgs) => {
  const { client } = makeSSRClient(request);
  const userId = await getLoggedInUserId(client);
  const formData = await request.formData();
  return handleFileAction(client, userId, formData);
};

export default function Lesson({ loaderData }: Route.ComponentProps) {
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
  // 파일
  const { elements, presetRoomName, presetNickname, availableRooms } =
    loaderData as unknown as {
      elements: TreeViewElement[];
      presetRoomName: string | null;
      presetNickname: string | null;
      availableRooms: string[];
    };
  const fileTree = useFileTree(elements);
  useEffect(() => {
    if (presetRoomName) setInputRoomName(presetRoomName);
    if (presetNickname) setInputNickname(presetNickname);
  }, [presetRoomName, presetNickname]);
  const [saveInfo, setSaveInfo] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [selectedName, setSelectedName] = useState<string>("");
  const saveFetcher = useFetcher<{ ok: boolean; error?: string }>();
  const contentFetcher = useFetcher<{ content: string; name: string }>();
  const {
    loaded,
    error: skError,
    output,
    run,
    stop,
    canvasRef,
  } = useSkulptRunner();
  // Compact local media controls for editor overlay
  const [isMutedLocal, setIsMutedLocal] = useState(false);
  const [isCameraOffLocal, setIsCameraOffLocal] = useState(false);
  const toggleMuteLocal = useCallback(() => {
    if (!myStreamRef.current) return;
    myStreamRef.current
      .getAudioTracks()
      .forEach((t) => (t.enabled = !t.enabled));
    setIsMutedLocal((v) => !v);
  }, []);
  const toggleCameraLocal = useCallback(() => {
    if (!myStreamRef.current) return;
    myStreamRef.current
      .getVideoTracks()
      .forEach((t) => (t.enabled = !t.enabled));
    setIsCameraOffLocal((v) => !v);
  }, []);
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
  // Ensure video element reattaches stream after re-renders (e.g., file switches)
  useEffect(() => {
    if (myFaceRef.current && myStreamRef.current) {
      const v = myFaceRef.current;
      const s = myStreamRef.current;
      if (v.srcObject !== s) v.srcObject = s;
    }
  });
  // join 후 로컬 미디어 초기화 및 재협상
  useEffect(() => {
    if (!isWelcomeHidden) return;
    let cancelled = false;
    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { facingMode: "user" },
        });
        if (cancelled) return;
        myStreamRef.current = stream;
        if (myFaceRef.current) {
          myFaceRef.current.srcObject = stream;
        }
        for (const [peerId, pc] of peerConnections.current.entries()) {
          const hasAudioSender = pc
            .getSenders()
            .some((s) => s.track?.kind === "audio");
          const hasVideoSender = pc
            .getSenders()
            .some((s) => s.track?.kind === "video");
          const audio = stream.getAudioTracks()[0] || null;
          const video = stream.getVideoTracks()[0] || null;
          if (audio && !hasAudioSender) pc.addTrack(audio, stream);
          if (video && !hasVideoSender) pc.addTrack(video, stream);
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket?.emit("offer", offer, myUserId, peerId);
          } catch {}
        }
      } catch (err) {
        console.error("media init error", err);
      }
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [isWelcomeHidden]);

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
      console.log("handleWelcomeSubmit", inputRoomName, inputNickname);
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

  // 파일 트리 동기화
  useEffect(() => {
    fileTree.setTreeElements(elements);
  }, [elements]);

  // 파일 선택 시 내용 로드 및 런타임 출력 초기화
  useEffect(() => {
    if (!fileTree.selectedId) return;
    contentFetcher.load(`/lessons/private-code-content/${fileTree.selectedId}`);
    fileTree.setRenamingId(undefined);
    fileTree.setRenamingValue("");
    try {
      const pre = document.querySelector("pre");
      if (pre) pre.textContent = "";
    } catch {}
    if (canvasRef?.current) {
      canvasRef.current.innerHTML = "";
    }
  }, [fileTree.selectedId]);

  // 내용 로드 완료 시 에디터 상태 반영
  useEffect(() => {
    if (contentFetcher.state === "idle" && contentFetcher.data) {
      setContent(contentFetcher.data.content ?? "");
      setSelectedName(contentFetcher.data.name ?? "");
    }
  }, [contentFetcher.state, contentFetcher.data]);

  // 저장 제출 및 표시
  function submitSave() {
    if (!fileTree.selectedId) return;
    saveFetcher.submit(
      { intent: "save-content", id: fileTree.selectedId, content },
      { method: "post" }
    );
  }
  const isSaving = saveFetcher.state !== "idle";
  useEffect(() => {
    if (saveFetcher.state === "idle" && saveFetcher.data) {
      if (saveFetcher.data.ok) {
        setSaveInfo("저장 완료");
      } else {
        setSaveInfo(
          `저장 실패${
            saveFetcher.data.error ? `: ${saveFetcher.data.error}` : ""
          }`
        );
      }
      const t = setTimeout(() => setSaveInfo(""), 1500);
      return () => clearTimeout(t);
    }
  }, [saveFetcher.state, saveFetcher.data]);

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="pt-20 px-2 text-xs font-medium flex items-center justify-between">
            <div>Files</div>
          </div>
        </SidebarHeader>
        <SidebarContent className="h-full">
          <div
            ref={fileTree.containerRef}
            className="relative h-full"
            onContextMenu={fileTree.handleEmptyAreaContextMenu}
          >
            <Tree
              className="overflow-hidden rounded-md bg-background p-2"
              initialExpandedItems={fileTree.expandedIds}
              key={fileTree.treeKey}
              elements={fileTree.treeElements}
              onSelectedChange={fileTree.setSelectedId}
            >
              <RenderTree
                nodes={fileTree.treeElements}
                renamingId={fileTree.renamingId}
                renamingValue={fileTree.renamingValue}
                setRenamingValue={fileTree.setRenamingValue}
                renameInputRef={fileTree.renameInputRef}
                onSubmitCreateFolder={fileTree.submitCreateFolder}
                onSubmitCreateFile={fileTree.submitCreateFile}
                onSubmitRename={fileTree.submitRename}
                onRemoveDraftById={fileTree.removeDraftById}
                setRenamingId={fileTree.setRenamingId}
                onFolderContextMenu={fileTree.onFolderContextMenu}
                onFileContextMenu={fileTree.onFileContextMenu}
              />
            </Tree>
          </div>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <div className="p-6 max-w-none w-full">
          {!isWelcomeHidden && (
            <div className="space-y-4 mb-10">
              <h2 className="text-2xl font-bold">강의 입장</h2>
              <p>버튼을 누르면 자동으로 입장합니다.</p>
              {availableRooms.length > 1 ? (
                <div className="flex items-center gap-2">
                  <div className="text-sm">방 선택</div>
                  <Select
                    value={inputRoomName}
                    onValueChange={(v) => setInputRoomName(v)}
                  >
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="방을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRooms.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  방: {presetRoomName ?? "(없음)"}
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                닉네임: {presetNickname ?? "(없음)"}
              </div>
              <Button
                onClick={(e) =>
                  handleWelcomeSubmit(e as unknown as React.FormEvent)
                }
                disabled={!socket || !presetRoomName || !presetNickname}
                className="w-full cursor-pointer"
              >
                입장
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2 border-b p-3">
            <SidebarTrigger />
            <div className="truncate text-sm text-muted-foreground">
              {selectedName ? `${selectedName}` : "파일을 선택하세요"}
            </div>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="secondary"
              onClick={submitSave}
              disabled={!fileTree.selectedId || isSaving}
            >
              {isSaving ? "저장 중…" : "저장"}
            </Button>
            <Button
              size="sm"
              onClick={() => run(content)}
              disabled={!loaded || !!skError || !fileTree.selectedId}
            >
              실행
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => stop()}
              disabled={!fileTree.selectedId}
            >
              정지
            </Button>
          </div>

          <div className="p-4">
            <div className="w-full whitespace-pre-wrap text-sm text-muted-foreground grid grid-cols-1  gap-4">
              <div>
                <div className="relative">
                  <h4 className="mb-1 text-xs font-semibold text-gray-700">
                    {saveInfo ? (
                      <div className="mb-2 text-xs text-green-600">
                        {saveInfo}
                      </div>
                    ) : (
                      "editor"
                    )}
                  </h4>
                  {isWelcomeHidden && (
                    <div className="absolute top-2 right-2 z-20 flex flex-col items-end gap-1">
                      <div className="relative">
                        <video
                          ref={myFaceRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-40 h-28 object-cover rounded-md border border-gray-300 bg-gray-800 shadow"
                          style={{ transform: "scaleX(-1)" }}
                        />
                        {isCameraOffLocal && (
                          <div className="absolute inset-0 bg-black/60 rounded-md flex items-center justify-center">
                            <span className="text-white text-[10px]">
                              Camera Off
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          className="h-7 px-2 text-xs"
                          variant={isMutedLocal ? "destructive" : "secondary"}
                          onClick={toggleMuteLocal}
                        >
                          {isMutedLocal ? "🔇" : "🎤"}
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 px-2 text-xs"
                          variant={
                            isCameraOffLocal ? "destructive" : "secondary"
                          }
                          onClick={toggleCameraLocal}
                        >
                          {isCameraOffLocal ? "📷" : "📹"}
                        </Button>
                      </div>
                    </div>
                  )}
                  {contentFetcher.state === "loading" ? (
                    "Loading..."
                  ) : (
                    <CodeMirror
                      value={contentFetcher.data?.content ?? ""}
                      height="420px"
                      onChange={(value) => setContent(value)}
                      basicSetup={{
                        lineNumbers: true,
                        highlightActiveLine: true,
                        highlightActiveLineGutter: true,
                        indentOnInput: true,
                      }}
                    />
                  )}
                </div>

                <div className="mt-3">
                  <h4 className="mb-1 text-xs font-semibold text-gray-700">
                    콘솔
                  </h4>
                  <pre className="p-2 bg-gray-100 rounded text-xs overflow-auto max-h-48 md:max-h-80">
                    {output}
                  </pre>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {!loaded && !skError && (
                  <span className="text-xs text-gray-500">Skulpt 로딩 중…</span>
                )}
                {skError && (
                  <span className="text-xs text-red-600">Skulpt 로딩 실패</span>
                )}
                <div>
                  <h4 className="mb-1 text-xs font-semibold text-gray-700">
                    Turtle
                  </h4>
                  <div
                    ref={canvasRef}
                    className="w-full h-[220px] md:h-[500px] border border-gray-200 rounded"
                  />
                </div>
              </div>
            </div>
          </div>
          {isWelcomeHidden && (
            <div className="h-screen flex flex-col relative">
              {/* 상단 헤더 */}

              {/* 메인 콘텐츠 영역 */}
              <div className="flex-1 bg-gray-50 p-0 main-content">
                {/* 사용자별 에디터 그리드: 최대 2열, 가로 폭 최대 사용 */}
                <div className="grid gap-0 md:gap-0 grid-cols-1 md:grid-cols-2 w-full">
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
          height="420px"
          onChange={(v) => onChange?.(v)}
          readOnly={!!readOnly}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLine: true,
            highlightActiveLineGutter: true,
            indentOnInput: true,
            // bracketMatching: true,
            // foldGutter: true,
            // defaultKeymap: false,
            // history: true,
            // allowMultipleSelections: true,
          }}
          theme="light"
          style={{ border: "1px solid #ddd" }}
          extensions={[python()]}
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
