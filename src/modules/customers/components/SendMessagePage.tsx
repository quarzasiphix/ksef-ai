
import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";

const SendMessagePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Wypełnij wszystkie pola");
      return;
    }

    setIsLoading(true);
    try {
      // Placeholder for message sending functionality
      // This would integrate with your messaging system
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast.success("Wiadomość została wysłana");
      navigate(`/customers/${id}`);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Nie udało się wysłać wiadomości");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/customers/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Wyślij wiadomość</h1>
          <p className="text-muted-foreground">Wyślij wiadomość do klienta</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nowa wiadomość</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Temat</Label>
            <Input
              id="subject"
              placeholder="Wprowadź temat wiadomości"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Wiadomość</Label>
            <Textarea
              id="message"
              placeholder="Napisz swoją wiadomość..."
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" asChild>
              <Link to={`/customers/${id}`}>
                Anuluj
              </Link>
            </Button>
            <Button onClick={handleSendMessage} disabled={isLoading}>
              <Send className="h-4 w-4 mr-2" />
              {isLoading ? "Wysyłanie..." : "Wyślij wiadomość"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SendMessagePage;
