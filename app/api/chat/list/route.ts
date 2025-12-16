import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Chat from "@/lib/Chat";
import Message from "@/lib/Message";

/* ================= GET CHAT LIST WITH UNREAD ================= */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const user = searchParams.get("user");

    if (!user) {
      return NextResponse.json(
        { error: "user query param required" },
        { status: 400 }
      );
    }

    await connectDB();

    // 1️⃣ Get chats where user is a participant
    const chats = await Chat.find({
      participants: user,
    }).sort({ updatedAt: -1 });

    // 2️⃣ Add unread count per chat
    const chatsWithUnread = await Promise.all(
      chats.map(async (chat) => {
        const unread = await Message.countDocuments({
          chatId: chat._id.toString(),
          receiver: user,
          seen: false,
        });

        return {
          _id: chat._id.toString(),
          participants: chat.participants,
          unread,
        };
      })
    );

    return NextResponse.json({ chats: chatsWithUnread });
  } catch (error) {
    console.error("Chat list error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
