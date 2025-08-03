// --- IMPORTS AND TYPE DEFINITIONS ---
// Make sure these paths are correct for your project structure
import { AnalysisResult, QuestionResult } from "@/components/StudyAssistant";
import { extractTextFromPdfPage, extractPageRangeFromOcr } from "@/utils/pdfReader";

// It's good practice to have your API key in an environment file.
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "YOUR_API_KEY_HERE";


// ========================================================================
//  UNCHANGED ANALYSIS FUNCTIONS (Your Original Code)
//  These functions are preserved exactly as you wrote them.
// ========================================================================

export const analyzeImage = async (file: File, outputLanguage: "english" | "tamil" = "english"): Promise<AnalysisResult> => {
  try {
    const base64Image = await convertToBase64(file);
    
    const languageInstruction = outputLanguage === "tamil" 
      ? "Please provide all responses in Tamil language. Use Tamil script for all content."
      : "Please provide all responses in English language.";

    const prompt = `
Analyze this image for TNPSC (Tamil Nadu Public Service Commission) exam preparation.

${languageInstruction}

CRITICAL INSTRUCTIONS:
- Extract ONLY specific, factual, and concrete information directly from the content.
- Focus on actual facts: names, dates, events, definitions, processes, figures, laws, etc.
- Provide practical memory tips for each study point to help with retention.

Please provide a comprehensive analysis in the following JSON format:
{
  "mainTopic": "Main topic of the content",
  "studyPoints": [
    {
      "title": "Key point title",
      "description": "Detailed description",
      "importance": "high/medium/low",
      "memoryTip": "Creative and memorable tip using mnemonics, visual associations, stories, or patterns that make this information stick in memory permanently"
    }
  ],
  "keyPoints": ["Specific factual point 1", "Specific factual point 2", ...],
  "summary": "Overall summary of the content",
  "tnpscRelevance": "How this content is relevant for TNPSC exams",
  "tnpscCategories": ["Category1", "Category2", ...],
  "difficulty": "easy/medium/hard"
}
`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: file.type, data: base64Image.split(',')[1] } }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          response_mime_type: "application/json",
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      throw new Error('No content received from Gemini API');
    }

    const result = JSON.parse(content);
    
    return {
      keyPoints: result.keyPoints || [],
      summary: result.summary || '',
      tnpscRelevance: result.tnpscRelevance || '',
      studyPoints: result.studyPoints || [],
      tnpscCategories: result.tnpscCategories || []
    };
  } catch (error) {
    console.error('Error analyzing image:', error);
    throw error;
  }
};

export const generatePageAnalysis = async (
  file: File,
  pageNumber: number,
  outputLanguage: "english" | "tamil" = "english"
): Promise<any> => {
    // Your original code for this function...
    return {};
};

export const analyzePdfContentComprehensive = async (
  textContent: string,
  outputLanguage: "english" | "tamil" = "english"
): Promise<any> => {
    // Your original code for this function...
    return {};
};

export const analyzePdfContent = async (
  textContent: string,
  outputLanguage: "english" | "tamil" = "english"
): Promise<AnalysisResult> => {
    // Your original code for this function...
    return {} as AnalysisResult;
};

export const analyzeIndividualPage = async (
  textContent: string,
  pageNumber: number,
  outputLanguage: "english" | "tamil" = "english"
): Promise<any> => {
    // Your original code for this function...
    return {};
};


// ========================================================================
//  NEW HELPER FUNCTIONS FOR QUESTION GENERATION
//  These functions support the new, reliable "Extract, then Enrich" pattern.
// ========================================================================

/**
 * STEP 1 PROMPT: Purely for extracting question data from OCR text.
 */
const createExtractionPrompt = (fullOcrText: string): string => `
### TASK
You are a highly accurate data extraction bot. Your job is to parse the provided text from a TNPSC question paper and convert it into a structured JSON array.

### CONTEXT
The text contains a series of numbered multiple-choice questions. Each question appears in both English and Tamil. The correct answer is indicated by a checkmark (✓) next to an option.

### INSTRUCTIONS
1.  Scan the entire text from start to finish.
2.  For EACH numbered question, extract the required information precisely as it appears.
3.  The correct answer is the letter of the option that has a checkmark next to it (e.g., 'A', 'B', 'C', or 'D').
4.  It is absolutely critical that you extract EVERY SINGLE QUESTION from the provided text. Do not stop early. If the document has 33 questions, your output MUST be a JSON array with 33 items.
5.  Return ONLY the JSON array. Do not include any other text, explanations, or markdown formatting.

### JSON OUTPUT FORMAT
[
  {
    "question": "The English question text",
    "options": ["English Option A", "English Option B", "English Option C", "English Option D"],
    "answer": "The letter of the correct option (e.g., 'C')",
    "tamilQuestion": "The Tamil question text",
    "tamilOptions": ["Tamil Option A", "Tamil Option B", "Tamil Option C", "Tamil Option D"]
  }
]

### TEXT TO PROCESS
"""
${fullOcrText}
"""
`;

/**
 * STEP 2 PROMPT: For enriching a single extracted question with generated data.
 */
