import { NextResponse } from "next/server";
import Message from "@/lib/Message";
import { connectDB } from "@/lib/db";

interface SeenBody {
  chatId: string;
  user: string;
}

export async function POST(req: Request) {
  const body: unknown = await req.json();

  if (
    typeof body !== "object" ||
    body === null ||
    !("chatId" in body) ||
    !("user" in body)
  ) {
    return NextResponse.json(
      { error: "Invalid body" },
      { status: 400 }
    );
  }

  const { chatId, user } = body as SeenBody;

  await connectDB();

  // 🔥 mark messages as seen
  await Message.updateMany(
    {
      chatId,
      receiver: user,
      seen: false,
    },
    {
      $set: { seen: true },
    }
  );

  return NextResponse.json({ success: true });
}
