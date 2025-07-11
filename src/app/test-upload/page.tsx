"use client";

import { useState } from "react";
import { Document } from "@langchain/core/documents";
import { FileUpload } from "@/components/FileUpload";

export default function TestUploadPage() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);

  const handleDocumentsProcessed = (docs: Document[]) => {
    setDocuments(docs);
    console.log("Documents processed:", docs);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Test File Upload</h1>

      <button
        onClick={() => setIsUploadOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Upload Document
      </button>

      <FileUpload
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onDocumentsProcessed={handleDocumentsProcessed}
      />

      {documents.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">Processed Documents</h2>
          <div className="border rounded-md p-4 bg-gray-50">
            <p>Total chunks: {documents.length}</p>
            <div className="mt-4 space-y-4">
              {documents.slice(0, 3).map((doc, index) => (
                <div key={index} className="border p-3 rounded bg-white">
                  <p className="font-medium">Chunk {index + 1}</p>
                  <p className="text-sm text-gray-700 mt-1 line-clamp-3">
                    {doc.pageContent.substring(0, 200)}
                    {doc.pageContent.length > 200 ? "..." : ""}
                  </p>
                  <div className="mt-2 text-xs text-gray-500">
                    <p>Source: {doc.metadata.source}</p>
                    <p>Type: {doc.metadata.type}</p>
                  </div>
                </div>
              ))}
              {documents.length > 3 && (
                <p className="text-sm text-gray-500">
                  ...and {documents.length - 3} more chunks
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
