"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@clerk/nextjs";
import { BotIcon } from "lucide-react";

// format helper
const formatMessage = (content: string): string => {
  // First unescape the string
  content = content.replace(/\\\\/g, "\\");

  //then handle newlines
  content = content.replace(/\\n/g, "\n");

  // Remove only the markers but keep the content between them
  content = content.replace(/---START---\n?|\n?---END---/g, "");

  return content.trim();
};

// *** ------------ Main component ------------ *** //
interface MessageBubbleProps {
  content: string;
  isUser?: boolean;
}

function MessageBubble({ content, isUser }: MessageBubbleProps) {
  const { user } = useUser(); // show their avatar

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`rounded-2xl px-4 py-2.5 max-w-[85%] md:max-w-[75%] shadow-sm ring-1 ring-inset relative ${
          isUser
            ? "bg-blue-600 text-white rounded-br-none ring-blue-700"
            : "bg-white text-gray-900 rounded-bl-none ring-gray-200"
        }`}
      >
        <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
          {/* show the message content but allow html */}
          <div dangerouslySetInnerHTML={{ __html: formatMessage(content) }} />
        </div>

        <div
          className={`absolute bottom-0 ${
            isUser
              ? "right-0 translate-x-1/2 translate-y-1/2"
              : "left-0 -translate-x-1/2 translate-y-1/2"
          }`}
        >
          {isUser ? (
            <Avatar className="h-7 w-7">
              <AvatarImage src={user?.imageUrl} />
              <AvatarFallback>
                {user?.firstName?.charAt(0)}
                {user?.lastName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <BotIcon className="h-5 w-5 text-white" />
          )}
        </div>
      </div>
    </div>
  );
}

export default MessageBubble;
