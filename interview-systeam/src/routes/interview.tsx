import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useEffect, useRef } from "react";
import { Send, ArrowLeft, Bot, User, BrainCircuit, Activity, Award, Loader2, Star } from "lucide-react";

const searchSchema = z.object({
  skills: z.string().optional(),
});

export const Route = createFileRoute("/interview")({
  component: InterviewPage,
  validateSearch: searchSchema,
});

type Message = {
  role: "model" | "user";
  text: string;
};

function InterviewPage() {
  const { skills } = Route.useSearch();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(true); // AI starts by typing the first question
  const [score, setScore] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<string>("Beginner");
  
  // Final report state
  const [isFinished, setIsFinished] = useState(false);
  const [report, setReport] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Start the interview
  useEffect(() => {
    let mounted = true;
    
    const startInterview = async () => {
      try {
        const resumeText = skills 
          ? `My skills are: ${skills}`
          : "I have general software development skills.";
          
        const res = await fetch("http://localhost:5000/api/interview/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeText }),
        });
        
        const data = await res.json();
        
        if (mounted) {
          setMessages([{ role: "model", text: data.nextQuestion || "Let's begin. Tell me about yourself." }]);
          if (data.nextDifficultyLevel) setDifficulty(data.nextDifficultyLevel);
          setIsTyping(false);
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setMessages([{ role: "model", text: "Sorry, I am having trouble connecting to the backend server. Please make sure it is running on port 5000." }]);
          setIsTyping(false);
        }
      }
    };

    startInterview();
    return () => { mounted = false; };
  }, [skills]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userText = input.trim();
    setInput("");
    
    const newMessages: Message[] = [...messages, { role: "user", text: userText }];
    setMessages(newMessages);
    setIsTyping(true);

    try {
      // Map frontend messages to Google GenAI required format
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const res = await fetch("http://localhost:5000/api/interview/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: userText, conversationHistory: history }),
      });
      
      const data = await res.json();
      
      if (data.evaluation) {
        const evalData = data.evaluation;
        if (evalData.score) setScore(evalData.score);
        if (evalData.nextDifficultyLevel) setDifficulty(evalData.nextDifficultyLevel);
        
        // Add the AI's feedback + next question to the chat
        const feedbackText = `**Score:** ${evalData.score}\n\n**Feedback:** ${evalData.strengths?.join(", ") || "Good effort."}\n\n**Next Question:** ${evalData.nextQuestion}`;
        
        setMessages([...newMessages, { role: "model", text: feedbackText }]);
      } else {
        setMessages([...newMessages, { role: "model", text: "Could not evaluate properly. Let's move on: What is your next strongest skill?" }]);
      }
    } catch (err) {
      console.error(err);
      setMessages([...newMessages, { role: "model", text: "Network error. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleEndInterview = async () => {
    setIsTyping(true);
    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const res = await fetch("http://localhost:5000/api/interview/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationHistory: history }),
      });
      
      const data = await res.json();
      setReport(data);
      setIsFinished(true);
      
      // Save to localStorage
      try {
        const existing = localStorage.getItem('mock_interview_scores');
        const scores = existing ? JSON.parse(existing) : [];
        const newScore = {
          ...data,
          date: new Date().toISOString(),
          totalQuestions: messages.filter(m => m.role === 'model').length,
          totalAnswered: messages.filter(m => m.role === 'user').length
        };
        scores.push(newScore);
        localStorage.setItem('mock_interview_scores', JSON.stringify(scores));
      } catch (e) {
        console.error('Failed to save score to localStorage', e);
      }
      
    } catch (err) {
      console.error(err);
      alert("Failed to generate report.");
    } finally {
      setIsTyping(false);
    }
  };

  if (isFinished && report) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col p-6" style={{ background: "var(--hero-gradient)" }}>
        <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col items-center justify-center animate-fade-in">
          <div className="bg-card/80 backdrop-blur-md border border-border/50 rounded-2xl p-10 shadow-2xl w-full">
            <div className="text-center mb-10">
              <div className="inline-flex h-20 w-20 rounded-full bg-accent/20 items-center justify-center mb-6 border border-accent/30 shadow-[0_0_30px_rgba(var(--accent),0.3)]">
                <Award className="h-10 w-10 text-accent" />
              </div>
              <h1 className="text-4xl font-bold text-foreground">Interview Final Report</h1>
              <p className="text-accent text-xl mt-2 font-medium">Status: {report.hiringStatus}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-background/50 p-6 rounded-xl border border-border">
                <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><Activity className="h-5 w-5 text-accent"/> Overview</h3>
                <p className="text-muted-foreground mb-2"><strong>Candidate:</strong> {report.candidateName || "Anonymous"}</p>
                <p className="text-muted-foreground mb-2"><strong>Role:</strong> {report.role || "Developer"}</p>
                <p className="text-muted-foreground text-xl mt-4"><strong>Overall Score:</strong> <span className="text-accent">{report.overallScore}</span></p>
              </div>

              <div className="bg-background/50 p-6 rounded-xl border border-border">
                <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><Star className="h-5 w-5 text-accent"/> Strengths & Weaknesses</h3>
                <div className="mb-4">
                  <p className="font-medium text-green-400 mb-1">Strong Areas:</p>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground">
                    {report.strongAreas?.map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-red-400 mb-1">Areas to Improve:</p>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground">
                    {report.weakAreas?.map((w: string, i: number) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-8 bg-accent/10 border border-accent/20 p-6 rounded-xl">
              <h3 className="font-bold mb-2">Final Recommendation</h3>
              <p className="text-sm text-foreground/90 leading-relaxed">{report.recommendation}</p>
            </div>

            <div className="mt-10 text-center">
              <Link to="/" className="bg-primary px-8 py-3 rounded-md text-primary-foreground font-medium hover:bg-primary/90 transition-all">
                RETURN HOME
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border/30 bg-card/50 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/results" search={{ keywords: skills }} className="text-muted-foreground hover:text-accent transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center border border-accent/30">
              <BrainCircuit className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h1 className="font-bold tracking-wide">AI Interviewer</h1>
              <div className="text-xs text-green-400 flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Online
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-muted-foreground font-medium">DIFFICULTY</div>
            <div className="text-sm font-bold text-accent">{difficulty}</div>
          </div>
          {score && (
            <div className="text-right">
              <div className="text-xs text-muted-foreground font-medium">LATEST SCORE</div>
              <div className="text-sm font-bold text-accent">{score}</div>
            </div>
          )}
          <button 
            onClick={handleEndInterview}
            className="border border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground px-4 py-2 rounded-md text-xs font-bold transition-colors"
          >
            END INTERVIEW
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6" style={{ background: "var(--hero-gradient)" }}>
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 && !isTyping && (
            <div className="text-center text-muted-foreground py-10">
              Failed to initialize interview. Check backend server.
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-up`}>
              {msg.role === "model" && (
                <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center border border-accent/30 shrink-0 mt-1">
                  <Bot className="h-4 w-4 text-accent" />
                </div>
              )}
              
              <div className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                msg.role === "user" 
                  ? "bg-primary text-primary-foreground rounded-tr-sm" 
                  : "bg-card border border-border shadow-md rounded-tl-sm"
              }`}>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {/* Basic markdown rendering for the AI response */}
                  {msg.text.split('\n').map((line, i) => (
                    <span key={i}>
                      {line.replace(/\*\*(.*?)\*\*/g, '$1')} 
                      {i !== msg.text.split('\n').length - 1 && <br/>}
                    </span>
                  ))}
                </div>
              </div>

              {msg.role === "user" && (
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center border border-border shrink-0 mt-1">
                  <User className="h-4 w-4 text-foreground" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-4 justify-start animate-fade-in">
              <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center border border-accent/30 shrink-0 mt-1">
                <Bot className="h-4 w-4 text-accent" />
              </div>
              <div className="bg-card border border-border shadow-md rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
                <span className="text-sm text-muted-foreground">AI is typing...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="p-4 bg-background border-t border-border/50 shrink-0">
        <div className="max-w-3xl mx-auto relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your answer here... (Press Enter to send)"
            disabled={isTyping}
            className="w-full bg-card border border-border rounded-xl pl-5 pr-14 py-4 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none shadow-sm disabled:opacity-50"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 bg-accent text-accent-foreground rounded-lg flex items-center justify-center hover:bg-accent/90 disabled:opacity-50 transition-all"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="max-w-3xl mx-auto text-center mt-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            Mock Interview powered by Advanced AI
          </p>
        </div>
      </footer>
    </div>
  );
}
