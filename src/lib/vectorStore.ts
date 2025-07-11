import { AzureOpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "@langchain/core/documents";

// In-memory vector store instance
let vectorStore: MemoryVectorStore | null = null;

/**
 * Initialize the vector store with OpenAI embeddings
 * @returns The initialized vector store
 */
export async function initVectorStore() {
  if (vectorStore) return vectorStore;

  const embeddings = new AzureOpenAIEmbeddings({
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY, // In Node.js defaults to process.env.AZURE_OPENAI_API_KEY
    azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME, // In Node.js defaults to process.env.AZURE_OPENAI_API_INSTANCE_NAME
    azureOpenAIApiEmbeddingsDeploymentName:
      process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME, // In Node.js defaults to process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION, // In Node.js defaults to process.env.AZURE_OPENAI_API_VERSION
    maxRetries: 1,
  });

  vectorStore = await MemoryVectorStore.fromTexts([], [], embeddings);
  return vectorStore;
}

/**
 * Add documents to the vector store
 * @param documents The documents to add
 * @param chatId The chat ID to associate with the documents
 */
export async function addDocumentsToVectorStore(
  documents: Document[],
  chatId: string
) {
  if (!vectorStore) {
    await initVectorStore();
  }

  // Add metadata to track which chat these documents belong to
  const docsWithMetadata = documents.map((doc) => {
    return new Document({
      pageContent: doc.pageContent,
      metadata: {
        ...doc.metadata,
        chatId,
      },
    });
  });

  await vectorStore!.addDocuments(docsWithMetadata);
  return docsWithMetadata.length;
}

/**
 * Query the vector store for similar documents
 * @param query The query text
 * @param chatId The chat ID to filter by
 * @param k The number of results to return
 * @returns The similar documents
 */
export async function queryVectorStore(
  query: string,
  chatId: string,
  k: number = 5
) {
  if (!vectorStore) {
    await initVectorStore();
  }

  // Search for relevant documents, filtering by chatId
  const filter = (doc: Document) => doc.metadata.chatId === chatId;
  const results = await vectorStore!.similaritySearch(query, k, filter);
  return results;
}

/**
 * Get all documents for a chat
 * @param chatId The chat ID
 * @returns All documents for the chat
 */
export async function getDocumentsForChat(chatId: string) {
  if (!vectorStore) {
    await initVectorStore();
  }

  // This is a simplified approach - in a real implementation, you'd want a more efficient way to retrieve documents by chatId
  const filter = (doc: Document) => doc.metadata.chatId === chatId;
  const allDocs = await vectorStore!.similaritySearch("", 1000, filter);
  return allDocs;
}

/**
 * Clear all documents for a chat
 * @param chatId The chat ID
 */
export async function clearDocumentsForChat(chatId: string) {
  // In a real implementation, you'd want a more efficient way to delete documents by chatId
  // For this in-memory implementation, we'll recreate the vector store without the specified chat's documents
  if (!vectorStore) return;

  const allDocs = await vectorStore.similaritySearch("", 1000);
  const otherDocs = allDocs.filter((doc) => doc.metadata.chatId !== chatId);

  const embeddings = new AzureOpenAIEmbeddings({
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY, // In Node.js defaults to process.env.AZURE_OPENAI_API_KEY
    azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME, // In Node.js defaults to process.env.AZURE_OPENAI_API_INSTANCE_NAME
    azureOpenAIApiEmbeddingsDeploymentName:
      process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME, // In Node.js defaults to process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION, // In Node.js defaults to process.env.AZURE_OPENAI_API_VERSION
    maxRetries: 1,
  });

  vectorStore = await MemoryVectorStore.fromDocuments(otherDocs, embeddings);
}
