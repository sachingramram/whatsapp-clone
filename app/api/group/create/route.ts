import { NextResponse } from "next/server";
import Chat from "@/lib/Chat";
import { connectDB } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();
  const { name, members, admin } = body as {
    name: string;
    members: string[];
    admin: string;
  };

  if (!name || members.length < 2) {
    return NextResponse.json(
      { error: "Group needs at least 3 people" },
      { status: 400 }
    );
  }

  await connectDB();

  const chat = await Chat.create({
    isGroup: true,
    name,
    participants: [admin, ...members],
    admin,
  });

  return NextResponse.json({ chat });
}
