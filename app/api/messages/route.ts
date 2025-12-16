import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Message from "@/lib/Message";
import { pusher } from "@/lib/pusher";

/* ========= GET MESSAGES ========= */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get("chatId");

    if (!chatId) {
      return NextResponse.json(
        { error: "chatId required" },
        { status: 400 }
      );
    }

    await connectDB();
    const messages = await Message.find({ chatId }).sort("createdAt");

    return NextResponse.json({ messages });
  } catch (err) {
    console.error("GET messages error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}

/* ========= SEND MESSAGE ========= */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { chatId, sender, receiver, text } = body;

    if (!chatId || !sender || !receiver || !text) {
      return NextResponse.json(
        { error: "Missing fields" },
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
    console.error("POST message error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
