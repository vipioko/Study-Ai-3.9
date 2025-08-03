import { Question } from "@/types/admin";

/**
 * Parses OCR text from a TNPSC question paper and extracts questions deterministically.
 * This function acts as a "copier" rather than a "generator" - it extracts existing questions
 * from the OCR text without using AI to interpret or modify them.
 */
export const parseQuestionPaperOcr = (ocrText: string): Question[] => {
  const questions: Question[] = [];
  
  try {
    // Split the text into potential question blocks
    // Look for patterns like "1.", "2.", etc. followed by question content
    const questionBlocks = splitIntoQuestionBlocks(ocrText);
    
    for (const block of questionBlocks) {
      const parsedQuestion = parseQuestionBlock(block);
      if (parsedQuestion) {
        questions.push(parsedQuestion);
      }
    }
    
    console.log(`Parsed ${questions.length} questions from OCR text`);
    return questions;
  } catch (error) {
    console.error('Error parsing question paper OCR:', error);
    return [];
  }
};

/**
 * Splits the OCR text into individual question blocks
 */
function splitIntoQuestionBlocks(ocrText: string): string[] {
  // Pattern to match question numbers (1., 2., 3., etc.)
  const questionNumberPattern = /(?:^|\n)\s*(\d+)\s*\./gm;
  const blocks: string[] = [];
  
  let lastIndex = 0;
  let match;
  
  while ((match = questionNumberPattern.exec(ocrText)) !== null) {
    if (lastIndex > 0) {
      // Add the previous block
      const blockText = ocrText.substring(lastIndex, match.index);
      blocks.push(blockText.trim());
    }
    lastIndex = match.index;
  }
  
  // Add the last block
  if (lastIndex < ocrText.length) {
    const blockText = ocrText.substring(lastIndex);
    blocks.push(blockText.trim());
  }
  
  return blocks.filter(block => block.length > 10); // Filter out very short blocks
}

/**
 * Parses a single question block to extract question, options, and answer
 */
function parseQuestionBlock(block: string): Question | null {
  try {
    // Extract question number
    const questionNumberMatch = block.match(/^\s*(\d+)\s*\./);
    if (!questionNumberMatch) {
      return null;
    }
    
    const questionNumber = parseInt(questionNumberMatch[1]);
    
    // Extract English question (usually comes first)
    const englishQuestion = extractEnglishQuestion(block);
    if (!englishQuestion) {
      return null;
    }
    
    // Extract English options (A, B, C, D)
    const englishOptions = extractEnglishOptions(block);
    if (englishOptions.length < 2) {
      return null; // Need at least 2 options
    }
    
    // Extract Tamil question and options
    const tamilQuestion = extractTamilQuestion(block);
    const tamilOptions = extractTamilOptions(block);
    
    // Find the correct answer (look for checkmark ✓)
    const correctAnswer = findCorrectAnswer(block);
    if (!correctAnswer) {
      return null;
    }
    
    return {
      question: englishQuestion,
      options: englishOptions,
      answer: correctAnswer,
      type: "mcq",
      difficulty: "medium", // Default difficulty
      tnpscGroup: "Group 1", // Default group
      tamilQuestion: tamilQuestion || undefined,
      tamilOptions: tamilOptions.length > 0 ? tamilOptions : undefined
    };
  } catch (error) {
    console.error('Error parsing question block:', error);
    return null;
  }
}

/**
 * Extracts the English question text from a question block
 */
function extractEnglishQuestion(block: string): string | null {
  // Remove the question number prefix
  const withoutNumber = block.replace(/^\s*\d+\s*\./, '').trim();
  
  // Look for the question text before the first option (A) or before Tamil content
  const patterns = [
    // Pattern 1: Question ends before option (A)
    /^(.*?)(?:\s*\(?A\)?)/s,
    // Pattern 2: Question ends before Tamil script
    /^(.*?)(?=[\u0B80-\u0BFF])/s,
    // Pattern 3: Take first substantial line if no clear delimiter
    /^([^\n]{20,})/
  ];
  
  for (const pattern of patterns) {
    const match = withoutNumber.match(pattern);
    if (match && match[1]) {
      const question = match[1].trim();
      // Clean up common OCR artifacts
      const cleaned = question
        .replace(/\s+/g, ' ')
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
        .trim();
      
      if (cleaned.length > 10) {
        return cleaned;
      }
    }
  }
  
  return null;
}

