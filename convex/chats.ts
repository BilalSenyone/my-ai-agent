import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Mutation to create a new chat session.
 * Requires authentication and stores the chat with user information.
 */
export const createChat = mutation({
  args: {
    title: v.string(), // The title for the new chat session
  },
  handler: async (ctx, args) => {
    // Verify user authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Create new chat entry in the database
    const chat = await ctx.db.insert("chats", {
      title: args.title,
      userId: identity.subject, // Store authenticated user's ID
      createdAt: Date.now(), // Current timestamp
    });

    return chat;
  },
});

export const deleteChat = mutation({
  args: { id: v.id("chats") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    console.log("Deleting chat backend : ", args.id);

    const chat = await ctx.db.get(args.id);
    if (!chat || chat.userId !== identity.subject) {
      throw new Error("Chat not found or unauthorized");
    }

    // Delete all messages in the chat
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.id))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }
    // Delete the chat
    await ctx.db.delete(args.id);
  },
});

export const listChats = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    console.log(identity);
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const chats = await ctx.db
      .query("chats")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();

    return chats;
  },
});
