"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/* ================= TYPES ================= */

interface User {
  name: string;
}

interface Chat {
  _id: string;
  participants: string[];
}

interface Message {
  _id: string;
  sender: string;
  text: string;
}

/* ================= PAGE ================= */

export default function ChatPage() {
  const router = useRouter();

  /* ---------- USER ---------- */
  const [username] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("user");
    if (!stored) return null;
    return (JSON.parse(stored) as User).name;
  });

  /* ---------- CHAT ID FROM URL ---------- */
  const [chatId, setChatId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("c");
  });

  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");

  /* ================= REDIRECT IF NOT LOGGED IN ================= */
  useEffect(() => {
    if (!username) router.replace("/");
  }, [username, router]);

  /* ================= LOAD CHAT LIST ================= */
  useEffect(() => {
    if (!username) return;

    fetch(`/api/chat/list?user=${username}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { chats: Chat[] }) => {
        setChats(data.chats);
      });
  }, [username]);

  /* ================= LOAD MESSAGES ================= */
  useEffect(() => {
    if (!chatId) return;

    fetch(`/api/messages?chatId=${chatId}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { messages: Message[] }) => {
        setMessages(data.messages);
      });
  }, [chatId]);

  /* ================= SEARCH USER (FIXED) ================= */
  const searchUser = async () => {
    if (!username || !search.trim()) return;

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

    // open chat after search
    window.history.pushState(null, "", `/chat?c=${chatData.chat._id}`);
    setChatId(chatData.chat._id);
    setSearch("");
  };

  /* ================= SEND MESSAGE ================= */
  const sendMessage = async () => {
    if (!chatId || !username || !text.trim()) return;

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId,
        sender: username,
        text: text.trim(),
      }),
    });

    const data: { message: Message } = await res.json();
    setMessages((prev) => [...prev, data.message]);
    setText("");
  };

  const otherUser =
    chats
      .find((c) => c._id === chatId)
      ?.participants.find((p) => p !== username) ?? "";

  /* ================= UI ================= */

  return (
    <div className="h-screen flex bg-[#ECE5DD] overflow-hidden">

      {/* ================= CHAT LIST ================= */}
      <div className="w-full md:w-1/3 bg-white flex flex-col">

        {/* Header */}
        <div className="h-14 bg-[#075E54] text-white flex items-center px-4 font-medium">
  <span>WhatsApp</span>

  <button
    onClick={() => {
      localStorage.removeItem("user");
      window.location.href = "/";
    }}
    className="ml-auto text-sm opacity-90"
  >
    Logout
  </button>
</div>


        {/* Search */}
        <div className="p-2 bg-gray-100 flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exact username"
            className="flex-1 rounded-full px-4 py-2 text-sm outline-none"
          />
          <button
            onClick={searchUser}
            className="bg-[#075E54] text-white px-4 rounded-full text-sm"
          >
            Go
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {chats.map((chat) => {
            const name = chat.participants.find(
              (p) => p !== username
            );

            return (
              <div
                key={chat._id}
                className="px-4 py-3 border-b flex items-center gap-3"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white">
                  {name?.[0]}
                </div>

                {/* Name */}
                <div className="flex-1">
                  <p className="font-medium">{name}</p>
                </div>

                {/* Arrow Button (MOBILE + DESKTOP) */}
                <button
                  onClick={() => {
                    window.history.pushState(
                      null,
                      "",
                      `/chat?c=${chat._id}`
                    );
                    setChatId(chat._id);
                  }}
                  className="text-gray-500 text-xl"
                >
                  ➤
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= CHAT WINDOW ================= */}
      {chatId && (
        <div className="fixed md:static inset-0 flex flex-col flex-1 bg-[#ECE5DD]">

          {/* Header */}
          <div className="h-14 bg-[#075E54] text-white flex items-center px-3 gap-3">
            <button
              className="md:hidden"
              onClick={() => {
                window.history.pushState(null, "", "/chat");
                setChatId(null);
              }}
            >
              ←
            </button>
            <p className="font-medium">{otherUser}</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((msg) => (
              <div
                key={msg._id}
                className={`flex ${
                  msg.sender === username
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`px-3 py-2 rounded-lg max-w-[75%] text-sm ${
                    msg.sender === username
                      ? "bg-[#DCF8C6]"
                      : "bg-white"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="h-14 bg-white flex items-center px-2 gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Message"
              className="flex-1 bg-gray-100 rounded-full px-4 py-2 outline-none text-sm"
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