/**
 * Extracts English options (A, B, C, D) from a question block
 */
function extractEnglishOptions(block: string): string[] {
  const options: string[] = [];
  
  // Pattern to match options like "(A)", "A)", "A.", etc.
  const optionPatterns = [
    /\(?([A-D])\)?\s*([^\n\r]+?)(?=\s*\(?[A-D]\)?|\s*[\u0B80-\u0BFF]|$)/g,
    /([A-D])[\.\)]\s*([^\n\r]+?)(?=\s*[A-D][\.\)]|\s*[\u0B80-\u0BFF]|$)/g
  ];
  
  for (const pattern of optionPatterns) {
    let match;
    const tempOptions: { [key: string]: string } = {};
    
    while ((match = pattern.exec(block)) !== null) {
      const optionLetter = match[1];
      const optionText = match[2].trim();
      
      if (optionText.length > 2) {
        tempOptions[optionLetter] = optionText
          .replace(/\s+/g, ' ')
          .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
          .trim();
      }
    }
    
    // Convert to ordered array (A, B, C, D)
    const orderedOptions = ['A', 'B', 'C', 'D']
      .map(letter => tempOptions[letter])
      .filter(option => option && option.length > 0);
    
    if (orderedOptions.length >= 2) {
      return orderedOptions;
    }
  }
  
  return [];
}

/**
 * Extracts Tamil question text from a question block
 */
function extractTamilQuestion(block: string): string | null {
  // Look for Tamil script (Unicode range U+0B80-U+0BFF)
  const tamilPattern = /([\u0B80-\u0BFF][^\n\r]*?)(?=\s*[\u0B80-\u0BFF]*\s*[அ-ஈ]\)|$)/;
  const match = block.match(tamilPattern);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  return null;
}

/**
 * Extracts Tamil options from a question block
 */
function extractTamilOptions(block: string): string[] {
  const options: string[] = [];
  
  // Pattern to match Tamil options like "அ)", "ஆ)", etc.
  const tamilOptionPattern = /([அ-ஈ])\)\s*([^\n\r]+?)(?=\s*[அ-ஈ]\)|$)/g;
  let match;
  
  while ((match = tamilOptionPattern.exec(block)) !== null) {
    const optionText = match[2].trim();
    if (optionText.length > 2) {
      options.push(optionText);
    }
  }
  
  return options;
}

/**
 * Finds the correct answer by looking for checkmark symbols
 */
function findCorrectAnswer(block: string): string | null {
  // Look for checkmark patterns near options
  const checkmarkPatterns = [
    /\(?([A-D])\)?\s*[^✓]*?✓/g,
    /✓\s*\(?([A-D])\)?/g,
    /\(?([A-D])\)?\s*[^✓]*?[✓√]/g,
    /[✓√]\s*\(?([A-D])\)?/g
  ];
  
  for (const pattern of checkmarkPatterns) {
    let match;
    while ((match = pattern.exec(block)) !== null) {
      const optionLetter = match[1];
      if (['A', 'B', 'C', 'D'].includes(optionLetter)) {
        return optionLetter;
      }
    }
  }
  
  // Fallback: look for any indication of correct answer
  const fallbackPatterns = [
    /(?:correct|answer|ans)[\s:]*\(?([A-D])\)?/i,
    /\(?([A-D])\)?\s*(?:correct|right)/i
  ];
  
  for (const pattern of fallbackPatterns) {
    const match = block.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Validates and cleans extracted question data
 */
export const validateQuestionData = (questions: Question[]): Question[] => {
  return questions.filter(q => {
    // Basic validation
    if (!q.question || q.question.length < 10) return false;
    if (!q.options || q.options.length < 2) return false;
    if (!q.answer || !['A', 'B', 'C', 'D'].includes(q.answer)) return false;
    
    return true;
  }).map(q => ({
    ...q,
    // Ensure consistent formatting
    question: q.question.trim(),
    options: q.options?.map(opt => opt.trim()),
    answer: q.answer.toUpperCase(),
    tamilQuestion: q.tamilQuestion?.trim(),
    tamilOptions: q.tamilOptions?.map(opt => opt.trim())
  }));
};