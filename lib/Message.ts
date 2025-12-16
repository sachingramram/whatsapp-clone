import mongoose, { Schema } from "mongoose";

const MessageSchema = new Schema(
  {
    chatId: { type: String, required: true },
    sender: { type: String, required: true },
    receiver: { type: String, required: true },
    text: { type: String, required: true },
    seen: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Message ||
  mongoose.model("Message", MessageSchema);
