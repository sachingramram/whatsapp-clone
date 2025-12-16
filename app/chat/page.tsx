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
  unread?: number; // 👈 already coming from backend
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
  const username =
    typeof window !== "undefined"
      ? (JSON.parse(localStorage.getItem("user") || "{}") as User).name
      : null;

  const [chats, setChats] = useState<Chat[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasLoadedChats, setHasLoadedChats] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");

  /* ---------- SEARCH ---------- */
  const [search, setSearch] = useState("");

  /* ---------- VOICE ---------- */
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  /* ================= HELPERS ================= */

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const logout = () => {
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  /* ================= LOAD CHATS ================= */
  useEffect(() => {
    if (!username) return;
  
    fetch(`/api/chat/list?user=${username}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d: { chats: Chat[] }) => {
        setChats(d.chats);
        setHasLoadedChats(true); // ✅ IMPORTANT
      })
      .catch(() => setHasLoadedChats(true));
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

        // 🔴 increment unread count in chat list (UI only)
        setChats((prev) =>
          prev.map((c) =>
            c._id === chatId
              ? { ...c, unread: (c.unread ?? 0) + 1 }
              : c
          )
        );
      }
    });

    channel.bind(
      "delete-message",
      (data: DeleteMessageEvent) => {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === data.messageId
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

  /* ================= SEARCH USER ================= */
  const searchUser = async () => {
    if (!search.trim() || !username) return;

    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: search.trim() }),
    });

    if (!res.ok) {
      alert("User not found");
      return;
    }

    const data: { user: User } = await res.json();

    const chatRes = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user1: username,
        user2: data.user.name,
      }),
    });

    const chatData: { chat: Chat } = await chatRes.json();

    setChats((prev) =>
      prev.find((c) => c._id === chatData.chat._id)
        ? prev
        : [...prev, chatData.chat]
    );

    setChatId(chatData.chat._id);
    setIsChatOpen(true);
    setSearch("");
  };

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

  const activeChat = chats.find((c) => c._id === chatId);
  const otherUser =
    activeChat?.participants.find((p) => p !== username) ??
    "";

  /* ================= UI ================= */

  return (
    <div className="h-screen flex bg-[#ECE5DD]">
      {/* ================= CHAT LIST ================= */}
      <div
        className={`bg-white border-r flex-col
        w-full md:w-1/3
        ${isChatOpen ? "hidden md:flex" : "flex"}`}
      >
        <div className="h-14 bg-[#075E54] text-white flex items-center px-4 justify-between">
          <span className="font-semibold">WhatsApp</span>
          <button onClick={logout} className="text-sm">
            Logout
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className="p-2 border-b bg-gray-100 flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exact username"
            className="flex-1 rounded-full px-4 py-2 text-sm"
          />
          <button
            onClick={searchUser}
            className="bg-[#075E54] text-white px-4 rounded-full text-sm"
          >
            Go
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
  {!hasLoadedChats ? (
    <p className="p-4 text-gray-400 text-sm">
      Loading chats...
    </p>
  ) : (
    chats.map((c) => {
      const name = c.participants.find(
        (p) => p !== username
      );

      return (
        <div
          key={c._id}
          onClick={() => {
            setChatId(c._id);
            setIsChatOpen(true);

            fetch("/api/messages/seen", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chatId: c._id,
                user: username,
              }),
            });

            // ✅ mark unread as 0 when opening
            setChats((prev) =>
              prev.map((x) =>
                x._id === c._id
                  ? { ...x, unread: 0 }
                  : x
              )
            );
          }}
          className="px-4 py-3 border-b cursor-pointer hover:bg-gray-100 flex justify-between items-center"
        >
          <span>{name}</span>

          {/* 🔴 UNREAD BADGE */}
          {c.unread !== undefined && c.unread > 0 && (
            <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
              {c.unread}
            </span>
          )}
        </div>
      );
    })
  )}
</div>

      </div>

      {/* ================= CHAT WINDOW ================= */}
      {chatId && (
        <div
          className={`flex-1 flex flex-col relative
          ${isChatOpen ? "flex" : "hidden md:flex"}`}
        >
          {/* HEADER */}
          <div className="h-14 bg-[#075E54] text-white flex items-center px-4 justify-between">
            <div className="flex items-center gap-3">
              <button
                className="md:hidden"
                onClick={() => setIsChatOpen(false)}
              >
                ⬅️⬅️ 
              </button>
              <span className="font-semibold">
                {otherUser}
              </span>
            </div>

            <button onClick={logout} className="text-sm">
              Logout
            </button>
          </div>

          {/* MESSAGES */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 pb-24">
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

                  <span className="block text-[10px] text-gray-500 text-right mt-1">
                    {formatTime(m.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ================= INPUT (FIXED BOTTOM) ================= */}
          <div
            className="
              bg-white px-2 py-2 flex items-end gap-2
              fixed bottom-0 left-0 right-0
              md:static
              z-50
            "
          >
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
               <span>Msg</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
