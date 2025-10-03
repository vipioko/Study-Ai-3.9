import { AnalysisResult, QuestionResult } from "@/components/StudyAssistant";
import { extractTextFromPdfPage } from "@/utils/pdfReader";
import { parseQuestionPaperOcr } from "@/utils/questionPaperParser";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyDQcwO_13vP_dXB3OXBuTDvYfMcLXQIfkM";

const API_CONFIG = {
  primaryModel: "gemini-1.5-flash",
  fallbackModels: ["gemini-1.5-flash-001", "gemini-pro-vision"],
  apiVersion: "v1beta",
  baseUrl: "https://generativelanguage.googleapis.com"
};

const getApiUrl = (model: string) => {
  return `${API_CONFIG.baseUrl}/${API_CONFIG.apiVersion}/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
};

const estimateTokenCount = (text: string): number => {
  return Math.ceil(text.length / 4);
};

const validateContentSize = (text: string, maxTokens: number = 6000): { isValid: boolean; tokenEstimate: number } => {
  const tokenEstimate = estimateTokenCount(text);
  return {
    isValid: tokenEstimate <= maxTokens,
    tokenEstimate
  };
};

const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const errorMessage = lastError.message.toLowerCase();

      if (errorMessage.includes('max_tokens') && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`Attempt ${attempt + 1} failed with MAX_TOKENS. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error('Retry failed');
};

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

Focus on:
- TNPSC Group 1, 2, 4 exam relevance
- Extracting specific facts, figures, names, dates, and definitions
- Make key points factual and specific from the actual content

MEMORY TIP GUIDELINES:
- **CRITICAL: The tip must synthesize the point into a very short, memorable TNPSC-relevant summary (keywords, dates, articles).**
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
  return data;
};


