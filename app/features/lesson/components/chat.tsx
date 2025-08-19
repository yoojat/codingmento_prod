import { useCallback, useEffect, useState } from "react";
import { Button } from "~/common/components/ui/button";
import { Input } from "~/common/components/ui/input";

interface ChatMessage {
  id: string;
  userId: string;
  nickname: string;
  message: string;
  timestamp: Date;
}

interface ChatProps {
  myUserId: string;
  myNickname: string;
  chatMessages: ChatMessage[];
  onSendMessage: (message: string) => void;
}

export default function Chat({
  myUserId,
  myNickname,
  chatMessages,
  onSendMessage,
}: ChatProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");

  // 채팅 메시지 전송
  const sendChatMessage = useCallback(() => {
    if (!inputMessage.trim()) return;
    onSendMessage(inputMessage.trim());
    setInputMessage("");
  }, [inputMessage, onSendMessage]);

  const handleChatSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      sendChatMessage();
    },
    [sendChatMessage]
  );

  // 채팅 메시지가 업데이트될 때 스크롤을 맨 아래로
  useEffect(() => {
    if (isChatOpen && chatMessages.length > 0) {
      const chatContainer = document.querySelector(".chat-messages");
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }
  }, [chatMessages, isChatOpen]);

  // 채팅이 열려있을 때 body에 클래스 추가/제거
  useEffect(() => {
    if (isChatOpen) {
      document.body.classList.add("chat-open");
    } else {
      document.body.classList.remove("chat-open");
    }

    // 컴포넌트 언마운트 시 정리
    return () => {
      document.body.classList.remove("chat-open");
    };
  }, [isChatOpen]);

  return (
    <>
      {/* 우측 상단 고정 토글 버튼 */}
      <div className="fixed top-20 right-4 z-20">
        <Button
          onClick={() => setIsChatOpen(!isChatOpen)}
          size="sm"
          className="bg-blue-500 hover:bg-blue-600 text-white shadow-lg rounded-full p-3 h-12 w-12"
        >
          💬
        </Button>
      </div>

      {/* 채팅 사이드바 */}
      <div
        className={`fixed top-16 right-0 h-[calc(100vh-4rem)] w-80 bg-white border-l shadow-lg transform transition-transform duration-300 z-10 ${
          isChatOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* 채팅 헤더 */}
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">채팅</h3>
              <Button
                onClick={() => setIsChatOpen(false)}
                variant="ghost"
                size="sm"
                className="p-1 h-8 w-8"
              >
                ✕
              </Button>
            </div>
          </div>

          {/* 채팅 메시지 리스트 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 chat-messages">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.userId === myUserId ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    msg.userId === myUserId
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-800"
                  }`}
                >
                  <div className="text-xs opacity-75 mb-1">
                    {msg.userId === myUserId ? "나" : msg.nickname}
                  </div>
                  <div className="text-sm">{msg.message}</div>
                </div>
                <div className="text-xs opacity-75 mt-1">
                  {msg.timestamp.toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* 채팅 입력 */}
          <div className="p-4 border-t bg-gray-50">
            <form onSubmit={handleChatSubmit} className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="메시지를 입력하세요..."
                className="flex-1"
                maxLength={500}
              />
              <Button
                type="submit"
                disabled={!inputMessage.trim()}
                size="sm"
                className="px-4"
              >
                전송
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* CSS 스타일 정의 */}
      <style>{`
        body.chat-open .main-content {
          margin-right: 320px !important;
          transition: margin-right 0.3s ease;
        }
        
        .main-content {
          transition: margin-right 0.3s ease;
        }
      `}</style>
    </>
  );
}
