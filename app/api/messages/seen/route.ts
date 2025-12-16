import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Message from "@/lib/Message";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { chatId, receiver } = body;

    if (!chatId || !receiver) {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }

    await connectDB();

    await Message.updateMany(
      { chatId, receiver, seen: false },
      { seen: true }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Seen error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
