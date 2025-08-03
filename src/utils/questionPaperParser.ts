// src/services/questionPaperParser.ts

import { Question } from "@/types/admin";

/**
 * Parses OCR text from a question paper. This version is more robust
 * against common OCR formatting errors.
 */
export const parseQuestionPaperOcr = (ocrText: string): Question[] => {
  try {
    const questionBlocks = splitIntoQuestionBlocks(ocrText);
    const questions: Question[] = [];

    for (const block of questionBlocks) {
      const parsedQuestion = parseQuestionBlock(block);
      if (parsedQuestion) {
        questions.push(parsedQuestion);
      }
    }

    console.log(`[Parser] Successfully parsed ${questions.length} questions from OCR text.`);
    const validatedQuestions = validateQuestionData(questions);
    console.log(`[Parser] After validation, ${validatedQuestions.length} questions remain.`);

    return validatedQuestions;
  } catch (error) {
    console.error('[Parser] A critical error occurred during parsing:', error);
    return [];
  }
};

/**
 * Splits the OCR text into blocks, each containing one question.
 * This is the most critical step.
 */
function splitIntoQuestionBlocks(ocrText: string): string[] {
  // This regex is crucial. It looks for a number (e.g., "1.", "2)") that is either
  // at the start of the file or at the beginning of a new line.
  const questionStartRegex = /(?:\n|^)\s*(\d+)\s*[.)]/g;

  const blocks: string[] = [];
  let lastIndex = 0;
  let match;
  const startMarkers: number[] = [];

  // First, find all potential question start indices
  while ((match = questionStartRegex.exec(ocrText)) !== null) {
    startMarkers.push(match.index);
  }

  if (startMarkers.length === 0) {
    console.warn("[Parser] No question start markers (e.g., '1.', '2.') found. The document format may be unsupported.");
    return [];
  }

  // Create blocks from the text between the markers
  for (let i = 0; i < startMarkers.length; i++) {
    const start = startMarkers[i];
    const end = i + 1 < startMarkers.length ? startMarkers[i + 1] : ocrText.length;
    const blockText = ocrText.substring(start, end).trim();

    if (blockText.length > 20) { // Filter out empty or tiny blocks
      blocks.push(blockText);
    }
  }
  
  console.log(`[Parser] Split OCR text into ${blocks.length} potential question blocks.`);
  return blocks;
}

/**
 * Parses a single block of text to extract a full Question object.
 */
function parseQuestionBlock(block: string): Question | null {
  // Find the positions of English and Tamil options first. This helps determine
  // where the question text ends and options begin.
  const englishOptionsMatch = findOptions(block, /[A-D][.)]/g);
  const tamilOptionsMatch = findOptions(block, /[அ-ஈ][.)]/g);

  // If no options are found, it's not a valid MCQ block.
  if (englishOptionsMatch.options.length < 2) {
    return null;
  }

  // The question text is everything before the first option.
  const endOfQuestionIndex = englishOptionsMatch.firstOptionIndex;
  const questionText = block.substring(0, endOfQuestionIndex).trim();

  const englishQuestion = extractQuestionText(questionText, 'english');
  const tamilQuestion = extractQuestionText(questionText, 'tamil');

  // Now, find the answer
  const answer = findCorrectAnswer(block);

  // Final validation: we need the core components to create a question.
  if (!englishQuestion || englishOptionsMatch.options.length < 2 || !answer) {
    return null;
  }

  return {
    question: englishQuestion,
    options: englishOptionsMatch.options,
    answer: answer,
    type: "mcq",
    difficulty: "medium", // Default difficulty
    tnpscGroup: "Group 1", // Default group
    explanation: "", // Default empty explanation
    tamilQuestion: tamilQuestion || undefined,
    tamilOptions: tamilOptionsMatch.options.length > 0 ? tamilOptionsMatch.options : undefined,
  };
}

// --- HELPER FUNCTIONS ---

/**
 * Generic function to find and extract options (both English and Tamil).
 */
function findOptions(block: string, regex: RegExp): { options: string[], firstOptionIndex: number } {
  const options: string[] = [];
  let match;
  let firstOptionIndex = block.length;

  while ((match = regex.exec(block)) !== null) {
    if (match.index < firstOptionIndex) {
      firstOptionIndex = match.index;
    }
    // Find the text for this option
    const nextOptionMatch = regex.exec(block);
    const endOfOption = nextOptionMatch ? nextOptionMatch.index : block.length;
    
    // Reset regex index for next iteration
    regex.lastIndex = match.index + 1;

    let optionText = block.substring(match.index, endOfOption)
      .replace(match[0], '') // Remove the option marker (e.g., "A)")
      .replace(/[\n\r]/g, ' ') // Replace newlines with spaces
      .trim();

    // Clean up checkmark artifacts
    optionText = optionText.replace(/[✓√]/g, '').trim();

    if (optionText) {
      options.push(optionText);
    }
  }

  return { options, firstOptionIndex };
}

/**
 * Extracts either English or Tamil text from a string block.
 */
function extractQuestionText(text: string, language: 'english' | 'tamil'): string | null {
  const englishRegex = /[a-zA-Z]/;
  const tamilRegex = /[\u0B80-\u0BFF]/;
  
  const lines = text.split('\n').filter(line => {
    const targetRegex = language === 'english' ? englishRegex : tamilRegex;
    const oppositeRegex = language === 'english' ? tamilRegex : englishRegex;
    // Keep line if it has target language and NOT the opposite language
    // This helps separate mixed-language lines
    return targetRegex.test(line) && !oppositeRegex.test(line);
  });
  
  const result = lines.join(' ').replace(/^\d+\s*[.)]/, '').trim();
  return result.length > 5 ? result : null;
}

/**
 * Finds the correct answer by looking for checkmarks or keywords.
 * BUG FIX: Returns null instead of [] on failure.
 */
function findCorrectAnswer(block: string): string | null {
  // Pattern: Look for an option letter (A, B, C, D) that is near a checkmark.
  const checkmarkPattern = /\s*\(?([A-D])\)?\s*.*[✓√]/;
  const lines = block.split('\n');

  for (const line of lines) {
    const match = line.match(checkmarkPattern);
    if (match && match[1]) {
      return match[1].toUpperCase();
    }
  }

  // Fallback: Look for "Answer: A"
  const explicitAnswerPattern = /(?:Answer|Ans|விடை)\s*[:]?\s*\(?([A-D])\)?/i;
  const blockMatch = block.match(explicitAnswerPattern);
  if (blockMatch && blockMatch[1]) {
    return blockMatch[1].toUpperCase();
  }

  return null; // CRITICAL FIX: Return null if no answer is found
}

/**
 * Final validation to ensure data quality before it's used.
 */
export const validateQuestionData = (questions: Question[]): Question[] => {
  return questions.filter(q => 
    q.question &&
    q.question.length >= 10 &&
    q.options &&
    q.options.length >= 2 && // Usually 4, but let's be flexible
    q.answer &&
    ['A', 'B', 'C', 'D'].includes(q.answer)
  );
};