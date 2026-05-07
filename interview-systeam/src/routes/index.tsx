import { createFileRoute } from "@tanstack/react-router";
import heroBrain from "@/assets/hero-brain.jpg";
import connectedWorld from "@/assets/connected-world.jpg";
import iconContract from "@/assets/icon-contract.png";
import iconIp from "@/assets/icon-ip.png";
import iconSecurity from "@/assets/icon-security.png";
import { ChevronLeft, ChevronRight, Facebook, Instagram, Search, Scale, Upload, FileText, X, Loader2, Trophy, Star, Target, Activity, CheckCircle2, HelpCircle } from "lucide-react";
import { useRef, useState, useEffect, useMemo } from "react";
import { parseResume } from "@/lib/resumeParser";
import { processResumeKeywords } from "@/lib/resumeProcessorApi";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scores, setScores] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const existing = localStorage.getItem('mock_interview_scores');
      if (existing) {
        // Sort descending by date
        const parsed = JSON.parse(existing);
        setScores(parsed.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Calculate Dashboard Analytics
  const analytics = useMemo(() => {
    if (scores.length === 0) return null;
    
    let totalQuestions = 0;
    let totalAnswers = 0;
    let sumScore = 0;
    let scoreCount = 0;

    scores.forEach(s => {
      totalQuestions += (s.totalQuestions || 0);
      totalAnswers += (s.totalAnswered || 0);
      
      if (s.overallScore) {
        const num = parseFloat(s.overallScore);
        if (!isNaN(num)) {
          sumScore += num;
          scoreCount++;
        }
      }
    });

    const averageScore = scoreCount > 0 ? (sumScore / scoreCount).toFixed(1) : "0.0";
    const accuracy = totalQuestions > 0 ? Math.round((sumScore / (scoreCount * 10)) * 100) : 0;

    return {
      totalInterviews: scores.length,
      averageScore,
      totalQuestions,
      totalAnswers,
      accuracy
    };
  }, [scores]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    const allowed = [".pdf", ".doc", ".docx"];
    const ok = allowed.some((ext) => f.name.toLowerCase().endsWith(ext));
    if (!ok) {
      alert("Only PDF, DOC, or DOCX files are allowed");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      alert("File must be smaller than 5MB");
      return;
    }
    
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsProcessing(true);
    
    try {
      // 1. Client-side text extraction (to bypass edge server limits)
      const text = await parseResume(file);
      console.log("Extracted raw text from resume:", text);
      
      if (!text || text.trim() === '') {
        alert("Could not extract any text from the file. It might be an image-based PDF.");
        setIsProcessing(false);
        return;
      }
      
      // 2. Send text to backend server function for processing
      const response = await processResumeKeywords({ data: { text } });
      
      // 3. Redirect to results page with the keywords
      navigate({
        to: "/results",
        search: { keywords: response.keywords.join(",") }
      });
      
    } catch (error) {
      console.error(error);
      alert("There was an error reading your resume: " + (error instanceof Error ? error.message : String(error)));
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <header className="absolute top-0 left-0 right-0 z-20">
        <div className="mx-auto max-w-7xl px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-7 w-7 text-accent" />
            <span className="font-bold tracking-wide">
              LEGAL<span className="text-accent">MIND</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a href="#" className="hover:text-accent">Home</a>
            <a href="#servicios" className="hover:text-accent">Services</a>
            <a href="#nosotros" className="hover:text-accent">About Us</a>
          </nav>
          <button className="border border-border px-4 py-2 text-xs tracking-wider hover:border-accent hover:text-accent">
            CONTACT US
          </button>
        </div>
      </header>

      {/* HERO */}
      <section
        className="relative overflow-hidden pt-32 pb-24"
        style={{ background: "var(--hero-gradient)" }}
      >
        <div className="mx-auto max-w-7xl px-6 grid md:grid-cols-2 gap-10 items-center">
          <div className="animate-fade-up">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight">
              Your Experts in{" "}
              <span className="text-accent">Digital Law</span>
            </h1>
            <p className="mt-6 text-muted-foreground max-w-md animate-fade-up delay-200">
              We provide tailored legal solutions to protect your assets and accelerate your growth in the digital world.
            </p>
            <button className="mt-8 inline-flex items-center gap-3 bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all hover:scale-105 hover:shadow-lg hover:shadow-primary/50 animate-fade-up delay-300">
              EXPLORE SERVICES <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="relative animate-fade-in delay-200">
            <img
              src={heroBrain}
              alt="Digital head with circuits representing digital law"
              width={1024}
              height={1024}
              className="w-full max-w-md md:max-w-lg mx-auto animate-float animate-glow"
            />
          </div>
        </div>
      </section>

      {/* SCORE BOARD & ANALYTICS DASHBOARD */}
      <section id="scoreboard" className="py-24" style={{ background: "var(--hero-gradient)" }}>
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-10">
            <p className="text-xs tracking-[0.3em] text-accent">YOUR PROGRESS</p>
            <h2 className="text-4xl font-bold mt-2 flex items-center justify-center gap-3">
              <Activity className="h-10 w-10 text-accent" />
              Interview Analytics Dashboard
            </h2>
            <div className="mx-auto mt-3 h-0.5 w-16 bg-accent" />
          </div>

          {analytics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14 animate-fade-in">
              <div className="bg-card/40 border border-border/50 p-6 rounded-xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-blue-500/20 p-3 rounded-lg border border-blue-500/30">
                  <Trophy className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Interviews</p>
                  <p className="text-2xl font-black">{analytics.totalInterviews}</p>
                </div>
              </div>
              
              <div className="bg-card/40 border border-border/50 p-6 rounded-xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-purple-500/20 p-3 rounded-lg border border-purple-500/30">
                  <HelpCircle className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Questions Asked</p>
                  <p className="text-2xl font-black">{analytics.totalQuestions}</p>
                </div>
              </div>

              <div className="bg-card/40 border border-border/50 p-6 rounded-xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-green-500/20 p-3 rounded-lg border border-green-500/30">
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Answers Given</p>
                  <p className="text-2xl font-black">{analytics.totalAnswers}</p>
                </div>
              </div>

              <div className="bg-card/40 border border-border/50 p-6 rounded-xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-accent/20 p-3 rounded-lg border border-accent/30">
                  <Target className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Avg Score</p>
                  <p className="text-2xl font-black text-accent">{analytics.averageScore} <span className="text-sm font-normal text-muted-foreground">/ 10</span></p>
                </div>
              </div>
            </div>
          )}

          {scores.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scores.map((score, i) => (
                <div key={i} className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6 shadow-xl transition-all hover:-translate-y-2 hover:shadow-primary/20">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-foreground">{score.role || "Developer"}</h3>
                      <p className="text-sm text-muted-foreground">{score.candidateName || "Candidate"}</p>
                    </div>
                    <div className="bg-accent/20 border border-accent/30 text-accent font-bold px-3 py-1 rounded-full text-sm">
                      {score.overallScore}
                    </div>
                  </div>
                  <div className="space-y-3 mb-6">
                    <p className="text-sm flex items-center gap-2"><Star className="h-4 w-4 text-green-400"/> {score.hiringStatus}</p>
                    {score.totalQuestions && (
                       <p className="text-xs text-muted-foreground flex items-center gap-2"><HelpCircle className="h-3 w-3" /> Answered {score.totalAnswered} of {score.totalQuestions} questions</p>
                    )}
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-2">{score.recommendation}</p>
                  </div>
                  <div className="text-[10px] text-muted-foreground text-right border-t border-border/50 pt-3">
                    {new Date(score.date).toLocaleDateString()} at {new Date(score.date).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-card/30 rounded-2xl border border-dashed border-border/50">
              <Trophy className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-foreground mb-2">No Interviews Taken Yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Upload your resume below and take your first AI Mock Interview. Your scores and feedback will appear here!
              </p>
            </div>
          )}
        </div>
      </section>

      {/* RESUME UPLOAD */}
      <section id="resume" className="py-24" style={{ background: "var(--hero-gradient)" }}>
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-center mb-10">
            <p className="text-xs tracking-[0.3em] text-accent">CAREERS</p>
            <h2 className="text-4xl font-bold mt-2">Join Our Team</h2>
            <div className="mx-auto mt-3 h-0.5 w-16 bg-accent" />
            <p className="text-muted-foreground text-sm mt-4">
              Please upload your resume in PDF, DOC, or DOCX format (max 5MB)
            </p>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
            className={`rounded-md border-2 border-dashed p-10 text-center cursor-pointer transition-all ${dragOver ? "border-accent bg-accent/10" : "border-border hover:border-accent"}`}
            style={{ background: dragOver ? undefined : "var(--card-gradient)" }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-8 w-8 text-accent" />
                <div className="text-left">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="ml-4 h-8 w-8 rounded-full bg-card border border-border/50 flex items-center justify-center hover:text-destructive hover:border-destructive transition-colors"
                  aria-label="Remove file"
                  disabled={isProcessing}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className="h-12 w-12 text-accent animate-float" />
                <p className="font-medium">Drag your resume here or click to select</p>
                <p className="text-xs text-muted-foreground">PDF, DOC, DOCX · Max 5MB</p>
              </div>
            )}
          </div>
          
          {/* Analysis Results Section */}
          {file && isProcessing && (
            <div className="mt-8 text-center animate-fade-in">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
                <p className="text-sm">Uploading and analyzing resume on backend...</p>
              </div>
            </div>
          )}

          <div className="text-center mt-10">
            <button
              disabled={!file || isProcessing}
              onClick={handleUpload}
              className="inline-flex items-center gap-3 bg-primary px-8 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all hover:scale-105 hover:shadow-lg hover:shadow-primary/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isProcessing ? "PROCESSING..." : "SUBMIT RESUME"} <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 border-t border-border/30" style={{ background: "var(--hero-gradient)" }}>
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-8 text-sm">
          <div className="flex items-center gap-2">
            <Scale className="h-7 w-7 text-accent" />
            <span className="font-bold text-lg tracking-wide">LEGAL<span className="text-accent">MIND</span></span>
          </div>
          
          <div className="text-center flex flex-col gap-1">
            <p className="font-medium text-foreground tracking-widest text-xs mb-1">CONTACT US / FOLLOW US</p>
            <p className="text-muted-foreground">310 555 1108 <span className="text-accent mx-2">|</span> 315 003 5575</p>
          </div>

          <div className="flex items-center gap-4">
            <a href="#" className="h-10 w-10 rounded-full bg-card border border-border/50 flex items-center justify-center hover:border-accent hover:text-accent hover:scale-110 transition-all shadow-sm">
              <Facebook className="h-4 w-4" />
            </a>
            <a href="#" className="h-10 w-10 rounded-full bg-card border border-border/50 flex items-center justify-center hover:border-accent hover:text-accent hover:scale-110 transition-all shadow-sm">
              <Instagram className="h-4 w-4" />
            </a>
            <a href="#" className="h-10 w-10 rounded-full bg-card border border-border/50 flex items-center justify-center hover:border-accent hover:text-accent hover:scale-110 transition-all shadow-sm">
              <Search className="h-4 w-4" />
            </a>
          </div>
        </div>
        
        <div className="mx-auto max-w-7xl px-6 mt-10">
          <div className="pt-6 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} LEGALMIND. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-accent transition-colors">Terms and Conditions</a>
              <a href="#" className="hover:text-accent transition-colors">Privacy Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
