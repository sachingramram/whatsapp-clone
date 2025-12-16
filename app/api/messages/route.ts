import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Message from "@/lib/Message";
import { pusher } from "@/lib/pusher";

interface MessageBody {
  chatId: string;
  sender: string;
  receiver: string;
  text: string;
}

export async function POST(req: Request) {
  try {
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
        { error: "Invalid payload" },
        { status: 400 }
      );
    }

    const { chatId, sender, receiver, text } =
      body as MessageBody;

    if (!receiver) {
      return NextResponse.json(
        { error: "Receiver missing" },
        { status: 400 }
      );
    }

    await connectDB();

    const message = await Message.create({
      chatId,
      sender,
      receiver,
      text,
      seen: false,
    });

    // 🔥 Pusher (safe)
    await pusher.trigger(`chat-${chatId}`, "new-message", {
      _id: message._id.toString(),
      chatId,
      sender,
      receiver,
      text,
      seen: false,
      createdAt: message.createdAt,
    });

    return NextResponse.json({ message });

  } catch (err) {
    console.error("MESSAGE API ERROR:", err);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
