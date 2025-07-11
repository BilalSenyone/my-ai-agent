import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse";

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    console.log("Uploading file");

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds the 5MB limit" },
        { status: 400 }
      );
    }

    // Check file type
    if (!["application/pdf", "text/plain"].includes(file.type)) {
      return NextResponse.json(
        { error: "Only PDF and text files are supported" },
        { status: 400 }
      );
    }

    // Read the file content based on type
    let text: string;
    if (file.type === "application/pdf") {
      text = await readPdfAsText(file);
      console.log("Text from PDF:", text);
    } else {
      text = await readFileAsText(file);
      console.log("Text from text file:", text);
    }

    // Split the text into chunks
    const chunks = splitTextIntoChunks(text, 1000, 200);

    // Create documents from chunks
    const documents = chunks.map((chunk, index) => {
      return {
        pageContent: chunk,
        metadata: {
          source: file.name,
          chunk: index,
          type: file.type,
          size: file.size,
        },
      };
    });

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Error processing document:", error);
    return NextResponse.json(
      { error: "Failed to process document" },
      { status: 500 }
    );
  }
}

/**
 * Read a PDF file as text
 * @param file The PDF file to read
 * @returns The PDF content as text
 */
async function readPdfAsText(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const pdfData = await pdfParse(buffer);
    return pdfData.text;
  } catch (error) {
    console.error("Error parsing PDF:", error);
    throw new Error("Failed to parse PDF file");
  }
}

/**
 * Read a text file as text
 * @param file The file to read
 * @returns The file content as text
 */
async function readFileAsText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const text = new TextDecoder().decode(arrayBuffer);
  return text;
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

  // Safety check to prevent issues with very large texts
  if (text.length > 10000000) {
    // 10MB text limit
    // For extremely large texts, use a simpler chunking approach
    const maxChunks = 1000; // Reasonable limit to prevent array size issues
    const safeChunkSize = Math.ceil(text.length / maxChunks);

    for (
      let j = 0;
      j < text.length && chunks.length < maxChunks;
      j += safeChunkSize
    ) {
      chunks.push(text.substring(j, Math.min(j + safeChunkSize, text.length)));
    }

    return chunks;
  }

  while (i < text.length) {
    // Calculate end position for this chunk
    const end = Math.min(i + chunkSize, text.length);

    // Add chunk to array
    chunks.push(text.substring(i, end));

    // Move to next position, accounting for overlap
    i = end - overlap;

    // Ensure we make progress and prevent infinite loops
    if (end === text.length || i >= end - 10) break;
  }

  return chunks;
}
