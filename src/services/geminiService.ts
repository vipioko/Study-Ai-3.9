import { AnalysisResult, QuestionResult } from "@/components/StudyAssistant";
import { extractTextFromPdfPage, extractPageRangeFromOcr } from "@/utils/pdfReader";
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
- Extract ONLY specific, factual, and concrete information directly from the content
- DO NOT include generic statements about importance or what needs to be studied
- Focus on actual facts: names, dates, events, definitions, processes, figures, laws, etc.
- Provide practical memory tips for each study point to help with retention

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
              },
              {
                inline_data: {
                  mime_type: file.type,
                  data: base64Image.split(',')[1]
                }
              }
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

    console.log('Raw Gemini response:', content);

    // Clean and parse the JSON response
    const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const result = JSON.parse(cleanedContent);
    
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

// NEW FUNCTION: Extract raw text from image using Gemini
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
              {
                text: prompt
              },
              {
                inline_data: {
                  mime_type: file.type,
                  data: base64Image.split(',')[1]
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1, // Lower temperature for more deterministic output
          maxOutputTokens: 4096,
          // No response_mime_type for plain text output
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

    console.log('Raw OCR text extracted (first 200 chars):', content.substring(0, 200) + '...');
    return content.trim();
  } catch (error) {
    console.error('Error extracting raw text from image:', error);
    throw error;
  }
};


const createEnrichmentPrompt = (question: any, outputLanguage: "english" | "tamil" = "english") => {
  const languageInstruction = outputLanguage === "tamil" 
    ? "Please provide all responses in Tamil language."
    : "Please provide all responses in English language.";

  return `
You are enriching an extracted question from a TNPSC question paper. Your job is to add explanation and identify the TNPSC group.

${languageInstruction}

Question: ${question.question}
Options: ${question.options?.join(', ') || 'N/A'}
Answer: ${question.answer}

Please provide enrichment in this JSON format:
{
  "explanation": "Brief explanation of why this answer is correct",
  "tnpscGroup": "Group 1" | "Group 2" | "Group 4"
}

Focus on:
- Providing a clear, concise explanation
- Correctly identifying which TNPSC group this question belongs to
- Keep explanations educational and helpful for exam preparation
`;
};

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
      const extractedQuestions = await parseQuestionPaperOcr(fullOcrText);
      console.log(`Extraction complete. Found ${extractedQuestions.length} questions.`);

      if (!extractedQuestions || extractedQuestions.length === 0) {
        throw new Error("Extraction resulted in zero questions. The document might not be a question paper or the text is unreadable.");
      }

      // STEP 2: ENRICHMENT (in parallel)
      console.log("Starting Step 2: Enriching each question with explanations...");
      const enrichmentPromises = extractedQuestions.map(q => {
        const enrichmentPrompt = createEnrichmentPrompt(q, outputLanguage);
        
        return fetch(getApiUrl(API_CONFIG.primaryModel), {
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

    // --- PATH 2: ORIGINAL FALLBACK LOGIC for generating questions from study materials ---
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

export const generatePageAnalysis = async (
  file: File,
  pageNumber: number,
  outputLanguage: "english" | "tamil" = "english"
): Promise<{
  page: number;
  keyPoints: string[];
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

    const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const analysis = JSON.parse(cleanedContent);

    return {
      page: pageNumber,
      keyPoints: analysis.keyPoints || [],
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

          const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
          const analysis = JSON.parse(cleanedContent);
          
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
  try {
    const languageInstruction = outputLanguage === "tamil" 
      ? "Please provide all responses in Tamil language. Use Tamil script for all content."
      : "Please provide all responses in English language.";

    const prompt = `
Analyze this PDF text content for TNPSC (Tamil Nadu Public Service Commission) exam preparation.

${languageInstruction}

Content: ${textContent.substring(0, 8000)}

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
      "memoryTip": "Creative and memorable tip using mnemonics, visual associations, stories, or patterns that make this information stick in memory permanently"
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
          maxOutputTokens: 2048,
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

    console.log('Raw PDF analysis response:', content);

    const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const result = JSON.parse(cleanedContent);
    
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
      "memoryTip": "Creative and memorable tip using mnemonics, visual associations, stories, or patterns that make this information stick in memory permanently"
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

    const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const analysis = JSON.parse(cleanedContent);
    
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
