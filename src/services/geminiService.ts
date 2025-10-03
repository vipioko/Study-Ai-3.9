import { AnalysisResult, QuestionResult } from "@/components/StudyAssistant";
import { extractTextFromPdfPage, extractPageRangeFromOcr } from "@/utils/pdfReader";
import { parseQuestionPaperOcr } from "@/utils/questionPaperParser";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyDQcwO_13vP_dXB3OXBuTDvYfMcLXQIfkM";

const API_CONFIG = {
  primaryModel: "gemini-2.5-flash",
  fallbackModels: ["gemini-1.5-flash-001", "gemini-pro-vision"],
  apiVersion: "v1beta",
  baseUrl: "https://generativelanguage.googleapis.com"
};

const getApiUrl = (model: string) => {
  return `${API_CONFIG.baseUrl}/${API_CONFIG.apiVersion}/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
};

// ========================================================================
// REUSABLE HELPER: Robust Gemini JSON Response Processing
// ========================================================================
const processGeminiJSONResponse = (data: any, isMultimodal: boolean = false): any => {
  const candidates = data.candidates;

  if (!candidates || candidates.length === 0) {
    const promptFeedback = data.promptFeedback;
    let errorMessage = 'No content or candidates received from Gemini API.';

    if (promptFeedback) {
      if (promptFeedback.blockReason === 'SAFETY') {
        errorMessage = `Request blocked due to safety settings. Safety Ratings: ${JSON.stringify(promptFeedback.safetyRatings, null, 2)}`;
      } else if (promptFeedback.blockReason === 'OTHER') {
        errorMessage = `Request blocked due to policy reasons. Block Reason: ${promptFeedback.blockReason}`;
      }
    }
    
    console.error('Gemini API returned no candidates or was blocked:', data);
    throw new Error(errorMessage);
  }

  const candidate = candidates[0];
  const content = candidate.content?.parts?.[0]?.text;
  const finishReason = candidate.finishReason;

  if (!content) {
    if (finishReason === 'SAFETY') {
        const safetyMessage = `Candidate blocked due to safety settings. Safety Ratings: ${JSON.stringify(candidate.safetyRatings, null, 2)}`;
        console.error(safetyMessage, candidate.safetyRatings);
        throw new Error(safetyMessage);
    }
    
    console.error(`Gemini API returned no content. Finish Reason: ${finishReason}`, candidate);
    throw new Error(`No final content received from Gemini API. Finish reason: ${finishReason || 'UNKNOWN'}`);
  }

  // Clean and parse the JSON response
  let cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
  
  // Remove any leading/trailing non-JSON content
  const jsonStart = cleanedContent.indexOf('{');
  const jsonEnd = cleanedContent.lastIndexOf('}');
  
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleanedContent = cleanedContent.substring(jsonStart, jsonEnd + 1);
  } else if (cleanedContent.startsWith('[')) {
    // Handle array response (like for questions)
    const arrayEnd = cleanedContent.lastIndexOf(']');
    if (arrayEnd !== -1) {
        cleanedContent = cleanedContent.substring(0, arrayEnd + 1);
    }
  }

  if ((!cleanedContent.startsWith('{') || !cleanedContent.endsWith('}')) && (!cleanedContent.startsWith('[') || !cleanedContent.endsWith(']'))) {
      console.error('Raw content is not valid JSON:', cleanedContent);
      throw new Error(`Gemini API returned non-JSON data. Output malformed (Finish Reason: ${finishReason || 'N/A'}): ${cleanedContent.substring(0, 200)}...`);
  }
  
  try {
    return JSON.parse(cleanedContent);
  } catch (parseError) {
    console.error('JSON Parse Failed:', parseError, cleanedContent.substring(0, 500));
    throw new Error(`Failed to parse final JSON response. Output truncated or malformed (Finish Reason: ${finishReason || 'N/A'}).`);
  }
};


// ========================================================================
// INTERNAL: analyzeTextContent (Text-Only)
// ========================================================================
const analyzeTextContent = async (textContent: string, outputLanguage: "english" | "tamil"): Promise<any> => {
  const languageInstruction = outputLanguage === "tamil" 
    ? "Please provide all responses in Tamil language. Use Tamil script for all content."
    : "Please provide all responses in English language.";

  const prompt = `
Analyze this text content for TNPSC (Tamil Nadu Public Service Commission) exam preparation.

${languageInstruction}

Content: ${textContent.substring(0, 8000)}

CRITICAL INSTRUCTIONS:
- Extract ONLY specific, factual, and concrete information directly from the content
- DO NOT include generic statements about importance or what needs to be studied
- Focus on actual facts: names, dates, events, definitions, processes, figures, laws, etc.
- **VERY CRITICAL: All content, especially 'description' and 'memoryTip', must be concise to avoid token overflow.**
- **Limit the total number of studyPoints to a maximum of 10.**

Please provide a comprehensive analysis in the following JSON format:
{
  "mainTopic": "Main topic of the content",
  "studyPoints": [
    {
      "title": "Key point title (Very Concise)",
      "description": "Detailed description (Max 3 concise sentences)",
      "importance": "high/medium/low",
      "memoryTip": "A single, highly useful, concise phrase or bulleted list of 2-3 critical keywords/facts from the point for rapid TNPSC review (e.g., '42 Amend-76, 51A, 10 duties')."
    }
  ],
  "summary": "Overall summary of the content (Max 3 concise sentences)",
  "tnpscRelevance": "How this content is relevant for TNPSC exams (concise)",
  "tnpscCategories": ["Category1", "Category2", ...],
  "difficulty": "easy/medium/hard"
}
... (rest of the prompt is unchanged) ...
`;

  const response = await fetch(getApiUrl(API_CONFIG.primaryModel), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
        response_mime_type: "application/json",
      }
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API Text Analysis error response:', errorText);
    throw new Error(`Gemini API Text Analysis error (${response.status}): ${errorText.substring(0, 200)}...`);
  }

  const data = await response.json();
  const result = processGeminiJSONResponse(data);
  return result;
};


// ========================================================================
// CORE FUNCTION: analyzeImage
// ========================================================================
export const analyzeImage = async (file: File, outputLanguage: "english" | "tamil" = "english"): Promise<AnalysisResult> => {
  const base64Image = await convertToBase64(file);
  
  // 1. ATTEMPT DIRECT IMAGE-TO-JSON ANALYSIS
  try {
    const languageInstruction = outputLanguage === "tamil" 
      ? "Please provide all responses in Tamil language. Use Tamil script for all content."
      : "Please provide all responses in English language.";

    const prompt = `
Analyze this image for TNPSC (Tamil Nadu Public Service Commission) exam preparation.
... (rest of the prompt is unchanged) ...
`;

    const response = await fetch(getApiUrl(API_CONFIG.primaryModel), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          { 
            parts: [
              { text: prompt },
              { inlineData: { mime_type: file.type, data: base64Image.split(',')[1] } }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
          response_mime_type: "application/json",
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error response (Direct Image Analysis):', errorText);

      if (response.status === 404) {
        throw new Error(`Model not found. The API model '${API_CONFIG.primaryModel}' is not available. Please check your API configuration or try updating the app.`);
      }

      throw new Error(`Gemini API error (${response.status}): ${errorText.substring(0, 200)}...`);
    }

    const data = await response.json();
    const result = processGeminiResponse(data); // Assuming processGeminiResponse handles multimodal in your original script
    return result;

  } catch (error) {
    // 2. CHECK FOR MAX_TOKENS ERROR
    const errorString = (error as Error).message;
    if (errorString.includes('MAX_TOKENS') || errorString.includes('Output truncated or malformed')) {
      console.warn('Direct image analysis failed with MAX_TOKENS or truncation. Falling back to OCR -> Analysis.');
      
      // 3. FALLBACK: OCR -> TEXT ANALYSIS
      try {
        const rawText = await extractRawTextFromImage(file);
        
        if (!rawText.trim()) {
            throw new Error('Fallback failed: Could not extract any text from the image.');
        }

        const data = await analyzeTextContent(rawText, outputLanguage);
        const result = processGeminiResponse(data);
        return result;

      } catch (fallbackError) {
        console.error('Error during OCR/Text Analysis Fallback:', fallbackError);
        throw new Error(`Analysis failed after fallback: ${(fallbackError as Error).message}`);
      }
    }
    
    console.error('Error analyzing image:', error);
    throw error;
  }
};

// ========================================================================
// REUSABLE HELPER: processGeminiResponse (Kept the original name/logic for consistency)
// NOTE: Assuming this is the existing helper that returns an AnalysisResult
// ========================================================================
const processGeminiResponse = (data: any): AnalysisResult => {
    // Using the robust helper for parsing
    const result = processGeminiJSONResponse(data, true);
    
    // CRITICAL: Generate a simple keyPoints array from the studyPoints titles/descriptions for AnalysisResult compatibility
    const generatedKeyPoints = (result.studyPoints || []).map((sp: any) => sp.title + (sp.description ? (": " + sp.description) : ""));
    
    return {
      // Return studyPoints as the primary analysis data
      studyPoints: result.studyPoints || [],
      // Re-use generated summary/relevance fields
      summary: result.summary || '',
      tnpscRelevance: result.tnpscRelevance || '',
      tnpscCategories: result.tnpscCategories || [],
      // Use the generated Key Points (titles/descriptions) for the separate keyPoints field
      keyPoints: generatedKeyPoints, 
      mainTopic: result.mainTopic || ''
    };
};


// ... (extractRawTextFromImage and createEnrichmentPrompt are unchanged) ...


// ========================================================================
// INTERNAL FUNCTION: OCR TEXT TO STRUCTURED QUESTIONS
// ========================================================================
const extractQuestionsFromText = async (ocrText: string, outputLanguage: "english" | "tamil"): Promise<any[]> => {
  const languageInstruction = outputLanguage === "tamil" 
    ? "Please provide all questions, options, and explanations in Tamil language. Use Tamil script."
    : "Please provide all content in English language.";

  const prompt = `
You are a highly accurate question paper extractor and parser.
Extract all questions, their options, and identify the correct answer key (A, B, C, or D) from the following raw OCR text.

... (rest of the prompt is unchanged) ...
`;

  const response = await fetch(getApiUrl(API_CONFIG.primaryModel), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3, // Low temperature for deterministic extraction
        maxOutputTokens: 4096,
        response_mime_type: "application/json",
      }
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API Extraction error response:', errorText);
    throw new Error(`Gemini API Extraction error (${response.status}): ${errorText.substring(0, 200)}...`);
  }

  const data = await response.json();
  const questions = processGeminiJSONResponse(data);
  
  if (!Array.isArray(questions)) {
    throw new Error('Structured question extraction failed to return a JSON array.');
  }

  return questions as any[];
};


// ========================================================================
// CORE FUNCTION: GENERATE QUESTIONS
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
      // ... (Existing extraction and mapping logic is fine) ...

      return {
        questions: enrichedQuestions,
        summary: `Extracted and structured ${enrichedQuestions.length} questions from the provided document.`,
        keyPoints: [],
        difficulty,
        totalQuestions: enrichedQuestions.length,
      };
    }

    // --- PATH 2: ORIGINAL FALLBACK LOGIC for generating questions from study materials ---
    // ... (Existing combinedContent logic is fine) ...

    const response = await fetch(getApiUrl(API_CONFIG.primaryModel), {
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
      const errorText = await response.text();
      console.error('Gemini API error response:', errorText);

      if (response.status === 404) {
        throw new Error(`Model not found. The API model '${API_CONFIG.primaryModel}' is not available. Please check your API configuration or try updating the app.`);
      }

      throw new Error(`Gemini API error (${response.status}): ${errorText.substring(0, 200)}...`);
    }

    const data = await response.json();
    const questions = processGeminiJSONResponse(data);

    if (!Array.isArray(questions)) {
        throw new Error('Question generation failed to return a JSON array of questions.');
    }
    
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


// ... (generatePageAnalysis and analyzePdfContentComprehensive are largely unchanged, but should use processGeminiJSONResponse) ...


// ========================================================================
// CORE FUNCTION: analyzePdfContent (The main target of the fix)
// ========================================================================
export const analyzePdfContent = async (
  textContent: string,
  outputLanguage: "english" | "tamil" = "english"
): Promise<AnalysisResult> => {
  try {
    const languageInstruction = outputLanguage === "tamil" 
      ? "Please provide all responses in Tamil language. Use Tamil script for all content."
      : "Please provide all responses in English language.";

    const prompt = `
Analyze this PDF text content for TNPSC (Tamil Nadu Public Service Commission) exam preparation:
... (rest of the prompt is unchanged) ...
`;

    const response = await fetch(getApiUrl(API_CONFIG.primaryModel), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 3000, // INCREASED FOR ROBUSTNESS
          response_mime_type: "application/json",
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error response:', errorText);

      if (response.status === 404) {
        throw new Error(`Model not found. The API model '${API_CONFIG.primaryModel}' is not available. Please check your API configuration or try updating the app.`);
      }

      throw new Error(`Gemini API error (${response.status}): ${errorText.substring(0, 200)}...`);
    }

    const data = await response.json();
    // Use the robust processing helper
    const result = processGeminiJSONResponse(data);
    
    return {
      keyPoints: result.keyPoints || [],
      summary: result.summary || '',
      tnpscRelevance: result.tnpscRelevance || '',
      studyPoints: result.studyPoints || [],
      tnpscCategories: result.tnpscCategories || [],
      mainTopic: result.mainTopic || '',
      language: outputLanguage,
    };
  } catch (error) {
    console.error('Error analyzing PDF content:', error);
    throw error;
  }
};


// ... (analyzeIndividualPage and other functions are largely unchanged) ...