// A curated list of common professional, technical, and business keywords
// You can expand this list over time or load it from a backend database.
const SKILL_KEYWORDS = new Set([
  // Programming & Tech
  "javascript", "typescript", "python", "java", "c++", "c#", "ruby", "php", "go", "rust", "swift", "kotlin", "sql", "nosql",
  "react", "angular", "vue", "node.js", "express", "django", "flask", "spring", "asp.net", "laravel",
  "html", "css", "sass", "less", "tailwind", "bootstrap",
  "aws", "azure", "gcp", "docker", "kubernetes", "jenkins", "git", "github", "gitlab", "ci/cd", "devops",
  "machine learning", "ai", "artificial intelligence", "data science", "data analysis", "pandas", "numpy", "tensorflow", "pytorch",
  
  // Design & Product
  "figma", "sketch", "adobe xd", "photoshop", "illustrator", "ui", "ux", "product management", "agile", "scrum", "kanban", "jira",

  // Business & Marketing
  "marketing", "seo", "sem", "content creation", "copywriting", "sales", "crm", "salesforce", "hubspot",
  "leadership", "management", "project management", "communication", "problem solving", "teamwork", "strategy",
  "finance", "accounting", "excel", "financial modeling",

  // Legal (since it's a legal tech site)
  "law", "legal", "compliance", "contracts", "intellectual property", "litigation", "corporate law", "cybersecurity", "gdpr", "data privacy"
]);

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "if", "in", "into", "is", "it",
  "no", "not", "of", "on", "or", "such", "that", "the", "their", "then", "there", "these",
  "they", "this", "to", "was", "will", "with"
]);

export function extractKeywords(text: string): string[] {
  if (!text) return [];

  // Normalize text: convert to lowercase and replace non-alphanumeric (except spaces/hyphens/pluses/dots for things like c++ or node.js) with spaces
  const normalizedText = text.toLowerCase().replace(/[^a-z0-9\+\.\#\-]/g, ' ');

  // Split into words
  const words = normalizedText.split(/\s+/).filter(word => word.length > 1 && !STOP_WORDS.has(word));

  const keywordCounts = new Map<string, number>();

  // Check individual words
  for (const word of words) {
    if (SKILL_KEYWORDS.has(word)) {
      keywordCounts.set(word, (keywordCounts.get(word) || 0) + 1);
    }
  }

  // Check for multi-word phrases (bigrams) like "machine learning", "data science"
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i + 1]}`;
    if (SKILL_KEYWORDS.has(bigram)) {
      keywordCounts.set(bigram, (keywordCounts.get(bigram) || 0) + 1);
    }
  }
  
  // Sort by frequency descending and return top 15 unique keywords
  const sortedKeywords = Array.from(keywordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);

  // Capitalize nicely for display
  return sortedKeywords.slice(0, 15).map(word => 
    word.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  );
}
