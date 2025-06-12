
import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, HelpCircle, Mail } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

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
      {isChatOpen && (
        <Card 
          className={cn(
            "fixed bottom-20 shadow-lg z-50 w-80 h-96",
            "md:bottom-24",
            state === "expanded" ? "md:right-4" : "md:right-4"
          )}
        >
          <div className="h-full flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold">Chat z asystentem</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsChatOpen(false)}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="text-sm text-muted-foreground">
                Asystent AI będzie dostępny wkrótce. W międzyczasie możesz skontaktować się z nami przez email.
              </div>
            </div>
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Napisz wiadomość..."
                  className="flex-1 px-3 py-2 text-sm border rounded-md"
                  disabled
                />
                <Button size="sm" disabled>
                  Wyślij
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </>
  );
};

export default SupportFooter;
