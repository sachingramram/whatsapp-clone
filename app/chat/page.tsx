"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { pusherClient } from "@/lib/pusherClient";

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
  chatId: string;
  sender: string;
  receiver: string;
  text: string;
  seen: boolean;
  createdAt: string;
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

  /* ---------- CHAT ID ---------- */
  const [chatId, setChatId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("c");
  });

  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [typing, setTyping] = useState("");

  /* ================= AUTH ================= */
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
    if (!chatId || !username) return;

    fetch(`/api/messages?chatId=${chatId}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { messages: Message[] }) => {
        setMessages(data.messages);
      });
  }, [chatId, username]);

  /* ================= SEEN (DELAYED, SAFE) ================= */
  useEffect(() => {
    if (!chatId || !username) return;

    const timer = setTimeout(() => {
      fetch("/api/messages/seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          receiver: username,
        }),
      });
    }, 600); // delay = stable UI (WhatsApp style)

    return () => clearTimeout(timer);
  }, [chatId, username]);

  /* ================= REALTIME (PUSHER) ================= */
  useEffect(() => {
    if (!chatId) return;

    const channel = pusherClient.subscribe(`chat-${chatId}`);

    // 🔥 receiver only
    channel.bind("new-message", (msg: Message) => {
      if (msg.sender === username) return; // IMPORTANT FIX
      setMessages((prev) => [...prev, msg]);
    });

    channel.bind("typing", (d: { user: string; typing: boolean }) => {
      setTyping(d.typing ? `${d.user} is typing…` : "");
    });

    channel.bind("seen", () => {
      setMessages((prev) =>
        prev.map((m) => ({ ...m, seen: true }))
      );
    });

    return () => {
      pusherClient.unsubscribe(`chat-${chatId}`);
    };
  }, [chatId, username]);

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
  
    const otherUser =
      chats.find((c) => c._id === chatId)?.participants.find(
        (p) => p !== username
      );
  
    if (!otherUser) {
      alert("Chat not ready yet. Try again.");
      return;
    }
  
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId,
        sender: username,
        receiver: otherUser,
        text,
      }),
    });
  
    if (!res.ok) {
        console.error("Send failed", res.status);
      return;
    }
  
    const data = await res.json();
  
    // ✅ sender instant UI
    setMessages((prev) => [...prev, data.message]);
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
    <div className="h-screen flex bg-[#ECE5DD] overflow-hidden">
      {/* ===== CHAT LIST ===== */}
      <div className="w-full md:w-1/3 bg-white flex flex-col border-r">
        <div className="h-14 bg-[#075E54] text-white flex items-center px-4">
          <span className="font-semibold">WhatsApp</span>
          <button onClick={logout} className="ml-auto text-sm">
            Logout
          </button>
        </div>

        <div className="p-2 bg-gray-100 flex gap-2">
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
          {chats.map((chat) => {
            const name = chat.participants.find(
              (p) => p !== username
            );

            return (
              <div
                key={chat._id}
                className="px-4 py-3 border-b flex items-center justify-between"
              >
                <span className="font-medium">{name}</span>
                <button
                  onClick={() => {
                    window.history.pushState(
                      null,
                      "",
                      `/chat?c=${chat._id}`
                    );
                    setChatId(chat._id);
                  }}
                >
                  ➤
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== CHAT WINDOW ===== */}
      {chatId && (
        <div className="absolute md:static inset-0 flex flex-col flex-1 bg-[#ECE5DD]">
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
            <span className="font-medium">{otherUser}</span>
          </div>

          {typing && (
            <p className="text-xs text-gray-500 px-4 py-1">
              {typing}
            </p>
          )}

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
                  <p>{msg.text}</p>
                  <p className="text-[10px] text-gray-500 text-right">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {msg.sender === username &&
                      (msg.seen ? " ✓✓" : " ✓")}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="h-14 bg-white flex items-center px-2 gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Message"
              className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm"
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
