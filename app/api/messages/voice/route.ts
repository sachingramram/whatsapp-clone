import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import Message from "@/lib/Message";
import { pusher } from "@/lib/pusher";

export async function POST(req: Request) {
  const form = await req.formData();
  const audio = form.get("audio") as Blob;
  const chatId = form.get("chatId") as string;
  const sender = form.get("sender") as string;

  const buffer = Buffer.from(await audio.arrayBuffer());
  const fileName = `${Date.now()}.webm`;
  const filePath = path.join(process.cwd(), "public/voices", fileName);

  await writeFile(filePath, buffer);

  const msg = await Message.create({
    chatId,
    sender,
    text: "",
    voice: `/voices/${fileName}`,
    seen: false,
  });

  await pusher.trigger(`chat-${chatId}`, "new-message", msg);

  return NextResponse.json({ message: msg });
}
