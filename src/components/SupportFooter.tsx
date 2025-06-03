import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, HelpCircle, Mail } from "lucide-react";

const SupportFooter = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
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

        {/* Chat Widget */}
        {isChatOpen && (
          <Card className="fixed bottom-20 right-4 w-80 h-96 shadow-lg">
            <div className="h-full flex flex-col">
              <div className="p-4 border-b">
                <h3 className="font-semibold">Chat z asystentem</h3>
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
      </div>
    </div>
  );
};

export default SupportFooter; 