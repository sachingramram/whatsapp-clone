import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Chat from "@/lib/Chat";

export async function POST(req: Request) {
  const { chatId, name, admin } = await req.json();

  await Chat.findOneAndUpdate(
    { _id: chatId, admin },
    { name }
  );

  return NextResponse.json({ success: true });
}
