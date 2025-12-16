import mongoose from "mongoose";

const ChatSchema = new mongoose.Schema(
  {
    participants: {
      type: [String], // usernames
      required: true,
    },
    lastMessage: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Chat ||
  mongoose.model("Chat", ChatSchema);
