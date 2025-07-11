"use client";

import { useState } from "react";
import { Document } from "@langchain/core/documents";
import { FileIcon, UploadIcon, Cross2Icon } from "@radix-ui/react-icons";

interface FileUploadProps {
  onDocumentsProcessed: (documents: Document[]) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function FileUpload({
  onDocumentsProcessed,
  onClose,
  isOpen,
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setFileName(file.name);
    setIsUploading(true);
    setError(null);
    setProgress(10);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev + Math.random() * 10;
          return newProgress < 90 ? newProgress : prev;
        });
      }, 300);

      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append("file", file);

      console.log("Sending POST request to /api/upload");

      // Send the file to the API
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload file");
      }

      const data = await response.json();
      console.log("Response data:", data);

      // Convert the returned data to Document objects
      const documents = data.documents.map((doc: any) => {
        return new Document({
          pageContent: doc.pageContent,
          metadata: doc.metadata,
        });
      });

      clearInterval(progressInterval);
      setProgress(100);

      // Notify parent component
      onDocumentsProcessed(documents);

      // Reset after a short delay
      setTimeout(() => {
        setIsUploading(false);
        setProgress(0);
        onClose();
      }, 1000);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Failed to process file");
      setIsUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="file-upload-modal fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Upload Document</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close upload dialog"
          >
            <Cross2Icon />
          </button>
        </div>

        {!isUploading && !fileName ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              Upload PDF or text files to enhance your chat with relevant
              context
            </p>
            <label className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer">
              <span>Select File</span>
              <input
                type="file"
                accept=".pdf,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            {fileName && (
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
                <FileIcon className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium truncate flex-1">
                  {fileName}
                </span>
                {/* Add a button to remove the file */}
                <button
                  title="Remove file"
                  onClick={() => {
                    setFileName(null);
                  }}
                >
                  <Cross2Icon />
                </button>
              </div>
            )}

            {isUploading && (
              <div className="space-y-2">
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600">
                  {progress < 100
                    ? "Processing document..."
                    : "Document processed!"}
                </p>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
            disabled={isUploading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
