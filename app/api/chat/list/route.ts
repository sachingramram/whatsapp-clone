import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Chat from "@/lib/Chat";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const user = searchParams.get("user");

  if (!user) {
    return NextResponse.json(
      { error: "user required" },
      { status: 400 }
    );
  }

  await connectDB();

  const chats = await Chat.find({
    participants: user,
  }).sort("-updatedAt");

  return NextResponse.json({ chats });
}
