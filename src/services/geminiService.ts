// ========================================================================
// FILE: src/services/geminiService.ts
// VERSION: Final, Complete, and Robust
// ========================================================================

// --- IMPORTS AND TYPE DEFINITIONS ---
import { AnalysisResult, Question, QuestionResult } from "@/types/admin";
import { parseQuestionPaperOcr } from "../utils/questionPaperParser"; // Using the corrected path from your file

// --- API KEY CONFIGURATION ---
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("CRITICAL: VITE_GEMINI_API_KEY is not set in your environment file.");
}


// ========================================================================
//  CORE ANALYSIS FUNCTIONS (Including All Original Placeholders)
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
export const generatePageAnalysis = async (file: File, pageNumber: number, outputLanguage: "english" | "tamil" = "english"): Promise<any> => {
    // This is a placeholder as per your original file.
    return {};
};

/**
 * Placeholder function from your original code.
 */
export const analyzePdfContentComprehensive = async (textContent: string, outputLanguage: "english" | "tamil" = "english"): Promise<any> => {
    // This is a placeholder as per your original file.
    return {};
};

/**
 * Placeholder function from your original code.
 */
export const analyzePdfContent = async (textContent: string, outputLanguage: "english" | "tamil" = "english"): Promise<AnalysisResult> => {
    // This is a placeholder as per your original file.
    return {} as AnalysisResult;
};

/**
 * Placeholder function from your original code.
 */
export const analyzeIndividualPage = async (textContent: string, pageNumber: number, outputLanguage: "english" | "tamil" = "english"): Promise<any> => {
    // This is a placeholder as per your original file.
    return {};
};


// ========================================================================
//  AI HELPER PROMPTS FOR QUESTION GENERATION
// ========================================================================

/**
 * Creates the prompt for the AI-powered extraction fallback ("Safety Net").
 * This version is upgraded to be more accurate.
 */
const createAiExtractionPrompt = (fullOcrText: string): string => `
### TASK
You are an expert data extraction bot. The user has provided text that contains MULTIPLE multiple-choice questions. Your job is to meticulously identify each individual question, extract its components, and format the output as a single JSON array.

### INSTRUCTIONS
1.  **Identify Question Boundaries:** Your most important first step is to determine where one question ends and the next one begins.
2.  **For Each Question Chunk, Extract:**
    *   **`question`**: The English question text.
    *   **`options`**: An array of four English option strings.
    *   **`answer`**: The single capital letter ('A', 'B', 'C', or 'D') of the correct option, inferred from a checkmark (✓) in the original document.
    *   **`tamilQuestion`**: The Tamil question text.
    *   **`tamilOptions`**: An array of the four Tamil option strings.
3.  **Data Integrity:** Do NOT include headers, footers, or page numbers (like "ARAM TNPSC 2.0").
4.  **Output Format:** Return ONLY a valid JSON array. Do not include markdown or other text.

### JSON OUTPUT FORMAT EXAMPLE
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
  // Added safety checks for potentially null properties
  const answer = question?.answer || '';
  const options = question?.options || [];
  const correctOptionIndex = 'ABCD'.indexOf(answer);
  const correctOptionText = options[correctOptionIndex] || "N/A";
  const languageInstruction = outputLanguage === 'tamil' ? "Provide the explanation in clear Tamil." : "Provide the explanation in clear English.";

  return `
### TASK
You are a TNPSC exam expert. Provide a helpful explanation and analysis for the given question.
### QUESTION DETAILS
- Question: ${question?.question || 'N/A'}
- Options: ${JSON.stringify(options)}
- Correct Answer: ${answer} (${correctOptionText})
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

      console.log("Attempting Step 1A: Deterministic OCR Parsing...");
      const deterministicQuestions = parseQuestionPaperOcr(fullOcrText ?? '');
      
      if (deterministicQuestions.length > 0) {
        console.log(`Success! Deterministic parser found ${deterministicQuestions.length} questions.`);
        questionsForEnrichment = deterministicQuestions;
      } else {
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
        
        try {
          questionsForEnrichment = JSON.parse(content);
        } catch (jsonError) {
          console.error("Failed to parse JSON from AI extraction:", content);
          throw new Error("The AI extractor returned malformed data.");
        }
        console.log(`Success! AI extractor found ${questionsForEnrichment.length} questions.`);
      }

      if (!questionsForEnrichment || questionsForEnrichment.length === 0) {
        throw new Error("Fatal: Extraction resulted in zero questions from both parsing methods.");
      }

      console.log(`Starting Step 2: Enriching ${questionsForEnrichment.length} questions...`);
      const enrichmentPromises = questionsForEnrichment.map(q => {
        if (!q?.question) return Promise.resolve(null); // Safety check for invalid question objects
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
            try {
              const enrichedData = JSON.parse(enrichedDataText);
              return { ...q, type: "mcq", difficulty, explanation: enrichedData.explanation || "", tnpscGroup: enrichedData.tnpscGroup || "Group 1" };
            } catch (jsonError) {
              console.error("Failed to parse JSON from enrichment:", enrichedDataText);
              return { ...q, type: "mcq", difficulty, explanation: "Failed to parse enrichment data.", tnpscGroup: "N/A" };
            }
        });
      });

      const enrichedQuestions = (await Promise.all(enrichmentPromises)).filter(Boolean); // Filter out any null results
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
    const generationPrompt = `Based on the following TNPSC study content, generate 15-20 questions. Difficulty: ${difficulty}. Language: ${outputLanguage}. Return as a JSON array: [{"question": "...", "options": ["A", "B", "C", "D"], "answer": "A", "type": "mcq", "difficulty": "${difficulty}", "tnpscGroup": "Group 1", "explanation": "..."}]\n\nContent:\n${combinedContent}`;
    
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