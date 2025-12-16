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

/* ================= COMPONENT ================= */

export default function ChatPage() {
  /* ---------- CURRENT USER (SAFE INIT) ---------- */
  const [currentUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("user");
    return stored ? (JSON.parse(stored) as User) : null;
  });

  /* ---------- STATES ---------- */
  const [search, setSearch] = useState<string>("");
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState<string>("");

  /* ================= LOAD CHATS ON REFRESH ================= */
  useEffect(() => {
    if (!currentUser) return;

    fetch(`/api/chat/list?user=${currentUser.name}`)
      .then((res) => res.json())
      .then((data: { chats: Chat[] }) => {
        setChats(data.chats);
      })
      .catch(() => {
        console.error("Failed to load chats");
      });
  }, [currentUser]);

  /* ================= LOAD MESSAGES WHEN CHAT SELECTED ================= */
  useEffect(() => {
    if (!activeChat) return;

    fetch(`/api/messages?chatId=${activeChat._id}`)
      .then((res) => res.json())
      .then((data: { messages: Message[] }) => {
        setMessages(data.messages);
      })
      .catch(() => {
        console.error("Failed to load messages");
      });
  }, [activeChat]);

  /* ================= SEARCH USER (EXACT NAME) ================= */
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

    setChats((prev) => {
      const exists = prev.find((c) => c._id === chatData.chat._id);
      return exists ? prev : [...prev, chatData.chat];
    });

    setActiveChat(chatData.chat);
    setSearch("");
  };

  /* ================= SEND MESSAGE ================= */
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

  /* ================= LOGOUT ================= */
  const logout = () => {
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  /* ================= UI ================= */
  return (
    <div className="h-screen flex">
      {/* ===== SIDEBAR ===== */}
      <div className="w-1/4 border-r p-3 flex flex-col">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold">Chats</h2>
          <button
            onClick={logout}
            className="text-sm text-red-500"
          >
            Logout
          </button>
        </div>

        <input
          placeholder="Search exact username"
          className="w-full border p-2 mb-2"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <button
          onClick={searchUser}
          className="w-full bg-green-600 text-white py-2 rounded mb-3"
        >
          Search
        </button>

        <div className="flex-1 overflow-y-auto">
          {chats.map((chat) => {
            const otherUser = chat.participants.find(
              (p) => p !== currentUser?.name
            );

            return (
              <div
                key={chat._id}
                onClick={() => setActiveChat(chat)}
                className={`p-2 border-b cursor-pointer ${
                  activeChat?._id === chat._id
                    ? "bg-green-100"
                    : ""
                }`}
              >
                {otherUser}
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== CHAT WINDOW ===== */}
      <div className="flex-1 flex flex-col">
        {!activeChat ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a chat to start messaging
          </div>
        ) : (
          <>
            <div className="flex-1 p-4 overflow-y-auto">
              {messages.map((msg) => (
                <div
                  key={msg._id}
                  className={`mb-2 ${
                    msg.sender === currentUser?.name
                      ? "text-right"
                      : "text-left"
                  }`}
                >
                  <span className="inline-block bg-gray-200 px-3 py-1 rounded">
                    {msg.text}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-3 border-t flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="flex-1 border p-2 rounded"
                placeholder="Type a message"
              />
              <button
                onClick={sendMessage}
                className="bg-green-600 text-white px-4 rounded"
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
