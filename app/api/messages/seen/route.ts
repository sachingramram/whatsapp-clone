import { NextResponse } from "next/server";
import Message from "@/lib/Message";
import { pusher } from "@/lib/pusher";
import "@/lib/db";

export async function POST(req: Request) {
  const { chatId, reader } = await req.json();

  await Message.updateMany(
    { chatId, receiver: reader, seen: false },
    { seen: true }
  );

  await pusher.trigger(
    `chat-${chatId}`,
    "seen",
    {}
  );

  return NextResponse.json({ success: true });
}
