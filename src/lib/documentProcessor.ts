import { Document } from "@langchain/core/documents";

/**
 * Process a file into document chunks
 * @param file The file to process
 * @returns An array of document chunks
 */
export async function processDocument(file: File): Promise<Document[]> {
  // Read the file content
  try {
    console.log("Processing document:", file.name);
    const text = await readFileAsText(file);

    // Split the text into chunks
    const chunks = splitTextIntoChunks(text, 1000, 200);

    // Create documents from chunks
    return chunks.map((chunk, index) => {
      return new Document({
        pageContent: chunk,
        metadata: {
          source: file.name,
          chunk: index,
          type: file.type,
          size: file.size,
        },
      });
    });
  } catch (error) {
    console.error("Error processing document:", error);
    throw error;
  }
}

/**
 * Read a file as text
 * @param file The file to read
 * @returns The file content as text
 */
async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));

    if (file.type === "application/pdf") {
      // For PDF files, we'd normally use a PDF parser
      // For simplicity in this implementation, we're treating it as text
      // In a real implementation, you'd want to use a proper PDF parser
      reader.readAsText(file);
    } else {
      reader.readAsText(file);
    }
  });
}

/**
 * Split text into chunks with overlap
 * @param text The text to split
 * @param chunkSize The size of each chunk
 * @param overlap The overlap between chunks
 * @returns An array of text chunks
 */
function splitTextIntoChunks(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): string[] {
  const chunks: string[] = [];
  let i = 0;

  while (i < text.length) {
    // Calculate end position for this chunk
    const end = Math.min(i + chunkSize, text.length);

    // Add chunk to array
    chunks.push(text.substring(i, end));

    // Move to next position, accounting for overlap
    i = end - overlap;

    // Ensure we make progress
    if (i <= 0 || i >= text.length) break;
  }

  return chunks;
}