export const analyzeImage = async (file: File, outputLanguage: "english" | "tamil" = "english"): Promise<AnalysisResult> => {
  const base64Image = await convertToBase64(file);
  
  try {
    const languageInstruction = outputLanguage === "tamil" 
      ? "Please provide all responses in Tamil language. Use Tamil script for all content."
      : "Please provide all responses in English language.";

    const prompt = `
Analyze this image for TNPSC (Tamil Nadu Public Service Commission) exam preparation.

${languageInstruction}

Content: (The image)

CRITICAL INSTRUCTIONS:
- Extract ONLY specific, factual, and concrete information directly from the content
- DO NOT include generic statements about importance or what needs to be studied
- Focus on actual facts: names, dates, events, definitions, processes, figures, laws, etc.
- Provide practical memory tips for each study point to help with retention
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

Focus on:
- TNPSC Group 1, 2, 4 exam relevance
- Extracting specific facts, figures, names, dates, and definitions
- Make key points factual and specific from the actual content

MEMORY TIP GUIDELINES:
- **CRITICAL: The tip must synthesize the point into a very short, memorable TNPSC-relevant summary (keywords, dates, articles).**
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
    const result = processGeminiResponse(data);
    return result;

  } catch (error) {
    const errorString = (error as Error).message;
    if (errorString.includes('MAX_TOKENS') || errorString.includes('Output truncated or malformed')) {
      console.warn('Direct image analysis failed with MAX_TOKENS or truncation. Falling back to OCR -> Analysis.');
      
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

const processGeminiResponse = (data: any): AnalysisResult => {
    const candidates = data.candidates;
    
    if (!candidates || candidates.length === 0) {
      const promptFeedback = data.promptFeedback;
      let errorMessage = 'No content or candidates received from Gemini API.';

      if (promptFeedback) {
        if (promptFeedback.blockReason === 'SAFETY') {
          errorMessage = `Request blocked due to safety settings. Please check the image content. Safety Ratings: ${JSON.stringify(promptFeedback.safetyRatings, null, 2)}`;
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
          const safetyMessage = `Candidate blocked due to safety settings. Please modify the image or prompt. Safety Ratings: ${JSON.stringify(candidate.safetyRatings, null, 2)}`;
          console.error(safetyMessage, candidate.safetyRatings);
          throw new Error(safetyMessage);
      }
      
      throw new Error(`No final content received from Gemini API. Finish reason: ${finishReason || 'UNKNOWN'}`);
    }

    console.log('Raw Gemini response:', content);

    const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
    
    if (!cleanedContent.startsWith('{') || !cleanedContent.endsWith('}')) {
        console.error('Raw content is not valid JSON:', cleanedContent);
        throw new Error(`Gemini API returned non-JSON data. Output truncated or malformed (Finish Reason: ${finishReason || 'N/A'}): ${cleanedContent.substring(0, 200)}...`);
    }
    
    try {
        const result = JSON.parse(cleanedContent);
        const generatedKeyPoints = (result.studyPoints || []).map((sp: any) => sp.title + (sp.description ? (": " + sp.description) : ""));
        
        return {
          studyPoints: result.studyPoints || [],
          summary: result.summary || '',
          tnpscRelevance: result.tnpscRelevance || '',
          tnpscCategories: result.tnpscCategories || [],
          keyPoints: generatedKeyPoints, 
          mainTopic: result.mainTopic || ''
        };
    } catch (parseError) {
        console.error("Failed to parse JSON from processGeminiResponse:", cleanedContent);
        throw new Error(`The model returned a malformed JSON response that could not be parsed. (Finish Reason: ${finishReason || 'N/A'})`);
    }
};

export const extractRawTextFromImage = async (file: File): Promise<string> => {
  try {
    const base64Image = await convertToBase64(file);

    const prompt = `Extract all text from this image. Provide only the raw, unformatted text content exactly as it appears. Do not add any formatting, analysis, or extra characters.`;

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
          temperature: 0.1,
          maxOutputTokens: 4096,
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
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      const finishReason = data.candidates?.[0]?.finishReason;
      throw new Error(`No content received from Gemini API during text extraction. Finish reason: ${finishReason || 'UNKNOWN'}`);
    }

    console.log('Raw OCR text extracted (first 200 chars):', content.substring(0, 200) + '...');
    return content.trim();
  } catch (error) {
    console.error('Error extracting raw text from image:', error);
    throw error;
  }
};

const extractQuestionsFromText = async (ocrText: string, outputLanguage: "english" | "tamil"): Promise<any[]> => {
  const languageInstruction = outputLanguage === "tamil" 
    ? "Please provide all questions, options, and explanations in Tamil language. Use Tamil script."
    : "Please provide all content in English language.";

  const prompt = `
You are a highly accurate question paper extractor and parser.
Extract all questions, their options, and identify the correct answer key (A, B, C, or D) from the following raw OCR text.

${languageInstruction}

OCR Text to Parse:
---
${ocrText.substring(0, 12000)} 
---

CRITICAL INSTRUCTIONS:
- You MUST return a JSON array containing ONLY the extracted question objects.
- Do NOT add any extra commentary or text outside the JSON block.
- For each question, infer the correct answer (A, B, C, or D) based on common knowledge/context.
- You MUST provide a short explanation for the correct answer.
- Assign a difficulty level and TNPSC Group based on the content.

Return as a JSON array with this exact structure (max 15 questions):
[
  {
    "question": "Question text here (both English and Tamil if available)",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "A",
    "type": "mcq",
    "difficulty": "medium",
    "tnpscGroup": "Group 1",
    "explanation": "Brief explanation of the answer"
  }
]
`;

  const response = await fetch(getApiUrl(API_CONFIG.primaryModel), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192,
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
  const candidate = data.candidates?.[0];
  const content = candidate?.content?.parts?.[0]?.text;
  
  if (!content) {
      const finishReason = candidate?.finishReason || data?.promptFeedback?.blockReason;
      throw new Error(`No content received from Gemini API during structured extraction. Finish Reason: ${finishReason}`);
  }

  const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();

  try {
    return JSON.parse(cleanedContent) as any[];
  } catch (error) {
    console.error("Failed to parse JSON from structured extraction:", cleanedContent);
    const finishReason = candidate?.finishReason;
    if (finishReason === 'MAX_TOKENS') {
      throw new Error('Response exceeded token limit, resulting in incomplete JSON. The content is too large.');
    }
    throw new Error(`The model returned a malformed JSON response during question extraction. Raw response snippet: ${cleanedContent.substring(0, 300)}...`);
  }
};


export const generateQuestions = async (
  analysisResults: AnalysisResult[],
  difficulty: string = "medium",
  outputLanguage: "english" | "tamil" = "english",
  fullOcrText?: string
): Promise<QuestionResult> => {
  try {
    if (fullOcrText) {
      console.log("Starting Step 1: Extracting questions from OCR text (Client-side parser)...");
      let extractedQuestions = await parseQuestionPaperOcr(fullOcrText);
      console.log(`Extraction complete. Found ${extractedQuestions.length} questions.`);

      if (!extractedQuestions || extractedQuestions.length === 0) {
        console.warn("Client-side parser failed. Falling back to Gemini for structured question extraction.");
        extractedQuestions = await extractQuestionsFromText(fullOcrText, outputLanguage);
        console.log(`Gemini Extraction complete. Found ${extractedQuestions.length} questions.`);
        
        if (!extractedQuestions || extractedQuestions.length === 0) {
            throw new Error("Extraction resulted in zero questions. The document might not be a question paper or the text is unreadable.");
        }
      }

      const enrichedQuestions = extractedQuestions.map(q => ({
          ...q,
          type: q.type || "mcq", 
          difficulty: q.difficulty || "medium", 
          explanation: q.explanation || "", 
          tnpscGroup: q.tnpscGroup || "Group 1",
      }));

      return {
        questions: enrichedQuestions,
        summary: `Extracted and structured ${enrichedQuestions.length} questions from the provided document.`,
        keyPoints: [],
        difficulty,
        totalQuestions: enrichedQuestions.length,
      };
    }

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

    const response = await fetch(getApiUrl(API_CONFIG.primaryModel), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: generationPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
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
    const candidate = data?.candidates?.[0];
    const content = candidate?.content?.parts?.[0]?.text;
    const finishReason = candidate?.finishReason;

    if (!content) {
      if (finishReason === 'MAX_TOKENS') {
        throw new Error('Response exceeded token limit. The content is too large. Try analyzing a smaller page range.');
      }
      throw new Error(`No content received from Gemini API during question generation (reason: ${finishReason || 'unknown'})`);
    }

    const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
    let questions;
    
    try {
      questions = JSON.parse(cleanedContent);
    } catch (error) {
      console.error('Error parsing generated questions JSON:', error);
      console.error('Raw content that failed parsing:', cleanedContent);
      if (finishReason === 'MAX_TOKENS') {
         throw new Error('Response exceeded token limit, resulting in incomplete JSON. The content is too large. Try analyzing a smaller page range.');
      }
      throw new Error(`The model returned a malformed JSON response during question generation. This can happen if the response was cut off. Raw response snippet: ${cleanedContent.substring(0, 300)}...`);
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

export const generatePageAnalysis = async (
  file: File,
  pageNumber: number,
  outputLanguage: "english" | "tamil" = "english"
): Promise<{
  page: number;
  keyPoints: string[];
  studyPoints: Array<{
    title: string;
    description: string;
    importance: "high" | "medium" | "low";
    memoryTip: string;
  }>;
  summary: string;
  importance: "high" | "medium" | "low";
  tnpscRelevance: string;
}> => {
  try {
    const textContent = await extractTextFromPdfPage(file, pageNumber);
    
    if (!textContent.trim()) {
      throw new Error('No text content found on this page');
    }

    const languageInstruction = outputLanguage === "tamil" 
      ? "Please provide all responses in Tamil language."
      : "Please provide all responses in English language.";

    const prompt = `
Analyze this PDF page content for TNPSC exam preparation:

${languageInstruction}

Content: ${textContent}

Please provide analysis in JSON format:
{
CRITICAL INSTRUCTIONS:
- Extract ONLY specific, factual, and concrete information directly from the content
- DO NOT include generic statements about importance or what needs to be studied
- Focus on actual facts: names, dates, events, definitions, processes, figures, laws, etc.
- Provide practical memory tips for each study point to help with retention

  "keyPoints": ["Specific factual point 1", "Specific factual point 2", ...],
  "summary": "Brief summary of the page content",
  "importance": "high/medium/low",
  "tnpscRelevance": "How this content relates to TNPSC exams",
  "studyPoints": [
    {
      "title": "Study point title",
      "description": "Detailed description",
      "importance": "high/medium/low",
      "memoryTip": "Creative and memorable tip using mnemonics, visual associations, stories, or patterns"
    }
  ]
}

Focus on:
- TNPSC exam relevance
- Extracting specific facts, names, dates, and concrete information
- Key information for study
- Make key points factual and specific from the actual content
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
          maxOutputTokens: 1500,
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
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error('No content received from Gemini API');
    }

    // Robust JSON cleaning and parsing with fallback
    let cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
    
    // Remove any leading/trailing non-JSON content
    const jsonStart = cleanedContent.indexOf('{');
    const jsonEnd = cleanedContent.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleanedContent = cleanedContent.substring(jsonStart, jsonEnd + 1);
    }
    
    // Fix common JSON issues
    cleanedContent = cleanedContent
      .replace(/,\s*}/g, '}')  // Remove trailing commas before }
      .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
      .replace(/([^\\])\\([^"\\\/bfnrt])/g, '$1\\\\$2')  // Fix unescaped backslashes
      .replace(/\n/g, '\\n')   // Escape newlines in strings
      .replace(/\r/g, '\\r')   // Escape carriage returns
      .replace(/\t/g, '\\t');  // Escape tabs
    
    let analysis;
    try {
      analysis = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.warn(`JSON parse failed for page ${pageNumber}, attempting fallback parsing:`, parseError);
      
      // Fallback: try to extract key fields manually
      const keyPointsMatch = cleanedContent.match(/"keyPoints"\s*:\s*\[(.*?)\]/s);
      const studyPointsMatch = cleanedContent.match(/"studyPoints"\s*:\s*\[(.*?)\]/s);
      const summaryMatch = cleanedContent.match(/"summary"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
      const tnpscRelevanceMatch = cleanedContent.match(/"tnpscRelevance"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
      const importanceMatch = cleanedContent.match(/"importance"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
      
      analysis = {
        keyPoints: keyPointsMatch ? 
          keyPointsMatch[1].split(',').map(s => s.trim().replace(/^"|"$/g, '')) : [],
        studyPoints: studyPointsMatch ? [] : [], // Complex object, skip for now
        summary: summaryMatch ? summaryMatch[1].replace(/\\n/g, '\n') : 'Analysis completed with fallback parsing',
        tnpscRelevance: tnpscRelevanceMatch ? tnpscRelevanceMatch[1].replace(/\\n/g, '\n') : 'TNPSC relevant content analyzed',
        importance: importanceMatch ? importanceMatch[1] : 'medium'
      };
    }

    return {
      page: pageNumber,
      keyPoints: analysis.keyPoints || [],
      studyPoints: analysis.studyPoints || [],
      summary: analysis.summary || '',
      importance: analysis.importance || 'medium',
      tnpscRelevance: analysis.tnpscRelevance || ''
    };
  } catch (error) {
    console.error('Error analyzing page:', error);
    throw error;
  }
};

export const analyzePdfContentComprehensive = async (
  textContent: string,
  outputLanguage: "english" | "tamil" = "english"
): Promise<{
  pageAnalyses: Array<{
    pageNumber: number;
    keyPoints: string[];
    studyPoints: Array<{
      title: string;
      description: string;
      importance: "high" | "medium" | "low";
      tnpscRelevance: string;
    }>;
    summary: string;
    tnpscRelevance: string;
  }>;
  overallSummary: string;
  totalKeyPoints: string[];
  tnpscCategories: string[];
}> => {
  try {
    const pageAnalyses = [];
    const allKeyPoints: string[] = [];
    const allCategories: string[] = [];
    
    // Extract individual pages from the OCR text
    const pageRegex = /==Start of OCR for page (\d+)==([\s\S]*?)==End of OCR for page \1==/g;
    const pageMatches = Array.from(textContent.matchAll(pageRegex));
    
    console.log(`Found ${pageMatches.length} pages to analyze`);
    
    // Process pages in batches to avoid API limits
    const batchSize = 5;
    for (let i = 0; i < pageMatches.length; i += batchSize) {
      const batch = pageMatches.slice(i, i + batchSize);
      
      for (const match of batch) {
        const pageNumber = parseInt(match[1], 10);
        const pageContent = match[2].trim();
        
        if (pageContent.length < 50) continue; // Skip pages with minimal content
        
        const languageInstruction = outputLanguage === "tamil" 
          ? "Please provide all responses in Tamil language."
          : "Please provide all responses in English language.";

        const prompt = `
Analyze this PDF page content for TNPSC exam preparation:

${languageInstruction}

Page ${pageNumber} Content: ${pageContent.substring(0, 4000)}

Please provide analysis in JSON format:
{
CRITICAL INSTRUCTIONS:
- Extract ONLY specific, factual, and concrete information directly from the content
- DO NOT include generic statements about importance or what needs to be studied
- Focus on actual facts: names, dates, events, definitions, processes, figures, laws, etc.
- Provide practical memory tips for each study point to help with retention

CRITICAL INSTRUCTIONS:
- Extract ONLY specific, factual, and concrete information directly from the content
- DO NOT include generic statements about importance or what needs to be studied
- Focus on actual facts: names, dates, events, definitions, processes, figures, laws, etc.
- Provide practical memory tips for each study point to help with retention

  "keyPoints": ["Short crisp key point 1", "Short crisp key point 2", "Short crisp key point 3", "Short crisp key point 4", "Short crisp key point 5"],
  "studyPoints": [
    {
      "title": "Study point title",
      "description": "Detailed description",
      "importance": "high/medium/low",
          "memoryTip": "Creative and memorable tip using mnemonics, visual associations, stories, or patterns"
    }
  ],
  "summary": "Brief summary of the page content",
  "tnpscRelevance": "How this content relates to TNPSC exams",
  "tnpscCategories": ["Category1", "Category2"]
}

Focus on:
- Extract at least 5 short crisp key points per page for easy memorization
- TNPSC exam relevance
- Important facts and concepts
- Key information for study
- Provide excellent memory tips for each study point

MEMORY TIP GUIDELINES:
- Use acronyms, rhymes, visual imagery, or story-based associations
- Connect facts to familiar concepts or create memorable patterns
- Use number patterns, word associations, or logical sequences
- Make tips fun, quirky, and unforgettable
`;

        try {
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
                maxOutputTokens: 2000,
                response_mime_type: "application/json",
              }
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to analyze page ${pageNumber}:`, errorText);

            if (response.status === 404) {
              console.error(`Model not found for page ${pageNumber}. Using primary model: '${API_CONFIG.primaryModel}'`);
            }

            continue;
          }

          const data = await response.json();
          const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
          
          if (!content) {
            console.error(`No content received for page ${pageNumber}`);
            continue;
          }

          // Robust JSON cleaning and parsing with fallback
          let cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
          
          // Remove any leading/trailing non-JSON content
          const jsonStart = cleanedContent.indexOf('{');
          const jsonEnd = cleanedContent.lastIndexOf('}');
          
          if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            cleanedContent = cleanedContent.substring(jsonStart, jsonEnd + 1);
          }
          
          // Fix common JSON issues
          cleanedContent = cleanedContent
            .replace(/,\s*}/g, '}')  // Remove trailing commas before }
            .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
            .replace(/([^\\])\\([^"\\\/bfnrt])/g, '$1\\\\$2')  // Fix unescaped backslashes
            .replace(/\n/g, '\\n')   // Escape newlines in strings
            .replace(/\r/g, '\\r')   // Escape carriage returns
            .replace(/\t/g, '\\t');  // Escape tabs
          
          let analysis;
          try {
            analysis = JSON.parse(cleanedContent);
          } catch (parseError) {
            console.warn(`JSON parse failed for page ${pageNumber}, attempting fallback parsing:`, parseError);
            
            // Fallback: try to extract key fields manually
            const keyPointsMatch = cleanedContent.match(/"keyPoints"\s*:\s*\[(.*?)\]/s);
            const studyPointsMatch = cleanedContent.match(/"studyPoints"\s*:\s*\[(.*?)\]/s);
            const summaryMatch = cleanedContent.match(/"summary"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
            const tnpscRelevanceMatch = cleanedContent.match(/"tnpscRelevance"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
            const tnpscCategoriesMatch = cleanedContent.match(/"tnpscCategories"\s*:\s*\[(.*?)\]/s);
            
            analysis = {
              keyPoints: keyPointsMatch ? 
                keyPointsMatch[1].split(',').map(s => s.trim().replace(/^"|"$/g, '')) : [],
              studyPoints: studyPointsMatch ? [] : [], // Complex object, skip for now
              summary: summaryMatch ? summaryMatch[1].replace(/\\n/g, '\n') : 'Analysis completed with fallback parsing',
              tnpscRelevance: tnpscRelevanceMatch ? tnpscRelevanceMatch[1].replace(/\\n/g, '\n') : 'TNPSC relevant content analyzed',
              tnpscCategories: tnpscCategoriesMatch ? 
                tnpscCategoriesMatch[1].split(',').map(s => s.trim().replace(/^"|"$/g, '')) : []
            };
          }
          
          pageAnalyses.push({
            pageNumber,
            keyPoints: analysis.keyPoints || [],
            studyPoints: analysis.studyPoints || [],
            summary: analysis.summary || '',
            tnpscRelevance: analysis.tnpscRelevance || ''
          });
          
          allKeyPoints.push(...(analysis.keyPoints || []));
          allCategories.push(...(analysis.tnpscCategories || []));
          
        } catch (error) {
          console.error(`Error analyzing page ${pageNumber}:`, error);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Generate overall summary
    const overallSummary = `Comprehensive analysis of ${pageAnalyses.length} pages with ${allKeyPoints.length} total key points identified.`;
    
    return {
      pageAnalyses,
      overallSummary,
      totalKeyPoints: allKeyPoints,
      tnpscCategories: [...new Set(allCategories)]
    };
  } catch (error) {
    console.error('Error in comprehensive PDF analysis:', error);
    throw error;
  }
};

export const analyzePdfContent = async (
  textContent: string,
  outputLanguage: "english" | "tamil" = "english"
): Promise<AnalysisResult> => {
  return retryWithBackoff(async () => {
    try {
      const validation = validateContentSize(textContent, 8000);
      if (!validation.isValid) {
        console.warn(`Content size (${validation.tokenEstimate} tokens) exceeds recommended limit. Truncating to 8000 characters.`);
      }

      const languageInstruction = outputLanguage === "tamil"
        ? "Please provide all responses in Tamil language. Use Tamil script for all content."
        : "Please provide all responses in English language.";

    const contentToAnalyze = textContent.substring(0, 8000);
    const prompt = `
Analyze this PDF text content for TNPSC (Tamil Nadu Public Service Commission) exam preparation:

${languageInstruction}

Content: ${contentToAnalyze}

Please provide a comprehensive analysis in the following JSON format:
{
CRITICAL INSTRUCTIONS:
- Extract ONLY specific, factual, and concrete information directly from the content
- DO NOT include generic statements about importance or what needs to be studied
- Focus on actual facts: names, dates, events, definitions, processes, figures, laws, etc.
- Provide practical memory tips for each study point to help with retention

  "mainTopic": "Main topic of the content",
  "studyPoints": [
    {
      "title": "Key point title",
      "description": "Detailed description",
      "importance": "high/medium/low",
      "memoryTip": "Creative and memorable tip using mnemonics, visual associations, stories, or patterns"
    }
  ],
  "keyPoints": ["Specific factual point 1", "Specific factual point 2", ...],
  "summary": "Overall summary of the content",
  "tnpscRelevance": "How this content is relevant for TNPSC exams",
  "tnpscCategories": ["Category1", "Category2", ...],
  "difficulty": "easy/medium/hard"
}

Focus on:
- TNPSC Group 1, 2, 4 exam relevance
- Extracting specific facts, figures, names, dates, and definitions
- Important dates, names, places
- Conceptual understanding
- Application in exam context
- Make key points factual and specific from the actual content
- Provide creative memory tips using mnemonics, associations, or patterns

MEMORY TIP GUIDELINES:
- Use acronyms, rhymes, visual imagery, or story-based associations
- Connect facts to familiar concepts or create memorable patterns
- Use number patterns, word associations, or logical sequences
- Make tips fun, quirky, and unforgettable
- Examples: "Remember VIBGYOR for rainbow colors" or "My Very Educated Mother Just Served Us Nachos for planets"
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
          maxOutputTokens: 4096,
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
    const candidate = data?.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const content = Array.isArray(parts)
      ? parts.map((p: any) => (typeof p?.text === 'string' ? p.text : '')).filter(Boolean).join('\n').trim()
      : '';
    
    if (!content) {
      const finishReason = candidate?.finishReason || data?.promptFeedback?.blockReason || 'unknown';
      const safety = candidate?.safetyRatings ? JSON.stringify(candidate.safetyRatings) : undefined;
      throw new Error(`No content received from Gemini API (reason: ${finishReason}${safety ? `, safety: ${safety}` : ''})`);
    }

    console.log('Raw PDF analysis response:', content);

    // Robust JSON cleaning and parsing with fallback
    let cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
    
    // Remove any leading/trailing non-JSON content
    const jsonStart = cleanedContent.indexOf('{');
    const jsonEnd = cleanedContent.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleanedContent = cleanedContent.substring(jsonStart, jsonEnd + 1);
    }
    
    // Fix common JSON issues
    cleanedContent = cleanedContent
      .replace(/,\s*}/g, '}')  // Remove trailing commas before }
      .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
      .replace(/([^\\])\\([^"\\\/bfnrt])/g, '$1\\\\$2')  // Fix unescaped backslashes
      .replace(/\n/g, '\\n')   // Escape newlines in strings
      .replace(/\r/g, '\\r')   // Escape carriage returns
      .replace(/\t/g, '\\t');  // Escape tabs
    
    let result;
    try {
      result = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.warn('JSON parse failed for PDF analysis, attempting fallback parsing:', parseError);
      
      // Fallback: try to extract key fields manually
      const keyPointsMatch = cleanedContent.match(/"keyPoints"\s*:\s*\[(.*?)\]/s);
      const studyPointsMatch = cleanedContent.match(/"studyPoints"\s*:\s*\[(.*?)\]/s);
      const summaryMatch = cleanedContent.match(/"summary"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
      const tnpscRelevanceMatch = cleanedContent.match(/"tnpscRelevance"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
      const tnpscCategoriesMatch = cleanedContent.match(/"tnpscCategories"\s*:\s*\[(.*?)\]/s);
      const mainTopicMatch = cleanedContent.match(/"mainTopic"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
      const difficultyMatch = cleanedContent.match(/"difficulty"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
      
      result = {
        keyPoints: keyPointsMatch ? 
          keyPointsMatch[1].split(',').map(s => s.trim().replace(/^"|"$/g, '')) : [],
        studyPoints: studyPointsMatch ? [] : [], // Complex object, skip for now
        summary: summaryMatch ? summaryMatch[1].replace(/\\n/g, '\n') : 'Analysis completed with fallback parsing',
        tnpscRelevance: tnpscRelevanceMatch ? tnpscRelevanceMatch[1].replace(/\\n/g, '\n') : 'TNPSC relevant content analyzed',
        tnpscCategories: tnpscCategoriesMatch ? 
          tnpscCategoriesMatch[1].split(',').map(s => s.trim().replace(/^"|"$/g, '')) : [],
        mainTopic: mainTopicMatch ? mainTopicMatch[1] : 'PDF Content Analysis',
        difficulty: difficultyMatch ? difficultyMatch[1] : 'medium'
      };
    }
    
      return {
        keyPoints: result.keyPoints || [],
        summary: result.summary || '',
        tnpscRelevance: result.tnpscRelevance || '',
        studyPoints: result.studyPoints || [],
        tnpscCategories: result.tnpscCategories || []
      };
    } catch (error) {
      console.error('Error analyzing PDF content:', error);
      throw error;
    }
  });
};

export const analyzeIndividualPage = async (
  textContent: string,
  pageNumber: number,
  outputLanguage: "english" | "tamil" = "english"
): Promise<{
  pageNumber: number;
  keyPoints: string[];
  studyPoints: Array<{
    title: string;
    description: string;
    importance: "high" | "medium" | "low";
    memoryTip: string;
  }>;
  summary: string;
  tnpscRelevance: string;
}> => {
  try {
    const languageInstruction = outputLanguage === "tamil" 
      ? "Please provide all responses in Tamil language."
      : "Please provide all responses in English language.";

    const prompt = `
Analyze this individual PDF page content for TNPSC exam preparation:

${languageInstruction}

Page ${pageNumber} Content: ${textContent.substring(0, 4000)}

Please provide detailed analysis in JSON format:
{
  "keyPoints": ["Specific factual point 1", "Specific factual point 2", "Specific factual point 3", "Specific factual point 4", "Specific factual point 5", "Specific factual point 6", "Specific factual point 7", "Specific factual point 8"],
  "studyPoints": [
    {
      "title": "Study point title",
      "description": "Detailed description",
      "importance": "high/medium/low",
      "memoryTip": "Creative and memorable tip using mnemonics, visual associations, stories, or patterns"
    }
  ],
  "summary": "Brief summary of the page content",
  "tnpscRelevance": "How this content relates to TNPSC exams"
}

Focus on:
- Extract at least 8 specific factual key points per page from the actual content
- Detailed study points with TNPSC relevance
- Specific facts, names, dates, and concrete information
- Key information for study
- Make key points factual and specific from the actual content
- Provide excellent memory tips for each study point

MEMORY TIP GUIDELINES:
- Use acronyms, rhymes, visual imagery, or story-based associations
- Connect facts to familiar concepts or create memorable patterns
- Use number patterns, word associations, or logical sequences
- Make tips fun, quirky, and unforgettable
- Definitions and explanations
- Statistical data and figures
- Historical context and significance
- Provide creative memory tips using mnemonics, associations, or patterns

MEMORY TIP GUIDELINES:
- Use acronyms, rhymes, visual imagery, or story-based associations
- Connect facts to familiar concepts or create memorable patterns
- Use number patterns, word associations, or logical sequences
- Make tips fun, quirky, and unforgettable
- Examples: "Remember VIBGYOR for rainbow colors" or "My Very Educated Mother Just Served Us Nachos for planets"
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
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      throw new Error('No content received from Gemini API');
    }

    // Robust JSON cleaning and parsing with fallback
    let cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
    
    // Remove any leading/trailing non-JSON content
    const jsonStart = cleanedContent.indexOf('{');
    const jsonEnd = cleanedContent.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleanedContent = cleanedContent.substring(jsonStart, jsonEnd + 1);
    }
    
    // Fix common JSON issues
    cleanedContent = cleanedContent
      .replace(/,\s*}/g, '}')  // Remove trailing commas before }
      .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
      .replace(/([^\\])\\([^"\\\/bfnrt])/g, '$1\\\\$2')  // Fix unescaped backslashes
      .replace(/\n/g, '\\n')   // Escape newlines in strings
      .replace(/\r/g, '\\r')   // Escape carriage returns
      .replace(/\t/g, '\\t');  // Escape tabs
    
    let analysis;
    try {
      analysis = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.warn(`JSON parse failed for page ${pageNumber}, attempting fallback parsing:`, parseError);
      
      // Fallback: try to extract key fields manually
      const keyPointsMatch = cleanedContent.match(/"keyPoints"\s*:\s*\[(.*?)\]/s);
      const studyPointsMatch = cleanedContent.match(/"studyPoints"\s*:\s*\[(.*?)\]/s);
      const summaryMatch = cleanedContent.match(/"summary"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
      const tnpscRelevanceMatch = cleanedContent.match(/"tnpscRelevance"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
      
      analysis = {
        keyPoints: keyPointsMatch ? 
          keyPointsMatch[1].split(',').map(s => s.trim().replace(/^"|"$/g, '')) : [],
        studyPoints: studyPointsMatch ? [] : [], // Complex object, skip for now
        summary: summaryMatch ? summaryMatch[1].replace(/\\n/g, '\n') : 'Analysis completed with fallback parsing',
        tnpscRelevance: tnpscRelevanceMatch ? tnpscRelevanceMatch[1].replace(/\\n/g, '\n') : 'TNPSC relevant content analyzed'
      };
    }
    
    return {
      pageNumber,
      keyPoints: analysis.keyPoints || [],
      studyPoints: analysis.studyPoints || [],
      summary: analysis.summary || '',
      tnpscRelevance: analysis.tnpscRelevance || ''
    };
  } catch (error) {
    console.error(`Error analyzing page ${pageNumber}:`, error);
    throw error;
  }
};

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
    
    const questionResult = await generateQuestions(analysisResults, difficulty, outputLanguage);
    return questionResult;
  } catch (error) {
    console.error('Error in analyzeMultipleImages:', error);
    throw error;
  }
};