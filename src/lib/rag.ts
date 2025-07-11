import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { Document } from "@langchain/core/documents";
import { queryVectorStore } from "./vectorStore";

/**
 * Enhance messages with context from RAG
 * @param messages The original messages
 * @param query The query to search for context
 * @param chatId The chat ID
 * @returns Enhanced messages with RAG context
 */
export async function enhanceMessagesWithRAG(
  messages: BaseMessage[],
  query: string,
  chatId: string
): Promise<BaseMessage[]> {
  try {
    // Query the vector store for relevant documents
    const documents = await queryVectorStore(query, chatId, 3);

    if (!documents || documents.length === 0) {
      console.log("No relevant documents found for RAG");
      return messages;
    }

    console.log(`Found ${documents.length} relevant documents for RAG`);

    // Create context from documents
    const context = formatDocumentsAsContext(documents);

    // Find the system message if it exists
    const systemMessageIndex = messages.findIndex(
      (msg) => msg._getType() === "system"
    );

    if (systemMessageIndex >= 0) {
      // Update existing system message with context
      const originalSystemMessage = messages[systemMessageIndex];
      const enhancedSystemContent = `${originalSystemMessage.content}\n\n${context}`;

      const newMessages = [...messages];
      newMessages[systemMessageIndex] = new SystemMessage(
        enhancedSystemContent
      );

      return newMessages;
    } else {
      // Create a new system message with context
      const systemMessage = new SystemMessage(
        `You are a helpful AI assistant. Use the following information to help answer the user's question:\n\n${context}`
      );

      return [systemMessage, ...messages];
    }
  } catch (error) {
    console.error("Error enhancing messages with RAG:", error);
    return messages;
  }
}

/**
 * Format documents as a context string
 * @param documents The documents to format
 * @returns A formatted context string
 */
function formatDocumentsAsContext(documents: Document[]): string {
  const formattedDocs = documents.map((doc, i) => {
    return `DOCUMENT ${i + 1}:\n${doc.pageContent}\n\nSOURCE: ${doc.metadata.source || "Unknown"}\n`;
  });

  return `RELEVANT CONTEXT:\n\n${formattedDocs.join("\n")}\n\nUse the above information to help answer the user's question. If the information doesn't contain the answer, just say you don't know rather than making up an answer.`;
}
