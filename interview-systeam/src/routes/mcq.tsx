import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Target, CheckCircle2, XCircle, ChevronRight, Award } from "lucide-react";

const searchSchema = z.object({
  skills: z.string().optional(),
});

export const Route = createFileRoute("/mcq")({
  component: McqPage,
  validateSearch: searchSchema,
});

type Question = {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
};

function McqPage() {
  const { skills } = Route.useSearch();
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    const fetchQuestions = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/interview/mcq-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skills: skills || "General Software Engineering" }),
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || "Failed to generate questions");
        }
        
        if (mounted) {
          setQuestions(data);
          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || "Failed to connect to the AI service.");
          setLoading(false);
        }
      }
    };

    fetchQuestions();
    return () => { mounted = false; };
  }, [skills]);

  const handleSelect = (optionIndex: number) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentIndex]: optionIndex
    });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsFinished(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6" style={{ background: "var(--hero-gradient)" }}>
        <Loader2 className="h-12 w-12 text-accent animate-spin mb-4" />
        <h2 className="text-2xl font-bold">Generating your personalized test...</h2>
        <p className="text-muted-foreground mt-2">Analyzing your skills and crafting multiple-choice questions.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center" style={{ background: "var(--hero-gradient)" }}>
        <XCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold">Error Generating Quiz</h2>
        <p className="text-muted-foreground mt-2">{error}</p>
        <Link to="/results" search={{ keywords: skills }} className="mt-6 text-accent hover:underline">Go Back</Link>
      </div>
    );
  }

  if (isFinished) {
    // Calculate Score
    const correctCount = questions.reduce((count, q, idx) => {
      return count + (selectedAnswers[idx] === q.correctAnswerIndex ? 1 : 0);
    }, 0);

    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col p-6 overflow-y-auto" style={{ background: "var(--hero-gradient)" }}>
        <div className="max-w-3xl mx-auto w-full pt-10 pb-20">
          <div className="text-center mb-12 animate-fade-up">
            <div className="inline-flex h-20 w-20 rounded-full bg-accent/20 items-center justify-center mb-6 border border-accent/30 shadow-[0_0_30px_rgba(var(--accent),0.3)]">
              <Award className="h-10 w-10 text-accent" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Quiz Completed!</h1>
            <p className="text-xl">
              You scored <span className="font-bold text-accent">{correctCount}</span> out of {questions.length}
            </p>
          </div>

          <div className="space-y-8">
            {questions.map((q, qIdx) => {
              const userAnswer = selectedAnswers[qIdx];
              const isCorrect = userAnswer === q.correctAnswerIndex;
              const skipped = userAnswer === undefined;

              return (
                <div key={qIdx} className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl p-6 shadow-xl">
                  <div className="flex gap-3 mb-4">
                    <span className="font-bold text-muted-foreground">Q{qIdx + 1}.</span>
                    <h3 className="font-medium text-lg leading-relaxed">{q.question}</h3>
                  </div>
                  
                  <div className="space-y-3 pl-8">
                    {q.options.map((opt, oIdx) => {
                      const isUserChoice = userAnswer === oIdx;
                      const isRightChoice = q.correctAnswerIndex === oIdx;
                      
                      let bgClass = "bg-background/50 border-border";
                      let icon = null;

                      if (isRightChoice) {
                        bgClass = "bg-green-500/20 border-green-500/50";
                        icon = <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />;
                      } else if (isUserChoice && !isRightChoice) {
                        bgClass = "bg-destructive/20 border-destructive/50";
                        icon = <XCircle className="h-5 w-5 text-destructive shrink-0" />;
                      }

                      return (
                        <div key={oIdx} className={`p-4 rounded-lg border ${bgClass} flex items-center justify-between`}>
                          <span className={isRightChoice ? "text-green-50" : (isUserChoice ? "text-red-50" : "text-muted-foreground")}>
                            {opt}
                          </span>
                          {icon}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 pl-8">
                    <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 text-sm">
                      <span className="font-bold text-accent">Explanation:</span> <span className="text-foreground/80">{q.explanation}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <Link 
              to="/results" 
              search={{ keywords: skills }}
              className="inline-flex items-center gap-2 bg-primary px-8 py-3 rounded-md font-medium text-primary-foreground hover:bg-primary/90"
            >
              <ArrowLeft className="h-4 w-4" /> BACK TO RESULTS
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const question = questions[currentIndex];
  const hasAnsweredCurrent = selectedAnswers[currentIndex] !== undefined;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-6" style={{ background: "var(--hero-gradient)" }}>
      {/* Header */}
      <header className="max-w-3xl mx-auto w-full flex items-center justify-between mb-10">
        <Link to="/results" search={{ keywords: skills }} className="text-muted-foreground hover:text-accent flex items-center gap-2">
          <ArrowLeft className="h-5 w-5" /> Exit Quiz
        </Link>
        <div className="flex items-center gap-2 text-sm font-medium">
          <Target className="h-5 w-5 text-accent" /> Question {currentIndex + 1} of {questions.length}
        </div>
      </header>

      {/* Main Quiz Area */}
      <main className="max-w-3xl mx-auto w-full flex-1 flex flex-col">
        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-1.5 mb-10 overflow-hidden">
          <div 
            className="bg-accent h-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>

        <div className="bg-card/80 backdrop-blur-sm border border-border/50 shadow-2xl rounded-2xl p-8 md:p-12 animate-fade-in">
          <h2 className="text-2xl md:text-3xl font-medium leading-relaxed mb-10">
            {question.question}
          </h2>

          <div className="space-y-4">
            {question.options.map((opt, idx) => {
              const isSelected = selectedAnswers[currentIndex] === idx;
              
              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
                    isSelected 
                      ? "border-accent bg-accent/10" 
                      : "border-border/50 bg-background/50 hover:border-accent/50 hover:bg-accent/5"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-6 w-6 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? "border-accent bg-accent text-accent-foreground" : "border-muted-foreground text-transparent"
                    }`}>
                      {isSelected && <div className="h-2 w-2 rounded-full bg-current" />}
                    </div>
                    <span className={`text-lg ${isSelected ? "font-medium" : ""}`}>{opt}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-12 flex justify-end">
            <button
              onClick={handleNext}
              disabled={!hasAnsweredCurrent}
              className="flex items-center gap-2 bg-accent text-accent-foreground px-8 py-3 rounded-lg font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {currentIndex === questions.length - 1 ? "FINISH TEST" : "NEXT QUESTION"}
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
