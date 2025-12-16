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

  /* ---------- USER (DERIVED SAFELY) ---------- */
  const [username] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("user");
    if (!stored) return null;
    return (JSON.parse(stored) as User).name;
  });

  /* ---------- CHAT ID (DERIVED SAFELY FROM URL) ---------- */
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

        // auto open first chat (mobile UX)
        if (!chatId && data.chats.length > 0) {
          const id = data.chats[0]._id;
          window.history.replaceState(null, "", `/chat?c=${id}`);
          setChatId(id);
        }
      });
  }, [username, chatId]);

  /* ================= LOAD MESSAGES ================= */
  useEffect(() => {
    if (!chatId) return;

    fetch(`/api/messages?chatId=${chatId}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { messages: Message[] }) => {
        setMessages(data.messages);
      });
  }, [chatId]);

  /* ================= SEARCH USER ================= */
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

  /* ================= LOGOUT ================= */
  const logout = () => {
    localStorage.removeItem("user");
    router.replace("/");
  };

  const activeChat = chats.find((c) => c._id === chatId);
  const otherUser =
    activeChat?.participants.find((p) => p !== username) ?? "";

  /* ================= UI ================= */

  return (
    <div className="h-screen bg-[#ECE5DD] flex overflow-hidden">

      {/* ================= CHAT LIST ================= */}
      <div
        className={`${
          chatId ? "hidden md:flex" : "flex"
        } w-full md:w-1/3 flex-col bg-white`}
      >
        {/* Header */}
        <div className="h-14 bg-[#075E54] text-white flex items-center px-4 font-medium">
          WhatsApp
          <button onClick={logout} className="ml-auto text-sm">
            Logout
          </button>
        </div>

        {/* Search */}
        <div className="p-2 bg-gray-100">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search or start new chat"
            className="w-full rounded-full px-4 py-2 text-sm outline-none"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {chats.map((chat) => {
            const name = chat.participants.find(
              (p) => p !== username
            );
            return (
              <div
                key={chat._id}
                onClick={() => {
                  window.history.pushState(
                    null,
                    "",
                    `/chat?c=${chat._id}`
                  );
                  setChatId(chat._id);
                }}
                className="px-4 py-3 border-b flex items-center gap-3 hover:bg-gray-100 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white">
                  {name?.[0]}
                </div>
                <p className="font-medium">{name}</p>
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
            <div className="w-9 h-9 rounded-full bg-gray-400 flex items-center justify-center">
              {otherUser[0]}
            </div>
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
