"use client";

import { useEffect, useState } from "react";

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
  /* ---------- USERNAME (LAZY INIT) ---------- */
  const [username] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("user");
    if (!stored) return null;
    const parsed = JSON.parse(stored) as User;
    return parsed.name;
  });

  /* ---------- CHATS (LAZY INIT) ---------- */
  const [chats, setChats] = useState<Chat[]>(() => {
    if (typeof window === "undefined") return [];
    const cached = localStorage.getItem("chat_list");
    return cached ? (JSON.parse(cached) as Chat[]) : [];
  });

  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");

  /* ================= REDIRECT IF NOT LOGGED IN ================= */
  useEffect(() => {
    if (!username) {
      window.location.href = "/";
    }
  }, [username]);

  /* ================= FETCH CHAT LIST (SERVER ONLY) ================= */
  useEffect(() => {
    if (!username) return;

    fetch(`/api/chat/list?user=${username}`, {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data: { chats: Chat[] }) => {
        setChats(data.chats);
        localStorage.setItem(
          "chat_list",
          JSON.stringify(data.chats)
        );
      });
  }, [username]);

  /* ================= LOAD MESSAGES ================= */
  useEffect(() => {
    if (!activeChat) return;

    fetch(`/api/messages?chatId=${activeChat._id}`, {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data: { messages: Message[] }) => {
        setMessages(data.messages);
      });
  }, [activeChat]);

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

    setChats((prev) => {
      const updated = prev.find(
        (c) => c._id === chatData.chat._id
      )
        ? prev
        : [...prev, chatData.chat];

      localStorage.setItem(
        "chat_list",
        JSON.stringify(updated)
      );

      return updated;
    });

    setActiveChat(chatData.chat);
    setSearch("");
  };

  /* ================= SEND MESSAGE ================= */
  const sendMessage = async () => {
    if (!activeChat || !username || !text.trim()) return;

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId: activeChat._id,
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
    localStorage.removeItem("chat_list");
    window.location.href = "/";
  };

  const otherUser =
    activeChat?.participants.find(
      (p) => p !== username
    ) ?? "";

  /* ================= UI ================= */

  return (
    <div className="h-screen flex bg-gray-100 relative">
      {/* ===== CHAT LIST (ALWAYS VISIBLE) ===== */}
      <div className="w-full md:w-1/3 flex flex-col bg-white border-r">
        <div className="bg-green-600 text-white p-4 flex justify-between">
          <h1 className="font-semibold">WhatsApp</h1>
          <button onClick={logout}>Logout</button>
        </div>

        <div className="p-3 border-b">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exact username"
            className="w-full border p-2 rounded"
          />
          <button
            onClick={searchUser}
            className="w-full mt-2 bg-green-600 text-white py-2 rounded"
          >
            Search
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 && (
            <p className="p-4 text-gray-400">
              No chats yet
            </p>
          )}

          {chats.map((chat) => {
            const name = chat.participants.find(
              (p) => p !== username
            );
            return (
              <div
                key={chat._id}
                onClick={() => setActiveChat(chat)}
                className="p-4 border-b cursor-pointer hover:bg-gray-100"
              >
                {name}
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== CHAT WINDOW (OVERLAY ON MOBILE) ===== */}
      {activeChat && (
        <div className="fixed inset-0 md:static md:flex flex-1 flex-col bg-gray-100 z-50">
          <div className="bg-green-600 text-white p-4 flex items-center gap-3">
            <button
              className="md:hidden"
              onClick={() => setActiveChat(null)}
            >
              ←
            </button>
            <h2 className="font-semibold">{otherUser}</h2>
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            {messages.map((msg) => (
              <div
                key={msg._id}
                className={`mb-2 flex ${
                  msg.sender === username
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`px-3 py-2 rounded ${
                    msg.sender === username
                      ? "bg-green-500 text-white"
                      : "bg-white"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-white border-t flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="flex-1 border rounded px-3"
              placeholder="Type a message"
            />
            <button
              onClick={sendMessage}
              className="bg-green-600 text-white px-4 rounded"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
