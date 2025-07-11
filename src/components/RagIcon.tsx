"use client";

import { useState } from "react";
import { FileUpload } from "./FileUpload";
import { Document } from "@langchain/core/documents";
import { ClipboardIcon } from "@radix-ui/react-icons";

interface RagIconProps {
  onDocumentsProcessed: (documents: Document[]) => void;
  documentsCount?: number;
}

export function RagIcon({
  onDocumentsProcessed,
  documentsCount = 0,
}: RagIconProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <>
      <button
        onClick={openModal}
        className="relative flex items-center justify-center h-9 w-9 rounded-xl text-gray-500 hover:text-blue-600 hover:bg-gray-100 transition-colors"
        aria-label="Upload document for context"
        title="Upload document for context"
      >
        <ClipboardIcon className="h-5 w-5" />
        {documentsCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
            {documentsCount}
          </span>
        )}
      </button>

      <FileUpload
        isOpen={isModalOpen}
        onClose={closeModal}
        onDocumentsProcessed={onDocumentsProcessed}
      />
    </>
  );
}
