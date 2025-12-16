import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Message from "@/lib/Message";
import { pusher } from "@/lib/pusher";

/* ================= TYPES ================= */

interface MessageBody {
  chatId: string;
  sender: string;
  receiver: string;
  text: string;
}

/* ================= GET MESSAGES ================= */

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get("chatId");

  if (!chatId) {
    return NextResponse.json(
      { error: "chatId required" },
      { status: 400 }
    );
  }

  await connectDB();

  const messages = await Message.find({ chatId }).sort(
    "createdAt"
  );

  return NextResponse.json({ messages });
}

/* ================= SEND MESSAGE ================= */

export async function POST(req: Request) {
  const body: unknown = await req.json();

  if (
    typeof body !== "object" ||
    body === null ||
    !("chatId" in body) ||
    !("sender" in body) ||
    !("receiver" in body) ||
    !("text" in body)
  ) {
    return NextResponse.json(
      { error: "Invalid message data" },
      { status: 400 }
    );
  }

  const { chatId, sender, receiver, text } =
    body as MessageBody;

  await connectDB();

  const message = await Message.create({
    chatId,
    sender,
    receiver,
    text,
    seen: false,
  });

  /* 🔥 REALTIME PUSH (VERCEL SAFE) */
  await pusher.trigger(
    `chat-${chatId}`,
    "new-message",
    {
      _id: message._id.toString(),
      chatId,
      sender,
      receiver,
      text,
      seen: false,
      createdAt: message.createdAt,
    }
  );

  return NextResponse.json({ message });
}
