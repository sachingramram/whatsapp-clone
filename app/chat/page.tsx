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
  const [currentUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("user");
    return stored ? (JSON.parse(stored) as User) : null;
  });

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");

  /* ========== LOAD CHAT LIST (ONCE) ========== */
  useEffect(() => {
    if (!currentUser) return;

    fetch(`/api/chat/list?user=${currentUser.name}`)
      .then((res) => res.json())
      .then((data: { chats: Chat[] }) => {
        setChats(data.chats);
      });
  }, [currentUser]);

  /* ========== LOAD MESSAGES ========== */
  useEffect(() => {
    if (!activeChat) return;

    fetch(`/api/messages?chatId=${activeChat._id}`)
      .then((res) => res.json())
      .then((data: { messages: Message[] }) => {
        setMessages(data.messages);
      });
  }, [activeChat]);

  /* ========== SEARCH USER ========== */
  const searchUser = async () => {
    if (!currentUser || !search.trim()) return;

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
        user1: currentUser.name,
        user2: data.user.name,
      }),
    });

    const chatData: { chat: Chat } = await chatRes.json();

    setChats((prev) =>
      prev.find((c) => c._id === chatData.chat._id)
        ? prev
        : [...prev, chatData.chat]
    );

    setActiveChat(chatData.chat);
    setSearch("");
  };

  /* ========== SEND MESSAGE ========== */
  const sendMessage = async () => {
    if (!activeChat || !currentUser || !text.trim()) return;

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId: activeChat._id,
        sender: currentUser.name,
        text: text.trim(),
      }),
    });

    const data: { message: Message } = await res.json();
    setMessages((prev) => [...prev, data.message]);
    setText("");
  };

  const logout = () => {
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  const otherUser =
    activeChat?.participants.find(
      (p) => p !== currentUser?.name
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
              (p) => p !== currentUser?.name
            );
            return (
              <div
                key={chat._id}
                onClick={() => setActiveChat(chat)}
                className="p-4 border-b cursor-pointer"
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
                  msg.sender === currentUser?.name
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`px-3 py-2 rounded ${
                    msg.sender === currentUser?.name
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
