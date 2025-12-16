import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Chat from "@/lib/Chat";

interface ChatBody {
  user1: string;
  user2: string;
}

export async function POST(req: Request) {
  const body: unknown = await req.json();

  if (
    typeof body !== "object" ||
    body === null ||
    !("user1" in body) ||
    !("user2" in body)
  ) {
    return NextResponse.json(
      { error: "Invalid data" },
      { status: 400 }
    );
  }

  const { user1, user2 } = body as ChatBody;

  await connectDB();

  // Check existing chat
  let chat = await Chat.findOne({
    participants: { $all: [user1, user2] },
  });

  // First time chat
  if (!chat) {
    chat = await Chat.create({
      participants: [user1, user2],
    });
  }

  return NextResponse.json({ chat });
}
