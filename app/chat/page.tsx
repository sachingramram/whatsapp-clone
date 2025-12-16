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

  /* ---------- CHAT ID FROM URL (NO useSearchParams) ---------- */
  const [chatId, setChatId] = useState<string | null>(null);

  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");

  /* ================= READ URL ON CLIENT ================= */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setChatId(params.get("c"));
  }, []);

  /* ================= REDIRECT IF NOT LOGGED IN ================= */
  useEffect(() => {
    if (!username) {
      router.replace("/");
    }
  }, [username, router]);

  /* ================= LOAD CHAT LIST ================= */
  useEffect(() => {
    if (!username) return;

    fetch(`/api/chat/list?user=${username}`, {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data: { chats: Chat[] }) => {
        setChats(data.chats);

        // 🔥 auto open first chat on mobile
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

    fetch(`/api/messages?chatId=${chatId}`, {
      cache: "no-store",
    })
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
    activeChat?.participants.find((p) => p !== username) ??
    "Select a chat";

  /* ================= UI ================= */

  return (
    <div className="h-screen flex bg-gray-100">
      {/* CHAT LIST */}
      <div className="w-full md:w-1/3 bg-white border-r flex flex-col">
        <div className="bg-green-600 text-white p-4 flex justify-between">
          <h1>WhatsApp</h1>
          <button onClick={logout}>Logout</button>
        </div>

        <div className="p-3 border-b">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border p-2 rounded"
            placeholder="Search exact username"
          />
          <button
            onClick={searchUser}
            className="w-full mt-2 bg-green-600 text-white py-2 rounded"
          >
            Search
          </button>
        </div>

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
                className={`p-4 border-b cursor-pointer ${
                  chat._id === chatId ? "bg-gray-100" : ""
                }`}
              >
                {name}
              </div>
            );
          })}
        </div>
      </div>

      {/* CHAT WINDOW */}
      <div className="flex-1 flex flex-col">
        <div className="bg-green-600 text-white p-4">
          {otherUser}
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

        {chatId && (
          <div className="p-3 bg-white border-t flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="flex-1 border rounded px-3"
            />
            <button
              onClick={sendMessage}
              className="bg-green-600 text-white px-4 rounded"
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
