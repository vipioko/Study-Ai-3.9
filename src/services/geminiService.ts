// ========================================================================
// FILE: src/services/geminiService.ts
// This is the complete, 100% full code for the file.
// ========================================================================

// --- IMPORTS AND TYPE DEFINITIONS ---
import { AnalysisResult, Question, QuestionResult } from "@/types/admin";
import { parseQuestionPaperOcr } from "../utils/questionPaperParser"; // Ensure correct path

// --- API KEY CONFIGURATION ---
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("CRITICAL: VITE_GEMINI_API_KEY is not set in your environment file.");
}


// ========================================================================
//  CORE ANALYSIS FUNCTIONS (Including Original Placeholders)
// ========================================================================

/**
 * Analyzes a single image of study material (not a question paper).
 */
export const analyzeImage = async (file: File, outputLanguage: "english" | "tamil" = "english"): Promise<AnalysisResult> => {
  try {
    const base64Image = await convertToBase64(file);
    const languageInstruction = outputLanguage === "tamil" 
      ? "Please provide all responses in Tamil language." 
      : "Please provide all responses in English language.";
    const prompt = `
Analyze this image for TNPSC exam preparation. ${languageInstruction}
Provide a comprehensive analysis in this JSON format:
{
  "mainTopic": "Main topic", "studyPoints": [{"title": "Key point", "description": "Detailed description", "importance": "high", "memoryTip": "Memorable tip"}],
  "keyPoints": ["Factual point 1"], "summary": "Overall summary", "tnpscRelevance": "Relevance for exams", "tnpscCategories": ["Category1"], "difficulty": "medium"
}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: file.type, data: base64Image.split(',')[1] } }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048, response_mime_type: "application/json" }
      })
    });

    if (!response.ok) throw new Error(`HTTP error during image analysis! status: ${response.status}`);
    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error('No content received from Gemini API during image analysis');
    const result = JSON.parse(content);
    
    return {
      keyPoints: result.keyPoints || [], summary: result.summary || '', tnpscRelevance: result.tnpscRelevance || '',
      studyPoints: result.studyPoints || [], tnpscCategories: result.tnpscCategories || []
    };
  } catch (error) {
    console.error('Error analyzing image:', error);
    throw error;
  }
};

/**
 * Placeholder function from your original code.
 */
export const generatePageAnalysis = async (
  file: File,
  pageNumber: number,
  outputLanguage: "english" | "tamil" = "english"
): Promise<any> => {
    // This is a placeholder as per your original file.
    return {};
};

/**
 * Placeholder function from your original code.
 */
export const analyzePdfContentComprehensive = async (
  textContent: string,
  outputLanguage: "english" | "tamil" = "english"
): Promise<any> => {
    // This is a placeholder as per your original file.
    return {};
};

/**
 * Placeholder function from your original code.
 */
export const analyzePdfContent = async (
  textContent: string,
  outputLanguage: "english" | "tamil" = "english"
): Promise<AnalysisResult> => {
    // This is a placeholder as per your original file.
    return {} as AnalysisResult;
};

/**
 * Placeholder function from your original code.
 */
export const analyzeIndividualPage = async (
  textContent: string,
  pageNumber: number,
  outputLanguage: "english" | "tamil" = "english"
): Promise<any> => {
    // This is a placeholder as per your original file.
    return {};
};


// ========================================================================
//  AI HELPER PROMPTS FOR QUESTION GENERATION
// ========================================================================

/**
 * Creates the prompt for the AI-powered extraction fallback ("Safety Net").
 */
// In src/services/geminiService.ts

/**
 * Creates the prompt for the AI-powered extraction fallback ("Safety Net").
 * THIS VERSION IS UPGRADED TO BE MORE ACCURATE.
 */
const createAiExtractionPrompt = (fullOcrText: string): string => `
### TASK
You are an expert data extraction bot. The user has provided a single block of text that contains MULTIPLE multiple-choice questions from a TNPSC exam paper. Your job is to meticulously identify each individual question, extract its components, and format the output as a single JSON array.

### CONTEXT & INSTRUCTIONS
1.  **Identify Question Boundaries:** Your most important first step is to determine where one question ends and the next one begins. A new question block often starts after the Tamil options of the previous one. Scan for patterns to separate the text into individual question chunks.
2.  **For Each Question Chunk, Extract the Following:**
    *   **`question`**: The English question text.
    *   **`options`**: An array of exactly four English option strings.
    *   **`answer`**: The single capital letter ('A', 'B', 'C', or 'D') of the correct option. The correct option is the one that had a checkmark (✓) next to it in the original document. You must infer which one was checked.
    *   **`tamilQuestion`**: The Tamil question text.
    *   **`tamilOptions`**: An array of the four Tamil option strings.
3.  **Data Integrity:**
    *   Do NOT include headers, footers, or page numbers (like "ARAM TNPSC 2.0" or "லஞ்சம் பிச்சைக்கு சமம்...") in any of the extracted fields.
    *   Clean the text to remove unnecessary newlines.
4.  **Output Format:** Return ONLY a valid JSON array containing the objects for each question you found. Do not include explanations or markdown.

### JSON OUTPUT FORMAT
[
  {
    "question": "Which Article of the constitution makes provision for the appointment of a law officer the attorney general by the President of India?",
    "options": ["Article 42", "Article 76", "Article 44", "Article 153"],
    "answer": "B",
    "tamilQuestion": "எந்த அரசியல் சட்டவிதிப்படி மத்திய அரசு தலைமை வழக்கறிஞர் குடியரசுத் தலைவரால் நியமிக்கப்படுகின்றார்?",
    "tamilOptions": ["அரசியல் சட்ட விதி 42", "சட்ட விதி 76", "சட்ட விதி 44", "சட்ட விதி 153"]
  }
]

### TEXT TO PROCESS
"""
${fullOcrText}
"""
`;

/**
 * Creates the prompt for enriching an extracted question with explanations and metadata.
 */
const createEnrichmentPrompt = (question: Partial<Question>, outputLanguage: "english" | "tamil"): string => {
  const correctOptionIndex = 'ABCD'.indexOf(question.answer || '');
  const correctOptionText = question.options ? question.options[correctOptionIndex] : "N/A";
  const languageInstruction = outputLanguage === 'tamil' ? "Provide the explanation in clear Tamil." : "Provide the explanation in clear English.";

  return `
### TASK
You are a TNPSC exam expert. Provide a helpful explanation and analysis for the given question.
### QUESTION DETAILS
- Question: ${question.question}
- Options: ${JSON.stringify(question.options)}
- Correct Answer: ${question.answer} (${correctOptionText})
### INSTRUCTIONS
1.  Write a brief, clear explanation for why the answer is correct.
2.  Estimate the TNPSC group level (e.g., "Group 1", "Group 2").
3.  ${languageInstruction}
4.  Return ONLY a valid JSON object with the following format.
### JSON OUTPUT FORMAT
{ "explanation": "A clear explanation.", "tnpscGroup": "Group 1" }`;
};


// ========================================================================
//  MAIN QUESTION GENERATION FUNCTION WITH "SAFETY NET" LOGIC
// ========================================================================

export const generateQuestions = async (
  analysisResults: AnalysisResult[],
  difficulty: string = "medium",
  outputLanguage: "english" | "tamil" = "english",
  fullOcrText?: string
): Promise<QuestionResult> => {
  try {
    // --- PATH 1: QUESTION PAPER EXTRACTION LOGIC ---
    if (fullOcrText) {
      let questionsForEnrichment: Partial<Question>[] = [];

      // --- ATTEMPT A: DETERMINISTIC PARSING (The Fast Lane) ---
      console.log("Attempting Step 1A: Deterministic OCR Parsing...");
      const deterministicQuestions = parseQuestionPaperOcr(fullOcrText || '');
      
      if (deterministicQuestions.length > 0) {
        console.log(`Success! Deterministic parser found ${deterministicQuestions.length} questions.`);
        questionsForEnrichment = deterministicQuestions;
      } else {
        // --- ATTEMPT B: AI EXTRACTION FALLBACK (The Safety Net) ---
        console.warn("Deterministic parser failed. Falling back to Step 1B: AI-Powered Extraction...");
        const aiExtractionPrompt = createAiExtractionPrompt(fullOcrText);
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: aiExtractionPrompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 8192, response_mime_type: "application/json" },
          })
        });

        if (!response.ok) throw new Error(`HTTP error during AI extraction fallback! Status: ${response.status}`);
        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!content) throw new Error('No content received from AI extraction fallback');
        
        questionsForEnrichment = JSON.parse(content);
        console.log(`Success! AI extractor found ${questionsForEnrichment.length} questions.`);
      }

      if (!questionsForEnrichment || questionsForEnrichment.length === 0) {
        throw new Error("Fatal: Extraction resulted in zero questions from both parsing methods. The document may be unreadable or not a question paper.");
      }

      // --- STEP 2: AI ENRICHMENT (For explanations and metadata) ---
      console.log(`Starting Step 2: Enriching ${questionsForEnrichment.length} questions...`);
      const enrichmentPromises = questionsForEnrichment.map(q => {
        const enrichmentPrompt = createEnrichmentPrompt(q, outputLanguage);
        return fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: enrichmentPrompt }] }],
            generationConfig: { temperature: 0.5, maxOutputTokens: 512, response_mime_type: "application/json" },
          })
        })
        .then(res => res.ok ? res.json() : Promise.resolve(null))
        .then(data => {
            const enrichedDataText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!enrichedDataText) return { ...q, type: "mcq", difficulty, explanation: "Could not generate explanation.", tnpscGroup: "N/A" };
            const enrichedData = JSON.parse(enrichedDataText);
            return { ...q, type: "mcq", difficulty, explanation: enrichedData.explanation || "", tnpscGroup: enrichedData.tnpscGroup || "Group 1" };
        });
      });

      const enrichedQuestions = await Promise.all(enrichmentPromises);
      console.log("Enrichment complete.");
      return {
        questions: enrichedQuestions as Question[],
        summary: `Successfully extracted and enriched ${enrichedQuestions.length} questions from the document.`,
        keyPoints: [], difficulty, totalQuestions: enrichedQuestions.length,
      };
    }

    // --- PATH 2: FALLBACK FOR STUDY MATERIALS (No OCR text provided) ---
    console.log("No OCR text provided. Generating new questions from analysis results...");
    const combinedContent = analysisResults.map(result => `Key Points: ${result.keyPoints.join(', ')}\nSummary: ${result.summary}`).join('\n\n');
    const generationPrompt = `
Based on the following TNPSC study content, generate 15-20 comprehensive questions:

Content Analysis:
${combinedContent}

Difficulty Level: ${difficulty}
Language: ${outputLanguage}

Return as a JSON array with this exact structure:
[
  {
    "question": "Question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "A",
    "type": "mcq",
    "difficulty": "${difficulty}",
    "tnpscGroup": "Group 1",
    "explanation": "Brief explanation of the answer"
  }
]
CRITICAL: The "answer" field MUST contain only the single capital letter of the correct option (A, B, C, or D).
`;
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: generationPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096, response_mime_type: "application/json" }
      })
    });

    if (!response.ok) throw new Error(`HTTP error during question generation! status: ${response.status}`);
    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error('No content received from Gemini API during question generation');
    const questions = JSON.parse(content);
    
    return {
      questions, summary: "Generated questions based on study material.", keyPoints: analysisResults.flatMap(r => r.keyPoints),
      difficulty, totalQuestions: questions.length
    };

  } catch (error) {
    console.error('Fatal error in generateQuestions:', error);
    return {
        questions: [], summary: "An error occurred during question generation.", keyPoints: [],
        difficulty, totalQuestions: 0, error: (error as Error).message,
    };
  }
};


// ========================================================================
//  UTILITY AND WRAPPER FUNCTIONS
// ========================================================================

const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const analyzeMultipleImages = async (
  files: File[],
  difficulty: string = "medium",
  outputLanguage: "english" | "tamil" = "english"
): Promise<QuestionResult> => {
  try {
    const analysisResults: AnalysisResult[] = [];
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const result = await analyzeImage(file, outputLanguage);
        analysisResults.push(result);
      }
    }
    if (analysisResults.length === 0) throw new Error('No valid images found for analysis');
    // This will use the study material fallback logic in generateQuestions
    return await generateQuestions(analysisResults, difficulty, outputLanguage);
  } catch (error) {
    console.error('Error in analyzeMultipleImages:', error);
    throw error;
  }
};