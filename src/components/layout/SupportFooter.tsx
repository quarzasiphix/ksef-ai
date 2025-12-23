import React, { useState } from 'react';
import { Button } from "@/shared/ui/button";
import { MessageCircle, HelpCircle, Mail } from "lucide-react";
import { useSidebar } from "@/shared/ui/sidebar";
import { cn } from "@/shared/lib/utils";
import { ChatWidget } from "@/components/chat/ChatWidget";

const SupportFooter = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { state } = useSidebar();

  return (
    <>
      {/* Desktop Footer */}
      <div 
        className={cn(
          "hidden md:block fixed bottom-0 right-0 bg-background border-t z-40 transition-all duration-300",
          state === "expanded" ? "left-64" : "left-32"
        )}
      >
        <div className="px-4 py-4">
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                <span>Pomoc</span>
              </Button>
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>Kontakt</span>
              </Button>
            </div>
            
            <Button 
              variant="default" 
              size="sm"
              className="flex items-center gap-2 bg-primary hover:bg-primary/90"
              onClick={() => setIsChatOpen(!isChatOpen)}
            >
              <MessageCircle className="h-4 w-4" />
              <span>Chat z asystentem</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Footer */}
      <div className="md:hidden fixed bottom-16 left-0 right-0 bg-background border-t z-40">
        <div className="px-4 py-3">
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="flex items-center gap-2 text-xs">
                <HelpCircle className="h-4 w-4" />
                <span>Pomoc</span>
              </Button>
              <Button variant="ghost" size="sm" className="flex items-center gap-2 text-xs">
                <Mail className="h-4 w-4" />
                <span>Kontakt</span>
              </Button>
            </div>
            
            <Button 
              variant="default" 
              size="sm"
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-xs px-3"
              onClick={() => setIsChatOpen(!isChatOpen)}
            >
              <MessageCircle className="h-4 w-4" />
              <span>Chat</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Widget */}
      {isChatOpen && <ChatWidget onClose={() => setIsChatOpen(false)} />}
    </>
  );
};

export default SupportFooter;
