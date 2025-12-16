"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  seen: boolean;
  createdAt: string;
  voice?: string;
}

/* ================= PAGE ================= */

export default function ChatPage() {
  const router = useRouter();

  /* ---------- USER ---------- */
  const [username] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("user");
    return stored ? (JSON.parse(stored) as User).name : null;
  });

  /* ---------- CHAT ---------- */
  const [chatId, setChatId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("c");
  });

  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");

  /* ---------- TYPING ---------- */
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimer = useRef<NodeJS.Timeout | null>(null);

  /* ---------- VOICE ---------- */
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  /* ================= AUTH ================= */
  useEffect(() => {
    if (!username) router.replace("/");
  }, [username, router]);

  /* ================= LOAD CHAT LIST ================= */
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
      .then((d: { messages: Message[] }) => setMessages(d.messages));
  }, [chatId]);

  /* ================= MARK SEEN ================= */
  useEffect(() => {
    if (!chatId || !username) return;

    const t = setTimeout(() => {
      fetch("/api/messages/seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, receiver: username }),
      });
    }, 600);

    return () => clearTimeout(t);
  }, [chatId, username, messages.length]);

  /* ================= REALTIME ================= */
  useEffect(() => {
    if (!chatId || !username) return;

    const channel = pusherClient.subscribe(`chat-${chatId}`);

    channel.bind("new-message", (msg: Message) => {
      if (msg.sender === username) return;

      // 🔊 receive sound
      new Audio("/sounds/message.mp3").play().catch(() => {});

      setMessages((prev) => [...prev, msg]);
    });

    channel.bind("typing", (data: { user: string; typing: boolean }) => {
      if (data.user === username) return;
      setTypingUser(data.typing ? data.user : null);
    });

    channel.bind("seen", () => {
      setMessages((prev) =>
        prev.map((m) => ({ ...m, seen: true }))
      );
    });

    return () => {
      pusherClient.unsubscribe(`chat-${chatId}`);
    };
  }, [chatId, username]);

  /* ================= SEARCH USER ================= */
  const searchUser = async () => {
    if (!search.trim() || !username) return;

    const r = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: search }),
    });

    if (!r.ok) return alert("User not found");

    const d = await r.json();

    const cr = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user1: username,
        user2: d.user.name,
      }),
    });

    const cd = await cr.json();

    setChats((p) =>
      p.find((c) => c._id === cd.chat._id)
        ? p
        : [...p, cd.chat]
    );

    window.history.pushState(null, "", `/chat?c=${cd.chat._id}`);
    setChatId(cd.chat._id);
    setSearch("");
  };

  /* ================= SEND MESSAGE ================= */
  const sendMessage = async () => {
    if (!text.trim() || !chatId || !username) return;

    const other =
      chats.find((c) => c._id === chatId)?.participants.find(
        (p) => p !== username
      ) ?? "";

    if (!other) return;

    const r = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId,
        sender: username,
        receiver: other,
        text,
      }),
    });

    if (!r.ok) return alert("Send failed");

    const d = await r.json();
    setMessages((p) => [...p, d.message]);
    setText("");
  };

  /* ================= VOICE RECORD ================= */
  const startRecording = async () => {
    if (!chatId || !username) return;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);

    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      const formData = new FormData();

      formData.append("audio", blob);
      formData.append("chatId", chatId);
      formData.append("sender", username);

      await fetch("/api/messages/voice", {
        method: "POST",
        body: formData,
      });
    };

    recorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  /* ================= LOGOUT ================= */
  const logout = () => {
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  const activeChat = chats.find((c) => c._id === chatId);
  const otherUser =
    activeChat?.participants.find((p) => p !== username) ?? "";

  /* ================= UI ================= */

  return (
    <div className="h-screen flex bg-[#ECE5DD]">
      {/* CHAT LIST */}
      <div className="w-full md:w-1/3 bg-white flex flex-col border-r">
        <div className="h-14 bg-[#075E54] text-white flex items-center px-4">
          WhatsApp
          <button onClick={logout} className="ml-auto text-sm">
            Logout
          </button>
        </div>

        <div className="p-2 bg-gray-100 flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-full px-4 py-2 text-sm"
            placeholder="Search exact username"
          />
          <button
            onClick={searchUser}
            className="bg-[#075E54] text-white px-4 rounded-full text-sm"
          >
            Go
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {chats.map((c) => {
            const n = c.participants.find((p) => p !== username);
            return (
              <div
                key={c._id}
                className="px-4 py-3 border-b flex justify-between"
              >
                <span>{n}</span>
                <button
                  onClick={() => {
                    window.history.pushState(
                      null,
                      "",
                      `/chat?c=${c._id}`
                    );
                    setChatId(c._id);
                  }}
                >
                  ➤
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* CHAT WINDOW */}
      {chatId && (
        <div className="flex-1 flex flex-col">
          <div className="h-14 bg-[#075E54] text-white flex items-center px-4">
            <button
              className="md:hidden mr-2"
              onClick={() => {
                window.history.pushState(null, "", "/chat");
                setChatId(null);
              }}
            >
              ←
            </button>
            {otherUser}
          </div>

          {typingUser && (
            <p className="text-xs text-gray-600 px-4 py-1">
              {typingUser} is typing…
            </p>
          )}

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
                  className={`px-3 py-2 rounded-lg max-w-[70%] text-sm ${
                    m.sender === username
                      ? "bg-[#DCF8C6]"
                      : "bg-white"
                  }`}
                >
                  {m.text}
                  <div className="text-[10px] text-right text-gray-500">
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {m.sender === username &&
                      (m.seen ? " ✓✓" : " ✓")}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="h-14 bg-white flex items-center px-2 gap-2">
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              className={`text-xl ${
                recording ? "text-red-500" : ""
              }`}
            >
              🎤
            </button>

            <input
              value={text}
              onChange={(e) => {
                setText(e.target.value);

                if (!chatId || !username) return;

                fetch("/api/typing", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    chatId,
                    user: username,
                    typing: true,
                  }),
                });

                if (typingTimer.current) {
                  clearTimeout(typingTimer.current);
                }

                typingTimer.current = setTimeout(() => {
                  fetch("/api/typing", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      chatId,
                      user: username,
                      typing: false,
                    }),
                  });
                }, 1000);
              }}
              className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm"
              placeholder="Message"
            />

            <button
              onClick={sendMessage}
              className="text-[#075E54] font-medium px-3"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
