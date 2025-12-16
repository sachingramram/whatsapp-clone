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
  /* ---------- CURRENT USER ---------- */
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

  /* ================= LOAD CHATS (SIDEBAR PERSIST) ================= */
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

  /* ================= LOAD MESSAGES ================= */
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

    setActiveChat(chatData.chat); // 📱 mobile opens chat
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

  const otherUser =
    activeChat?.participants.find(
      (p) => p !== currentUser?.name
    ) ?? "";

  /* ================= UI ================= */

  return (
    <div className="h-screen flex bg-gray-100">
      {/* ================= CHAT LIST ================= */}
      <div
        className={`${
          activeChat ? "hidden" : "flex"
        } md:flex w-full md:w-1/3 flex-col bg-white border-r`}
      >
        {/* Header */}
        <div className="bg-green-600 text-white p-4 flex justify-between items-center">
          <h1 className="font-semibold text-lg">WhatsApp</h1>
          <button onClick={logout} className="text-sm">
            Logout
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exact username"
            className="w-full border rounded p-2 text-sm"
          />
          <button
            onClick={searchUser}
            className="w-full mt-2 bg-green-600 text-white py-2 rounded text-sm"
          >
            Search
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto">
          {chats.map((chat) => {
            const name = chat.participants.find(
              (p) => p !== currentUser?.name
            );

            return (
              <div
                key={chat._id}
                onClick={() => setActiveChat(chat)}
                className="p-4 border-b cursor-pointer hover:bg-gray-100"
              >
                <p className="font-medium">{name}</p>
                <p className="text-xs text-gray-500">
                  Tap to chat
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= CHAT WINDOW ================= */}
      <div
        className={`${
          activeChat ? "flex" : "hidden"
        } md:flex flex-1 flex-col`}
      >
        {!activeChat ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a chat
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-green-600 text-white p-4 flex items-center gap-3">
              <button
                className="md:hidden"
                onClick={() => setActiveChat(null)}
              >
                ←
              </button>
              <h2 className="font-semibold">{otherUser}</h2>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-100">
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
                    className={`px-3 py-2 rounded-lg text-sm max-w-[70%] ${
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

            {/* Input */}
            <div className="p-3 bg-white border-t flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message"
                className="flex-1 border rounded-full px-4 py-2 text-sm"
              />
              <button
                onClick={sendMessage}
                className="bg-green-600 text-white px-4 rounded-full"
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
