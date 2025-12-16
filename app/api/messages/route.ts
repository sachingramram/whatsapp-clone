import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Message from "@/lib/Message";

interface MessageBody {
  chatId: string;
  sender: string;
  text: string;
}

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

  const messages = await Message.find({ chatId }).sort("createdAt");

  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  const body: unknown = await req.json();

  if (
    typeof body !== "object" ||
    body === null ||
    !("chatId" in body) ||
    !("sender" in body) ||
    !("text" in body)
  ) {
    return NextResponse.json(
      { error: "Invalid message data" },
      { status: 400 }
    );
  }

  const { chatId, sender, text } = body as MessageBody;

  await connectDB();

  const message = await Message.create({
    chatId,
    sender,
    text,
  });

  return NextResponse.json({ message });
}
