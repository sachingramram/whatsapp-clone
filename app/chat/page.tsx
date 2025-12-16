import dynamic from "next/dynamic";

// 🚫 Disable SSR completely for chat UI
const ChatClient = dynamic(() => import("./ChatClient"), {
  ssr: false,
});

export default function ChatPage() {
  return <ChatClient />;
}
