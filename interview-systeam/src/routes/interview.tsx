import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useEffect, useRef } from "react";
import { Send, ArrowLeft, Bot, User, BrainCircuit, Activity, Award, Loader2, Star, Mic, MicOff, Video, VideoOff, Volume2, VolumeX } from "lucide-react";

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
  const [isTyping, setIsTyping] = useState(true);
  const [score, setScore] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<string>("Beginner");
  
  // Hardware States
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMuted, setIsMuted] = useState(false); // For AI Voice
  const [isListening, setIsListening] = useState(false); // For User Mic
  
  const [isFinished, setIsFinished] = useState(false);
  const [report, setReport] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Handle Camera Stream
  useEffect(() => {
    if (isVideoOn && !isFinished) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then((stream) => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.error("Camera error:", err);
          setIsVideoOn(false);
        });
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isVideoOn, isFinished]);

  // Handle Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      
      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setInput("");
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error("Speech recognition error:", e);
      }
    }
  };

  const speakText = (text: string) => {
    if (isMuted || !window.speechSynthesis) return;
    
    window.speechSynthesis.cancel(); // stop any current speech
    
    // Clean text (remove markdown asterisks)
    const cleanText = text.replace(/\*\*/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Try to find a good English voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.includes('en') && (v.name.includes('Google') || v.name.includes('Female')));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
    
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    window.speechSynthesis.speak(utterance);
  };

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
          const aiMessage = data.nextQuestion || "Let's begin. Tell me about yourself.";
          setMessages([{ role: "model", text: aiMessage }]);
          if (data.nextDifficultyLevel) setDifficulty(data.nextDifficultyLevel);
          setIsTyping(false);
          speakText(aiMessage);
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setMessages([{ role: "model", text: "Sorry, network error." }]);
          setIsTyping(false);
        }
      }
    };

    startInterview();
    
    // Cleanup voices when leaving
    return () => { 
      mounted = false; 
      window.speechSynthesis?.cancel();
    };
  }, [skills]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const userText = input.trim();
    setInput("");
    
    const newMessages: Message[] = [...messages, { role: "user", text: userText }];
    setMessages(newMessages);
    setIsTyping(true);

    try {
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
        
        const feedbackText = `Score: ${evalData.score}. Feedback: ${evalData.strengths?.join(", ") || "Good effort"}. Next Question: ${evalData.nextQuestion}`;
        
        setMessages([...newMessages, { role: "model", text: feedbackText }]);
        speakText(feedbackText);
      } else {
        const fallback = "Could not evaluate properly. Let's move on: What is your next strongest skill?";
        setMessages([...newMessages, { role: "model", text: fallback }]);
        speakText(fallback);
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
    window.speechSynthesis?.cancel();
    
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
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
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
        console.error('Failed to save score', e);
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
              <div className="inline-flex h-20 w-20 rounded-full bg-accent/20 items-center justify-center mb-6 border border-accent/30">
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
      <header className="px-6 py-4 border-b border-border/30 bg-card/50 backdrop-blur-md flex items-center justify-between shrink-0 z-10 relative">
        <div className="flex items-center gap-4">
          <Link to="/results" search={{ keywords: skills }} className="text-muted-foreground hover:text-accent transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center border border-accent/30 shadow-[0_0_15px_rgba(var(--accent),0.5)]">
              <BrainCircuit className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h1 className="font-bold tracking-wide">Virtual AI Interviewer</h1>
              <div className="text-xs text-green-400 flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Live Session
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-muted-foreground font-medium">DIFFICULTY</div>
            <div className="text-sm font-bold text-accent">{difficulty}</div>
          </div>
          <button 
            onClick={handleEndInterview}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-md text-xs font-bold transition-all shadow-lg hover:shadow-destructive/50"
          >
            END INTERVIEW
          </button>
        </div>
      </header>

      {/* Main Split Layout */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden" style={{ background: "var(--hero-gradient)" }}>
        
        {/* Left Side: Chat History & AI Feedback */}
        <div className="w-full md:w-1/2 flex flex-col h-1/2 md:h-full border-b md:border-b-0 md:border-r border-border/30 bg-background/40 backdrop-blur-sm">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
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
                
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === "user" 
                    ? "bg-primary text-primary-foreground rounded-tr-sm" 
                    : "bg-card/80 backdrop-blur-md border border-border shadow-md rounded-tl-sm"
                }`}>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
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
                <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center border border-accent/30 shrink-0 mt-1 shadow-[0_0_10px_rgba(var(--accent),0.5)]">
                  <Bot className="h-4 w-4 text-accent animate-pulse" />
                </div>
                <div className="bg-card/80 backdrop-blur-md border border-border shadow-md rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  <span className="text-sm text-muted-foreground">AI is evaluating...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Right Side: Video Camera & Controls */}
        <div className="w-full md:w-1/2 flex flex-col h-1/2 md:h-full p-4 sm:p-6 bg-black/20">
          <div className="flex-1 relative rounded-2xl overflow-hidden bg-black/80 border border-border/50 shadow-2xl flex items-center justify-center group">
            {/* Video Element */}
            {isVideoOn ? (
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline 
                className="absolute inset-0 w-full h-full object-cover transform -scale-x-100" 
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <VideoOff className="h-16 w-16 mb-4 opacity-20" />
                <p>Camera is turned off</p>
              </div>
            )}

            {/* AI Voice Indicator overlay */}
            {isTyping && (
              <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-medium text-accent border border-accent/30 flex items-center gap-2 animate-fade-in">
                <Loader2 className="h-3 w-3 animate-spin" /> Thinking...
              </div>
            )}

            {/* Audio Wave Visualizer Simulation (When Listening) */}
            {isListening && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-background/60 backdrop-blur-md px-4 py-2 rounded-full border border-primary/50">
                <span className="h-2 w-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="h-4 w-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="h-6 w-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                <span className="h-4 w-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '450ms' }}></span>
                <span className="h-2 w-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '600ms' }}></span>
                <span className="ml-2 text-xs font-bold text-primary">Listening...</span>
              </div>
            )}

            {/* Floating Hardware Controls */}
            <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => setIsVideoOn(!isVideoOn)}
                className={`p-2 rounded-full backdrop-blur-md border ${isVideoOn ? 'bg-background/40 border-border' : 'bg-destructive/80 border-destructive'} transition-colors`}
                title={isVideoOn ? "Turn Camera Off" : "Turn Camera On"}
              >
                {isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              </button>
              <button 
                onClick={() => {
                  window.speechSynthesis.cancel();
                  setIsMuted(!isMuted);
                }}
                className={`p-2 rounded-full backdrop-blur-md border ${!isMuted ? 'bg-background/40 border-border' : 'bg-destructive/80 border-destructive'} transition-colors`}
                title={!isMuted ? "Mute AI Voice" : "Unmute AI Voice"}
              >
                {!isMuted ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Voice & Text Input Area */}
          <div className="mt-4 bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-3 shadow-lg shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleListening}
                className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                  isListening 
                    ? 'bg-red-500/20 text-red-500 border border-red-500/50 animate-pulse' 
                    : 'bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30'
                }`}
                title="Speak to Answer"
              >
                {isListening ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </button>
              
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={isListening ? "Listening... speak now" : "Type your answer or use the microphone..."}
                disabled={isTyping}
                className="flex-1 bg-background/50 border border-border/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none shadow-inner disabled:opacity-50 h-12 flex items-center"
                rows={1}
              />
              
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="h-12 w-12 bg-accent text-accent-foreground rounded-xl flex items-center justify-center shrink-0 hover:bg-accent/90 disabled:opacity-50 transition-all shadow-md"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
