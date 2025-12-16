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

  /* ---------- CHAT STATE ---------- */
  const [chatId, setChatId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false); // ✅ MOBILE FIX

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

      new Audio("/sounds/message.mp3").play().catch(() => {});
      setMessages((prev) => [...prev, msg]);
    });

    channel.bind("typing", (d: { user: string; typing: boolean }) => {
      if (d.user !== username) {
        setTypingUser(d.typing ? d.user : null);
      }
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

    setChatId(cd.chat._id);
    setIsChatOpen(true); // ✅ only on click
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

    if (!r.ok) return;

    const d = await r.json();
    setMessages((p) => [...p, d.message]);
    setText("");
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
      {/* ================= CHAT LIST ================= */}
      <div
        className={`bg-white flex flex-col border-r
        w-full md:w-1/3
        ${isChatOpen ? "hidden md:flex" : "flex"}`}
      >
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
                onClick={() => {
                  setChatId(c._id);
                  setIsChatOpen(true); // ✅ open chat manually
                }}
                className="px-4 py-3 border-b cursor-pointer hover:bg-gray-100"
              >
                {n}
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= CHAT WINDOW ================= */}
      {chatId && (
        <div
          className={`flex-1 flex flex-col bg-[#ECE5DD]
          ${isChatOpen ? "flex" : "hidden md:flex"}`}
        >
          <div className="h-14 bg-[#075E54] text-white flex items-center px-4">
            <button
              className="md:hidden mr-3"
              onClick={() => setIsChatOpen(false)}
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
                </div>
              </div>
            ))}
          </div>

          <div className="h-14 bg-white flex items-center px-2 gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
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
