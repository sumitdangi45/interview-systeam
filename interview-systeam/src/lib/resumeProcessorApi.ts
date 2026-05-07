import { createServerFn } from '@tanstack/react-start';
import { extractKeywords } from './keywordExtractor';

export const processResumeKeywords = createServerFn({ method: 'POST' })
  .inputValidator((data: { text: string }) => data)
  .handler(async ({ data }) => {
    // This code runs securely on the backend server.
    
    // 1. We receive the raw text that the browser successfully extracted.
    const text = data.text;
    
    // 2. We process the text using our keyword extraction logic.
    const keywords = extractKeywords(text);
    
    // 3. We return the processed keywords back to the client.
    // In a production app, you might also save this to a database here.
    return { success: true, keywords };
  });
