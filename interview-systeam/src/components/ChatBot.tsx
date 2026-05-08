import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, Loader2 } from "lucide-react";

type Message = {
  role: "user" | "model";
  parts: { text: string }[];
};

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
    // Add a greeting if opening for the first time
    if (!isOpen && messages.length === 0) {
      setMessages([
        { role: "model", parts: [{ text: "Hi! I am your AI Career Assistant. How can I help you today?" }] }
      ]);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput("");
    
    // Add user message to UI immediately
    const newMessages: Message[] = [
      ...messages,
      { role: "user", parts: [{ text: userText }] }
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userText, 
          history: messages.filter(m => m.parts[0].text !== "Hi! I am your AI Career Assistant. How can I help you today?") // Optional: filter initial static greeting if backend doesn't expect it, but backend handles it fine. Let's just send all.
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      if (data.updatedHistory) {
         // Backend returns the full history, but since we added our fake greeting, let's just append the bot's text
         setMessages([
           ...newMessages,
           { role: "model", parts: [{ text: data.text }] }
         ]);
      }
    } catch (err) {
      setMessages([
        ...newMessages,
        { role: "model", parts: [{ text: "Sorry, I am having trouble connecting right now. Please check your API key or try again later." }] }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={toggleChat}
        className={`fixed bottom-6 right-6 h-14 w-14 bg-accent text-accent-foreground rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform z-50 ${isOpen ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`}
        style={{ boxShadow: "0 0 20px rgba(var(--accent), 0.5)" }}
      >
        <MessageSquare className="h-6 w-6" />
      </button>

      {/* Chat Window */}
      <div 
        className={`fixed bottom-6 right-6 w-80 sm:w-96 h-[500px] max-h-[80vh] bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl flex flex-col z-50 transition-all duration-300 origin-bottom-right ${
          isOpen ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-accent/10 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="bg-accent/20 p-1.5 rounded-full">
              <Bot className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">AI Career Assistant</h3>
              <p className="text-[10px] text-green-400 font-medium">Online</p>
            </div>
          </div>
          <button onClick={toggleChat} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => {
            const isModel = msg.role === "model";
            return (
              <div key={idx} className={`flex ${isModel ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  isModel 
                    ? "bg-muted/50 text-foreground rounded-tl-sm border border-border/50" 
                    : "bg-accent text-accent-foreground rounded-tr-sm shadow-md"
                }`}>
                  {msg.parts[0].text}
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted/50 text-foreground rounded-2xl rounded-tl-sm px-4 py-3 border border-border/50 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
                <span className="text-xs text-muted-foreground animate-pulse">Typing...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 border-t border-border/50 bg-background/50 rounded-b-2xl">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              className="flex-1 bg-muted/50 border border-border/50 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent transition-shadow"
              disabled={isLoading}
            />
            <button 
              type="submit" 
              disabled={!input.trim() || isLoading}
              className="bg-accent text-accent-foreground h-10 w-10 rounded-full flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent/90 transition-colors"
            >
              <Send className="h-4 w-4 ml-0.5" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
