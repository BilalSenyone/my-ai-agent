"use client";

import { Doc, Id } from "@convex/_generated/dataModel";
import React, { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import { ChatRequestBody, StreamMessageType } from "@/lib/types";
import { createSSEParser } from "@/lib/createSSEParser";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convex";
import { tool } from "@langchain/core/tools";
import MessageBubble from "./MessageBubble";
import WelcomeMessage from "./WelcomeMessage";

interface ChatInterfaceProps {
  chatId: Id<"chats">;
  initialMessages: Doc<"messages">[];
}

function ChatInterface({ chatId, initialMessages }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Doc<"messages">[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamedResponse, setStreamedResponse] = useState("");
  const [currentTool, setCurrentTool] = useState<{
    name: string;
    input: unknown;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null); // Ref to scroll to bottom

  // Helper for formatting tool output // styling the output
  const formatToolOutput = (output: unknown): string => {
    if (typeof output === "string") return output;
    return JSON.stringify(output, null, 2);
  };

  // helper for formatting terminal output
  const formatTerminalOutput = (
    tool: string,
    input: unknown,
    output: unknown
  ) => {
    const terminalHtml = `<div class="bg-[#1e1e1e] text-white font-mono p-2 rounded-md my-2 overflow-x-auto whitespace-normal max-w-[600px]">
  <div class="flex items-center gap-1.5 border-b border-gray-700 pb-1">
    <span class="text-red-500">●</span>
    <span class="text-yellow-500">●</span>
    <span class="text-green-500">●</span>
    <span class="text-gray-400 ml-1 text-sm">~/${tool}</span>
  </div>
  <div class="text-gray-400 mt-1">$ Input</div>
  <pre class="text-yellow-400 mt-0.5 whitespace-pre-wrap overflow-x-auto">${formatToolOutput(input)}</pre>
  <div class="text-gray-400 mt-2">$ Output</div>
  <pre class="text-green-400 mt-0.5 whitespace-pre-wrap overflow-x-auto">${formatToolOutput(output)}</pre>
</div>`;

    return `---START---\n${terminalHtml}\n---END---`;
  };

  // helper for processing the stream
  const processStream = async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onChunk: (chunk: string) => Promise<void>
  ) => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await onChunk(new TextDecoder().decode(value));
      }
    } catch (error) {
      console.error("Error processing stream", error);
    } finally {
      reader.releaseLock();
    }
  };

  useEffect(() => {
    // Scroll to the bottom of the messages list when new messages are added
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamedResponse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    // Reset UI state for new message
    setInput("");
    setStreamedResponse("");
    setCurrentTool(null);
    setIsLoading(true);

    // Prepare an optimistic UI update
    const optimisticUserMessage: Doc<"messages"> = {
      _id: `temp_${Date.now()}`,
      chatId,
      content: trimmedInput,
      role: "user",
      createdAt: Date.now(),
    } as Doc<"messages">;

    setMessages((prev) => [...prev, optimisticUserMessage]);

    // Track complete response for saving to db
    let fullResponse = "";

    // Start streaming  response...
    try {
      const requestBody: ChatRequestBody = {
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        newMessage: trimmedInput,
        chatId,
      };

      // Initialize SSE connection
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error(await response.text());
      if (!response.body) throw new Error("No response body available");

      // ------- Handle the stream --------
      // Create a SSE parser
      const parser = createSSEParser();
      const reader = response.body.getReader();

      // Process the stream chunks
      await processStream(reader, async (chunk) => {
        const messages = parser.parse(chunk);
        for (const message of messages) {
          switch (message.type) {
            case StreamMessageType.Token:
              // Handle token in response (normal text)
              if ("token" in message) {
                fullResponse += message.token;
                setStreamedResponse(fullResponse);
              }
              break;

            // Handle tool start
            case StreamMessageType.ToolStart:
              if ("tool" in message) {
                setCurrentTool({
                  name: message.tool,
                  input: message.input,
                });
                fullResponse += formatTerminalOutput(
                  message.tool,
                  message.input,
                  "Processing..."
                );
                setStreamedResponse(fullResponse);
              }
              break;

            case StreamMessageType.ToolEnd:
              if ("tool" in message && currentTool) {
                // replace the processing text with the tool output
                const lastTerminalIndex = fullResponse.lastIndexOf(
                  '<div class="bg-[#1e1e1e]'
                );
                if (lastTerminalIndex !== -1) {
                  fullResponse =
                    fullResponse.substring(0, lastTerminalIndex) +
                    formatTerminalOutput(
                      message.tool,
                      currentTool.input,
                      message.output
                    );
                  setStreamedResponse(fullResponse);
                }
              }
              break;

            case StreamMessageType.Error:
              // handle error message in the stream itself
              if ("error" in message && typeof message.error === "string") {
                throw new Error(message.error);
              }
              break;

            case StreamMessageType.Done:
              // Handle completion of the message
              const assistantMessage: Doc<"messages"> = {
                _id: `temp_assistant_${Date.now()}`,
                chatId,
                content: fullResponse,
                role: "assistant",
                createdAt: Date.now(),
              } as Doc<"messages">;

              // save the complete message to the db
              const convex = getConvexClient();
              console.log("DEBUG >>> storting now... : ", fullResponse);
              await convex.mutation(api.messages.store, {
                chatId,
                content: fullResponse,
                role: "assistant",
              });
              setMessages((prev) => [...prev, assistantMessage]); // Add latest message to UI
              setStreamedResponse("");
              return;
          }
        }
      });
      // ---
    } catch (error) {
      // Handle any errors during streaming
      console.error("Error sending message :", error);
      // Remove the optimistic message from the UI
      setMessages((prev) =>
        prev.filter((msg) => msg._id !== optimisticUserMessage._id)
      );
      setStreamedResponse(
        formatTerminalOutput(
          "error",
          "Failed to process message",
          error instanceof Error ? error.message : String(error)
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // *** ----------- Return Part ------------ ***//

  return (
    <main className="flex flex-col h-[calc(100vh-theme(spacing.14))] ">
      <section className="flex-1 overflow-y-auto bg-gray-50 mt-2 md:p-0">
        {/* Messages */}
        <div className="max-w-4xl mx-auto p-4 space-y-3">
          {messages?.length === 0 && <WelcomeMessage />}

          {messages.map((message: Doc<"messages">) => (
            <MessageBubble
              key={message._id}
              content={message.content}
              isUser={message.role === "user"}
            />
          ))}

          {streamedResponse && <MessageBubble content={streamedResponse} />}

          {isLoading && !streamedResponse && (
            <div className="flex justify-start animate-in fade-in-0">
              <div className="rounded-2xl px-4 py-3 bg-white text-gray-900 rounded-bl-none shadow-sm ring-1 ring-inset ring-gray-200">
                <div className="flex items-center gap-1.5">
                  {[0.3, 0.15, 0].map((delay, index) => (
                    <div
                      key={index}
                      className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: `-${delay}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          {/* Last Message to scroll down to*/}
          <div ref={messagesEndRef} />
        </div>
      </section>
      <footer className="bordert-t border-gray-200 py-4 px-6">
        <form
          onSubmit={handleSubmit}
          className="max-w-4xl mz-auto mx-auto relative"
        >
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message AI Agent..."
              className="flex-1 py-3 px-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12 bg-gray-50 placeholder:text-gray-500"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className={`absolute right-1.5 rounded-xl h-9 w-9 p-0 flex transition-all ${
                input.trim()
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              <ArrowRightIcon />
            </Button>
          </div>
        </form>
      </footer>
    </main>
  );
}

export default ChatInterface;
