import { getConvexClient } from "@/lib/convex";
import {
  ChatRequestBody,
  SSE_DATA_PREFIX,
  SSE_LINE_DELIMITER,
  StreamMessage,
  StreamMessageType,
} from "@/lib/types";
import { auth } from "@clerk/nextjs/server";
import { api } from "@convex/_generated/api";
import { HumanMessage, ToolMessage } from "@langchain/core/messages";
import { AIMessage } from "node_modules/@langchain/core/dist/messages/ai";
import { NextResponse } from "next/server";
import { submitQuestion } from "@/lib/langgraph";

// Helper function to send Server-Sent Events (SSE) messages
// Encodes the message with required SSE format and writes to the stream
function sendSSEMessage(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  data: StreamMessage
) {
  const encoder = new TextEncoder();

  return writer.write(
    encoder.encode(
      `${SSE_DATA_PREFIX}${JSON.stringify(data)}${SSE_LINE_DELIMITER}`
    )
  );
}

export async function POST(req: Request) {
  try {
    // Verify user authentication using Clerk
    const { userId } = await auth();
    if (!userId) {
      return new Response("Not authenticated", { status: 401 });
    }
    const { messages, newMessage, chatId } =
      (await req.json()) as ChatRequestBody;

    const convex = getConvexClient();

    // Set up streaming with increased buffer size for better performance
    const stream = new TransformStream({}, { highWaterMark: 1024 });
    const writer = stream.writable.getWriter();

    // Configure response headers for SSE
    const response = new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Prevents Nginx buffering which would break SSE
      },
    });

    // Main streaming function that handles the chat flow
    async function startStream() {
      try {
        // Initialize the SSE connection; this is the *** first message ***  sent to the client
        await sendSSEMessage(writer, { type: StreamMessageType.Connected });

        // Store the user's message in the database
        await convex.mutation(api.messages.send, {
          chatId,
          content: newMessage,
        });

        // convert the new message to a BaseMessage
        const langchainMessages = [
          ...messages.map((msg) =>
            msg.role === "user"
              ? new HumanMessage(msg.content)
              : new AIMessage(msg.content)
          ),
          new HumanMessage(newMessage), // We append the new message to the end of the array
        ];

        // create the stream
        try {
          const eventStream = await submitQuestion(langchainMessages, chatId);
          // handle the events
          for await (const event of eventStream) {
            // console.log("Event", event);

            // New chunk of the response
            if (event.event === "on_chat_model_stream") {
              const token = event.data.chunk;

              if (token) {
                // Access the chat property  from the AIMessageChunk
                const text = token.content.at(0)?.["text"];
                if (text) {
                  await sendSSEMessage(writer, {
                    type: StreamMessageType.Token,
                    token: text,
                  });
                }
              }
            }
            // Start using a tool
            else if (event.event === "on_tool_start") {
              await sendSSEMessage(writer, {
                type: StreamMessageType.ToolStart,
                tool: event.name || "unknown",
                input: event.data.input,
              });
            }

            // Tool using is complete
            else if (event.event === "on_tool_end") {
              const toolMessage = new ToolMessage(event.data.output);

              await sendSSEMessage(writer, {
                type: StreamMessageType.ToolEnd,
                tool: toolMessage.lc_kwargs.name || "unknown", // lc_kwargs is a property of the ToolMessage class
                output: event.data.output,
              });
            }
          }
          // Send completion message without storing the response
          await sendSSEMessage(writer, {
            type: StreamMessageType.Done,
          });
        } catch (streamError) {
          console.error("Stream error", streamError);

          await sendSSEMessage(writer, {
            type: StreamMessageType.Error,
            error:
              streamError instanceof Error
                ? streamError.message
                : "Stream processing failed.",
          });
        }
      } catch (error) {
        console.error("Error in the stream", error);
        await sendSSEMessage(writer, {
          type: StreamMessageType.Error,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        try {
          await writer.close(); // so that the stream is closed even if an error occurs
        } catch (closeError) {
          console.error("Error closing the stream writer", closeError);
        }
      }
    }

    startStream();

    return response;
    // --
  } catch (error) {
    console.error("Error in chat API", error);
    return NextResponse.json(
      { error: "Failed to process chat request" } as const,
      { status: 500 }
    );
  }
}
