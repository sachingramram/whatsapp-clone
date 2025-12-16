import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Message from "@/lib/Message";
import { pusher } from "@/lib/pusher";

interface SeenBody {
  chatId: string;
  receiver: string;
}

export async function POST(req: Request) {
  const body: unknown = await req.json();

  if (
    typeof body !== "object" ||
    body === null ||
    !("chatId" in body) ||
    !("receiver" in body)
  ) {
    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400 }
    );
  }

  const { chatId, receiver } = body as SeenBody;

  await connectDB();

  await Message.updateMany(
    {
      chatId,
      receiver,
      seen: false,
    },
    { seen: true }
  );

  await pusher.trigger(`chat-${chatId}`, "seen", {});

  return NextResponse.json({ success: true });
}