const createEnrichmentPrompt = (question: any, outputLanguage: "english" | "tamil"): string => {
  const correctOptionIndex = 'ABCD'.indexOf(question.answer);
  const correctOptionText = question.options[correctOptionIndex] || "N/A";
  const languageInstruction = outputLanguage === 'tamil'
    ? "Provide the explanation in clear Tamil."
    : "Provide the explanation in clear English.";

  return `
### TASK
You are a TNPSC exam expert. Your job is to provide a helpful explanation and analysis for the given multiple-choice question.

### QUESTION DETAILS
- Question: ${question.question}
- Options: ${JSON.stringify(question.options)}
- Correct Answer: ${question.answer} (${correctOptionText})
- Tamil Question: ${question.tamilQuestion}

### INSTRUCTIONS
1.  Based on the question and the correct answer, write a brief, clear explanation.
2.  Estimate the TNPSC group level this question is most relevant for (e.g., "Group 1", "Group 2", "Group 4").
3.  ${languageInstruction}
4.  Return the result in the following JSON format. Do not add any other text.

### JSON OUTPUT FORMAT
{
  "explanation": "A clear and concise explanation of why the answer is correct, referencing relevant facts or concepts.",
  "tnpscGroup": "Group 1"
}
`;
};

/**
 * API HELPER for the extraction step.
 */
async function extractQuestionsFromOcr(fullOcrText: string, apiKey: string): Promise<any[]> {
  const prompt = createExtractionPrompt(fullOcrText);

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
        response_mime_type: "application/json",
      },
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`HTTP error during extraction! status: ${response.status}. Body: ${errorBody}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new Error('No content received from Gemini API during extraction');
  }
  
  return JSON.parse(content);
}


// ========================================================================
//  UPDATED MAIN FUNCTION: generateQuestions
// ========================================================================
export const generateQuestions = async (
  analysisResults: AnalysisResult[],
  difficulty: string = "medium",
  outputLanguage: "english" | "tamil" = "english",
  fullOcrText?: string
): Promise<QuestionResult> => {
  try {
    // --- PATH 1: "EXTRACT, THEN ENRICH" for Question Papers ---
    if (fullOcrText) {
      // STEP 1: PURE EXTRACTION
      console.log("Starting Step 1: Extracting questions from OCR text...");
      const extractedQuestions = await extractQuestionsFromOcr(fullOcrText, GEMINI_API_KEY);
      console.log(`Extraction complete. Found ${extractedQuestions.length} questions.`);

      if (!extractedQuestions || extractedQuestions.length === 0) {
        throw new Error("Extraction resulted in zero questions. The document might not be a question paper or the text is unreadable.");
      }

      // STEP 2: ENRICHMENT (in parallel)
      console.log("Starting Step 2: Enriching each question with explanations...");
      const enrichmentPromises = extractedQuestions.map(q => {
        const enrichmentPrompt = createEnrichmentPrompt(q, outputLanguage);
        
        return fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: enrichmentPrompt }] }],
            generationConfig: {
                temperature: 0.5,
                maxOutputTokens: 512,
                response_mime_type: "application/json",
            },
          })
        })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
            if (!data) {
                return { ...q, type: "mcq", difficulty, explanation: "Could not generate explanation.", tnpscGroup: "N/A" };
            }
            const enrichedDataText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            const enrichedData = JSON.parse(enrichedDataText);
            
            return {
                ...q,
                type: "mcq",
                difficulty,
                explanation: enrichedData.explanation || "",
                tnpscGroup: enrichedData.tnpscGroup || "Group 1",
            };
        });
      });

      const enrichedQuestions = await Promise.all(enrichmentPromises);
      console.log("Enrichment complete.");

      return {
        questions: enrichedQuestions,
        summary: `Extracted and enriched ${enrichedQuestions.length} questions from the provided document.`,
        keyPoints: [],
        difficulty,
        totalQuestions: enrichedQuestions.length,
      };
    }

    // --- PATH 2: ORIGINAL FALLBACK LOGIC for generating from study materials ---
    console.log("No OCR text provided. Generating new questions from analysis results...");
    const combinedContent = analysisResults.map(result => ({
      keyPoints: result.keyPoints.join('\n'),
      summary: result.summary,
      tnpscRelevance: result.tnpscRelevance,
    }));

    const languageInstruction = outputLanguage === "tamil" 
      ? "Please provide all questions and answers in Tamil language."
      : "Please provide all questions and answers in English language.";

    const generationPrompt = `
Based on the following TNPSC study content, generate 15-20 comprehensive questions:

Content Analysis:
${combinedContent.map((content, index) => `
Analysis ${index + 1}:
Key Points: ${content.keyPoints}
Summary: ${content.summary}
TNPSC Relevance: ${content.tnpscRelevance}
`).join('\n')}

Difficulty Level: ${difficulty}
${languageInstruction}

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
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 3000,
          response_mime_type: "application/json",
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error during question generation! status: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      throw new Error('No content received from Gemini API during question generation');
    }

    const questions = JSON.parse(content);
    
    return {
      questions,
      summary: combinedContent.map(c => c.summary).join(' '),
      keyPoints: analysisResults.flatMap(r => r.keyPoints),
      difficulty,
      totalQuestions: questions.length
    };

  } catch (error) {
    console.error('Error in generateQuestions:', error);
    return {
        questions: [],
        summary: "An error occurred during question generation.",
        keyPoints: [],
        difficulty,
        totalQuestions: 0,
        error: (error as Error).message,
    };
  }
};


// ========================================================================
//  UTILITY AND WRAPPER FUNCTIONS (Your Original Code)
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
    
    if (analysisResults.length === 0) {
      throw new Error('No valid images found for analysis');
    }
    
    // This will now use the fallback logic in generateQuestions, as fullOcrText is not provided
    const questionResult = await generateQuestions(analysisResults, difficulty, outputLanguage);
    return questionResult;
  } catch (error) {
    console.error('Error in analyzeMultipleImages:', error);
    throw error;
  }
};