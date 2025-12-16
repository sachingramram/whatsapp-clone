"use client";

import { useEffect, useRef, useState } from "react";
import { pusherClient } from "@/lib/pusherClient";

/* ================= TYPES ================= */

interface User {
  name: string;
}

interface Chat {
  _id: string;
  participants: string[];
  unread?: number;
}

interface Message {
  _id: string;
  chatId: string;
  sender: string;
  receiver: string;
  text: string;
  voice?: string;
  seen: boolean;
  createdAt: string;
  deletedForEveryone?: boolean;
}

interface DeleteMessageEvent {
  messageId: string;
}

/* ================= PAGE ================= */

export default function ChatPage() {
  /* ---------- USER ---------- */
  const username =
    typeof window !== "undefined"
      ? (JSON.parse(localStorage.getItem("user") || "{}") as User).name
      : null;

  /* ---------- STATE ---------- */
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");

  /* ---------- VOICE ---------- */
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  /* ================= LOAD CHATS ================= */
  useEffect(() => {
    if (!username) return;

    fetch(`/api/chat/list?user=${username}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { chats: Chat[] }) => setChats(d.chats));
  }, [username]);

  /* ================= LOAD MESSAGES ================= */
  useEffect(() => {
    if (!chatId) return;

    fetch(`/api/messages?chatId=${chatId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { messages: Message[] }) =>
        setMessages(d.messages)
      );
  }, [chatId]);

  /* ================= REALTIME ================= */
  useEffect(() => {
    if (!chatId || !username) return;

    const channel = pusherClient.subscribe(`chat-${chatId}`);

    channel.bind("new-message", (msg: Message) => {
      if (msg.sender !== username) {
        new Audio("/sounds/message.mp3").play().catch(() => {});
        setMessages((prev) => [...prev, msg]);
      }
    });

    channel.bind(
      "delete-message",
      (data: DeleteMessageEvent) => {
        const { messageId } = data;
        setMessages((prev) =>
          prev.map((m) =>
            m._id === messageId
              ? { ...m, deletedForEveryone: true }
              : m
          )
        );
      }
    );

    return () => {
      pusherClient.unsubscribe(`chat-${chatId}`);
    };
  }, [chatId, username]);

  /* ================= SEND TEXT ================= */
  const sendMessage = async () => {
    if (!text.trim() || !chatId || !username) return;

    const other =
      chats
        .find((c) => c._id === chatId)
        ?.participants.find((p) => p !== username) ?? "";

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId,
        sender: username,
        receiver: other,
        text,
      }),
    });

    if (!res.ok) return;

    const data: { message: Message } = await res.json();
    setMessages((prev) => [...prev, data.message]);
    setText("");
  };

  /* ================= VOICE ================= */
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];
    setDuration(0);

    recorder.ondataavailable = (e) =>
      chunksRef.current.push(e.data);

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, {
        type: "audio/webm",
      });

      const form = new FormData();
      form.append("audio", blob);
      form.append("chatId", chatId as string);
      form.append("sender", username as string);

      await fetch("/api/messages/voice", {
        method: "POST",
        body: form,
      });
    };

    recorder.start();
    setRecording(true);

    timerRef.current = setInterval(
      () => setDuration((d) => d + 1),
      1000
    );
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  /* ================= UI ================= */

  return (
    <div className="h-screen flex bg-[#ECE5DD]">
      {/* ================= CHAT LIST ================= */}
      <div
        className={`bg-white border-r flex-col
        w-full md:w-1/3
        ${isChatOpen ? "hidden md:flex" : "flex"}`}
      >
        <div className="h-14 bg-[#075E54] text-white flex items-center px-4">
          WhatsApp
        </div>

        <div className="flex-1 overflow-y-auto">
          {chats.map((c) => {
            const name = c.participants.find(
              (p) => p !== username
            );
            return (
              <div
                key={c._id}
                onClick={() => {
                  setChatId(c._id);
                  setIsChatOpen(true);
                }}
                className="px-4 py-3 border-b cursor-pointer hover:bg-gray-100"
              >
                {name}
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= CHAT WINDOW ================= */}
      {chatId && (
        <div
          className={`flex-1 flex flex-col
          ${isChatOpen ? "flex" : "hidden md:flex"}`}
        >
          <div className="h-14 bg-[#075E54] text-white flex items-center px-4">
            <button
              className="md:hidden mr-3"
              onClick={() => setIsChatOpen(false)}
            >
              ←
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((m) => (
              <div
                key={m._id}
                className={`flex ${
                  m.sender === username
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`px-3 py-2 rounded-lg text-sm max-w-[70%]
                  ${
                    m.sender === username
                      ? "bg-[#DCF8C6]"
                      : "bg-white"
                  }`}
                >
                  {m.deletedForEveryone ? (
                    <i className="text-gray-400">
                      This message was deleted
                    </i>
                  ) : m.voice ? (
                    <audio controls src={m.voice} />
                  ) : (
                    m.text
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ================= INPUT ================= */}
          <div className="bg-white px-2 py-2 flex items-end gap-2">
            {recording && (
              <div className="flex items-center gap-2 text-red-500">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-1 h-4 bg-red-500 animate-pulse"
                    />
                  ))}
                </div>
                <span className="text-xs">{duration}s</span>
              </div>
            )}

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={1}
              placeholder="Message"
              className="flex-1 resize-none bg-gray-100 rounded-xl px-3 py-2 text-sm"
            />

            {text.trim() ? (
              <button
                onClick={sendMessage}
                className="bg-[#075E54] text-white rounded-full w-10 h-10"
              >
                ➤
              </button>
            ) : (
              <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                className="bg-[#075E54] text-white rounded-full w-10 h-10"
              >
                🎤
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
