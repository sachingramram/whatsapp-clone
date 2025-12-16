import { NextResponse } from "next/server";
import { pusher } from "@/lib/pusher";

export async function POST(req: Request) {
  const { chatId, user, typing } = await req.json();

  await pusher.trigger(`chat-${chatId}`, "typing", {
    user,
    typing,
  });

  return NextResponse.json({ success: true });
}
