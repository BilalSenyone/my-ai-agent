import React from "react";

import {
  SSE_DONE_MESSAGE,
  StreamMessageType,
  SSE_DATA_PREFIX,
  StreamMessage,
} from "@/lib/types";

/**
 * Createas a parser for Server-Sent Events (SSE)
 * SSe allows the server to push ** real time ** updates to the client over HTTP
 */

export const createSSEParser = () => {
  let buffer = "";
  const parse = (chunk: string): StreamMessage[] => {
    // combine the buffer with the new chunk and split by new lines
    const lines = (buffer + chunk).split("\n");
    // save the last potentially incomplete line
    buffer = lines.pop() || "";

    return lines
      .map((line) => {
        const trimmed = line.trim();
        // ignore empty lines and lines that don't start with the prefix
        if (!trimmed || !trimmed.startsWith(SSE_DATA_PREFIX)) return null;

        // if the message is a done message, return the done message
        const data = trimmed.substring(SSE_DATA_PREFIX.length);
        if (data === SSE_DONE_MESSAGE) return { type: StreamMessageType.Done };

        try {
          const parsed = JSON.parse(data) as StreamMessage;
          return Object.values(StreamMessageType).includes(parsed.type)
            ? parsed
            : null;
        } catch (error) {
          console.error("Error parsing SSE message", error);
          return {
            type: StreamMessageType.Error,
            error: "Failed to parse SSE message",
          };
        }
      })
      .filter((msg): msg is StreamMessage => msg !== null); // filter out null values
  };

  return { parse };
};
