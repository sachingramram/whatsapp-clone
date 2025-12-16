import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/User";

interface SearchBody {
  name: string;
}

export async function POST(req: Request) {
  const body: unknown = await req.json();

  if (
    typeof body !== "object" ||
    body === null ||
    !("name" in body)
  ) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }

  const { name } = body as SearchBody;

  await connectDB();

  const user = await User.findOne({ name });

  if (!user) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ user });
}
