import React, { useState, useRef, FormEvent } from "react";
import { Card, CardHeader } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Textarea } from "@/shared/ui/textarea";
import { AlertCircle, Lock } from "lucide-react";

interface Message {
  id: number;
  content: string;
  encrypted: boolean;
}

interface ChatWidgetProps {
  onClose: () => void;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);
  const nextId = useRef(1);

  const encryptMessage = (text: string) => {
    // Placeholder encryption − real PGP would be applied server-side
    return `🔒${btoa(text)}`;
  };

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const content = encryptionEnabled ? encryptMessage(input.trim()) : input.trim();

    setMessages((prev) => [
      ...prev,
      { id: nextId.current++, content, encrypted: encryptionEnabled },
    ]);
    setInput("");
  };

  return (
    <Card className="fixed bottom-20 md:bottom-24 right-4 shadow-lg z-50 w-80 h-96 flex flex-col">
      <CardHeader className="p-4 border-b flex justify-between items-center">
        <h3 className="font-semibold text-sm flex items-center gap-1">
          <Lock className="h-4 w-4" /> Chat
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-6 w-6 p-0"
        >
          ×
        </Button>
      </CardHeader>

      {/* Encryption toggle */}
      <div className="px-4 py-2 flex items-center gap-2 border-b text-xs">
        <span>Szyfruj PGP</span>
        <Switch
          checked={encryptionEnabled}
          onCheckedChange={(val) => setEncryptionEnabled(val)}
          aria-label="Toggle encryption"
        />
        {!encryptionEnabled && (
          <div className="flex items-center gap-1 text-red-500">
            <AlertCircle className="h-3 w-3" />
            <span>Nie zaszyfrowane</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`text-xs p-2 rounded-md ${msg.encrypted ? "bg-blue-50" : "bg-gray-50"}`}
          >
            {msg.content}
          </div>
        ))}
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t space-y-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Napisz wiadomość..."
          className="text-xs resize-none h-16"
        />
        <Button size="sm" className="w-full" type="submit">
          Wyślij
        </Button>
      </form>
    </Card>
  );
}; 