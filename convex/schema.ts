import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Define the database schema for the chat application
export default defineSchema({
  // Table for storing chat sessions
  chats: defineTable({
    title: v.string(), // Title of the chat session
    userId: v.string(), // ID of the user who created the chat
    createdAt: v.number(), // Timestamp of chat creation
  }).index("by_user", ["userId"]), // Index to efficiently query chats by user

  // Table for storing individual messages within chats
  messages: defineTable({
    chatId: v.id("chats"), // Reference to the parent chat
    content: v.string(), // The actual message content
    role: v.union(v.literal("user"), v.literal("assistant")), // Message sender type
    createdAt: v.number(), // Timestamp of message creation
  }).index("by_chat", ["chatId"]), // Index to efficiently query messages by chat
});
