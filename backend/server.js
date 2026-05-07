require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');
const { INTERVIEWER_SYSTEM_PROMPT } = require('./prompt');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize the Google Gen AI client
// Note: Make sure to add GEMINI_API_KEY to your .env file
let ai;
try {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
} catch (error) {
  console.warn("Failed to initialize GoogleGenAI. Make sure GEMINI_API_KEY is set in .env");
}

const MODEL_NAME = 'gemini-2.5-flash';

// Utility to parse JSON from AI response
function parseAIResponse(text) {
  try {
    // Sometimes the model might wrap in markdown despite instructions
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Failed to parse JSON from AI response:", text);
    throw new Error("Invalid response format from AI");
  }
}

/**
 * POST /api/interview/start
 * Starts the interview by analyzing the resume and generating the first question.
 * Body: { resumeText: string }
 */
app.post('/api/interview/start', async (req, res) => {
  try {
    const { resumeText } = req.body;
    
    if (!resumeText) {
      return res.status(400).json({ error: "resumeText is required" });
    }

    const startPrompt = `
      Here is the candidate's resume:
      """
      ${resumeText}
      """
      
      Please analyze this resume as per STEP 1, create your interview roadmap (STEP 2), 
      and ask the FIRST beginner-level question (STEP 3).
      Remember to output ONLY valid JSON matching the specified format for responses.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: startPrompt,
      config: {
        systemInstruction: INTERVIEWER_SYSTEM_PROMPT,
        temperature: 0.7,
      }
    });

    const aiText = response.text();
    const parsedData = parseAIResponse(aiText);

    res.json(parsedData);
  } catch (error) {
    console.error("Error starting interview:", error);
    res.status(500).json({ error: "Failed to start interview" });
  }
});

/**
 * POST /api/interview/answer
 * Evaluates the candidate's answer and asks the next question.
 * Body: { answer: string, conversationHistory: array }
 */
app.post('/api/interview/answer', async (req, res) => {
  try {
    const { answer, conversationHistory } = req.body;

    if (!answer) {
      return res.status(400).json({ error: "answer is required" });
    }

    // conversationHistory should be an array of objects: { role: 'user' | 'model', parts: [{ text: string }] }
    // We append the new answer to it
    let messages = conversationHistory || [];
    
    // Gemini API requires the conversation history to start with a 'user' message.
    if (messages.length > 0 && messages[0].role === 'model') {
      messages = [
        { role: 'user', parts: [{ text: 'Start the mock interview.' }] },
        ...messages
      ];
    }
    
    const candidateMessage = {
      role: 'user',
      parts: [{ text: `Candidate Answer: ${answer}\n\nPlease evaluate this answer and provide the next question in the required JSON format.` }]
    };
    
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [...messages, candidateMessage],
      config: {
        systemInstruction: INTERVIEWER_SYSTEM_PROMPT,
        temperature: 0.7,
      }
    });

    const aiText = response.text();
    const parsedData = parseAIResponse(aiText);

    res.json({
      evaluation: parsedData,
      // Provide the new history back to the client
      updatedHistory: [
        ...messages,
        candidateMessage,
        { role: 'model', parts: [{ text: aiText }] }
      ]
    });
  } catch (error) {
    console.error("Error evaluating answer:", error);
    res.status(500).json({ error: "Failed to process answer" });
  }
});

/**
 * POST /api/interview/report
 * Generates the final interview report.
 * Body: { conversationHistory: array }
 */
app.post('/api/interview/report', async (req, res) => {
  try {
    const { conversationHistory } = req.body;

    let messages = conversationHistory || [];
    
    // Gemini API requires the conversation history to start with a 'user' message.
    if (messages.length > 0 && messages[0].role === 'model') {
      messages = [
        { role: 'user', parts: [{ text: 'Start the mock interview.' }] },
        ...messages
      ];
    }
    
    const endMessage = {
      role: 'user',
      parts: [{ text: `END INTERVIEW. Please generate the final interview report in the required JSON format based on our entire conversation.` }]
    };

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [...messages, endMessage],
      config: {
        systemInstruction: INTERVIEWER_SYSTEM_PROMPT,
        temperature: 0.5,
      }
    });

    const aiText = response.text();
    const parsedData = parseAIResponse(aiText);

    res.json(parsedData);
  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

/**
 * POST /api/interview/mcq-generate
 * Generates 5 personalized MCQ questions based on provided skills.
 * Body: { skills: string }
 */
app.post('/api/interview/mcq-generate', async (req, res) => {
  try {
    const { skills } = req.body;
    
    if (!skills) {
      return res.status(400).json({ error: "skills are required" });
    }

    const prompt = `
      You are an expert technical interviewer. The candidate has the following skills extracted from their resume:
      "${skills}"
      
      Generate a technical multiple-choice quiz (MCQ) containing exactly 5 questions to test their knowledge on these specific skills.
      Vary the difficulty from beginner to advanced.
      
      You MUST return exactly this JSON array format, and nothing else (no markdown, no extra text):
      [
        {
          "question": "The question text",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswerIndex": 0, // integer index (0-3) of the correct option
          "explanation": "Brief explanation of why this answer is correct"
        }
      ]
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });

    const aiText = response.text();
    const parsedData = parseAIResponse(aiText);

    res.json(parsedData);
  } catch (error) {
    console.error("Error generating MCQ:", error);
    res.status(500).json({ error: "Failed to generate MCQ quiz" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`AI Mock Interviewer Backend is running on port ${PORT}`);
});
