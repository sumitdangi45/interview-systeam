import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { CheckCircle, ArrowLeft, Scale, Star } from "lucide-react";

// Define the expected search parameters for this route (to read keywords from URL)
const searchSchema = z.object({
  keywords: z.string().optional(),
});

export const Route = createFileRoute("/results")({
  component: ResultsPage,
  validateSearch: searchSchema,
});

function ResultsPage() {
  const { keywords: keywordsStr } = Route.useSearch();
  const keywords = keywordsStr ? keywordsStr.split(",") : [];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" style={{ background: "var(--hero-gradient)" }}>
      {/* Simple Header */}
      <header className="px-6 py-5 border-b border-border/30">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Scale className="h-7 w-7 text-accent" />
            <span className="font-bold tracking-wide">
              LEGAL<span className="text-accent">MIND</span>
            </span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-accent flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center py-20 px-6">
        <div className="max-w-3xl w-full">
          <div className="text-center mb-12 animate-fade-up">
            <div className="inline-flex h-20 w-20 rounded-full bg-accent/20 items-center justify-center mb-6 border border-accent/30 shadow-[0_0_30px_rgba(var(--accent),0.3)]">
              <CheckCircle className="h-10 w-10 text-accent" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Resume Analyzed Successfully</h1>
            <p className="text-muted-foreground text-lg">
              Our backend system has successfully processed your resume and extracted your core professional skills.
            </p>
          </div>

          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-8 md:p-12 shadow-2xl animate-fade-in delay-200">
            <div className="flex items-center gap-3 mb-8 pb-6 border-b border-border/50">
              <Star className="h-6 w-6 text-accent" />
              <h2 className="text-2xl font-semibold">Your Extracted Keywords</h2>
            </div>

            {keywords.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {keywords.map((kw, i) => (
                  <span 
                    key={i} 
                    className="px-4 py-2 bg-accent/10 border border-accent/30 text-accent text-sm rounded-full font-medium shadow-sm hover:scale-105 hover:bg-accent hover:text-accent-foreground transition-all cursor-default"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 bg-background/50 rounded-lg border border-dashed border-border">
                <p className="text-muted-foreground">No recognized professional keywords were found by our backend system.</p>
              </div>
            )}
            
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                to="/interview"
                search={{ skills: keywords.join(",") }}
                className="inline-flex items-center gap-3 bg-accent px-8 py-3 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition-all hover:scale-105 hover:shadow-lg hover:shadow-accent/50 rounded-md"
              >
                START AI MOCK INTERVIEW
              </Link>

              <Link 
                to="/mcq"
                search={{ skills: keywords.join(",") }}
                className="inline-flex items-center gap-3 bg-purple-600 px-8 py-3 text-sm font-medium text-white hover:bg-purple-700 transition-all hover:scale-105 hover:shadow-lg hover:shadow-purple-500/50 rounded-md"
              >
                TAKE MCQ TEST
              </Link>
              
              <Link 
                to="/" 
                className="inline-flex items-center gap-3 bg-card border border-border px-8 py-3 text-sm font-medium hover:bg-card/80 transition-all hover:scale-105 rounded-md"
              >
                <ArrowLeft className="h-4 w-4" /> UPLOAD ANOTHER
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
