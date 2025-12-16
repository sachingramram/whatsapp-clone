import mongoose from "mongoose";

const ChatSchema = new mongoose.Schema(
  {
    isGroup: { type: Boolean, default: false },
    name: { type: String },
    participants: {
      type: [String], // usernames
      required: true,
    },
    lastMessage: {
      type: String,
      default: "",
    },
    admin: {
      type: String, // username of creator
    },
  },
  { timestamps: true }
);

export default mongoose.models.Chat ||
  mongoose.model("Chat", ChatSchema);
