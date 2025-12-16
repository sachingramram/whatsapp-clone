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

/* ================= CHAT LIST COMPONENT ================= */

interface ChatListProps {
  chats: Chat[];
  search: string;
  setSearch: (v: string) => void;
  onSearch: () => void;
  onSelectChat: (chat: Chat) => void;
  onLogout: () => void;
  currentUser: User | null;
}

function ChatList({
  chats,
  search,
  setSearch,
  onSearch,
  onSelectChat,
  onLogout,
  currentUser,
}: ChatListProps) {
  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="bg-green-600 text-white p-4 flex justify-between">
        <h1 className="font-semibold">WhatsApp</h1>
        <button onClick={onLogout}>Logout</button>
      </div>

      <div className="p-3 border-b">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search exact username"
          className="w-full border p-2 rounded"
        />
        <button
          onClick={onSearch}
          className="w-full mt-2 bg-green-600 text-white py-2 rounded"
        >
          Search
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {chats.map((chat) => {
          const name = chat.participants.find(
            (p) => p !== currentUser?.name
          );

          return (
            <div
              key={chat._id}
              onClick={() => onSelectChat(chat)}
              className="p-4 border-b cursor-pointer"
            >
              {name}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================= CHAT WINDOW COMPONENT ================= */

interface ChatWindowProps {
  messages: Message[];
  text: string;
  setText: (v: string) => void;
  onSend: () => void;
  onBack: () => void;
  isMobile: boolean;
  otherUser: string;
  currentUser: User | null;
}

function ChatWindow({
  messages,
  text,
  setText,
  onSend,
  onBack,
  isMobile,
  otherUser,
  currentUser,
}: ChatWindowProps) {
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <div className="bg-green-600 text-white p-4 flex items-center gap-3">
        {isMobile && (
          <button onClick={onBack}>←</button>
        )}
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
          onClick={onSend}
          className="bg-green-600 text-white px-4 rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}

/* ================= MAIN PAGE ================= */

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
  const [isMobile, setIsMobile] = useState(false);

  /* Detect mobile */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* Load chats */
  useEffect(() => {
    if (!currentUser) return;

    fetch(`/api/chat/list?user=${currentUser.name}`)
      .then((res) => res.json())
      .then((data: { chats: Chat[] }) => setChats(data.chats));
  }, [currentUser]);

  /* Load messages */
  useEffect(() => {
    if (!activeChat) return;

    fetch(`/api/messages?chatId=${activeChat._id}`)
      .then((res) => res.json())
      .then((data: { messages: Message[] }) =>
        setMessages(data.messages)
      );
  }, [activeChat]);

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

  /* ================= RENDER ================= */

  if (isMobile) {
    return activeChat ? (
      <ChatWindow
        messages={messages}
        text={text}
        setText={setText}
        onSend={sendMessage}
        onBack={() => setActiveChat(null)}
        isMobile
        otherUser={otherUser}
        currentUser={currentUser}
      />
    ) : (
      <ChatList
        chats={chats}
        search={search}
        setSearch={setSearch}
        onSearch={searchUser}
        onSelectChat={setActiveChat}
        onLogout={logout}
        currentUser={currentUser}
      />
    );
  }

  return (
    <div className="flex h-screen">
      <div className="w-1/3 border-r">
        <ChatList
          chats={chats}
          search={search}
          setSearch={setSearch}
          onSearch={searchUser}
          onSelectChat={setActiveChat}
          onLogout={logout}
          currentUser={currentUser}
        />
      </div>
      <div className="flex-1">
        {activeChat ? (
          <ChatWindow
            messages={messages}
            text={text}
            setText={setText}
            onSend={sendMessage}
            onBack={() => setActiveChat(null)}
            isMobile={false}
            otherUser={otherUser}
            currentUser={currentUser}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            Select a chat
          </div>
        )}
      </div>
    </div>
  );
}
