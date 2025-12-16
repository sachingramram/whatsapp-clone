import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/User";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const { name, password } = await req.json();

    if (!name || !password) {
      return NextResponse.json(
        { error: "Name and password required" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ name });

    // User exists
    if (user) {
      if (user.password !== password) {
        return NextResponse.json(
          { error: "Wrong password" },
          { status: 401 }
        );
      }

      return NextResponse.json({
        message: "Login successful",
        user,
      });
    }

    // New user register
    const newUser = await User.create({ name, password });

    return NextResponse.json({
      message: "User registered",
      user: newUser,
    });

  } catch (error: unknown) {

    // 🔹 Mongo duplicate key error
    if (
      error instanceof mongoose.Error &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { error: "This name already exists, choose a unique name" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
