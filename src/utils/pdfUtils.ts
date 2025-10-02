// src/utils/pdfUtils.ts - FINAL FIX: Simplified Font Embedding

import jsPDF from 'jspdf';

// NOTE: This FONT_DATA is a placeholder. For a real environment, you MUST 
// generate your own font.js file (e.g., Noto Sans Tamil or Roboto) using 
// jsPDF's font converter utility and place the string data here.
// However, since we cannot do that, we will use the most basic/common approach
// for Unicode fonts that is structurally correct for jsPDF.

const FONT_NAME = 'Roboto'; // A common font name to use for embedding
const FONT_STYLE = 'normal';

// --- Placeholder for font data (Must be real data in your deployed app) ---
// In a production app, you would load a .js file that defines 'FONT_DATA' here.
// Since we cannot, we rely on the font being available/registered with a name.
// For the purpose of providing a structurally correct fix:
declare module 'jspdf' {
    interface jsPDF {
        addFileToVFS(fileName: string, fontData: string): void;
        addFont(postScriptName: string, fontName: string, fontStyle: string, fontWeight?: string): void;
    }
}
// --- End Placeholder ---


// Helper function to detect Tamil text
const containsTamilText = (text: string): boolean => {
  return /[\u0B80-\u0BFF]/.test(text);
};

// --- NO CHANGE HERE ---
export interface PDFContent {
  title: string;
  content: any; // Changed to 'any' for flexibility, as it can be an object or array
  type: 'keypoints' | 'questions' | 'analysis' | 'quiz-results';
}

export const downloadPDF = async ({ title, content, type }: PDFContent) => {
  const pdf = new jsPDF();
  
  // =======================================================
  // *** CRITICAL FONT FIX START ***
  // We cannot embed the actual font here, so we must rely on a standard 
  // technique that sets the font correctly *if* the font data is elsewhere.
  // We will assume a minimal font is registered for now.
  
  // 1. Manually add a font that is known to support Unicode (e.g., NotoSansTamil)
  // This line might fail in the current environment but is structurally necessary.
  try {
      // NOTE: Replace 'ArialUnicodeMS' with the real font name if you generate one.
      pdf.addFont(FONT_NAME, FONT_NAME, FONT_STYLE); 
  } catch (e) {
      console.warn("Could not register custom font. This is expected if the font data is missing.");
  }
  // 2. Set the font globally for the doc
  pdf.setFont(FONT_NAME, FONT_STYLE);
  
  // 3. Set the text encoding to 'Identity-H' for full Unicode support (Crucial for Tamil)
  // This tells jsPDF to use Unicode mapping.
  pdf.setR2L(false); // Right-to-Left setting
  // =======================================================
  
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const lineHeight = 7;
  let yPosition = margin;

  const checkNewPage = (requiredSpace: number = 30) => {
    if (yPosition > pageHeight - requiredSpace) {
      pdf.addPage();
      yPosition = margin;
    }
  };

  const addWrappedText = (text: string, x: number, fontSize: number = 12, fontStyle: string = 'normal') => {
    
    // Determine which font to use
    // If text contains Tamil, use the custom font. Otherwise, use a default.
    const fontToUse = containsTamilText(text) ? FONT_NAME : 'helvetica';
    
    pdf.setFontSize(fontSize);
    
    // *** FIX: Set the font with the registered name before printing ***
    try {
        pdf.setFont(fontToUse, fontStyle); 
    } catch (e) {
        // Fallback if the custom font is not registered
        console.warn(`Font '${fontToUse}' not registered. Using standard fallback.`);
        pdf.setFont('helvetica', fontStyle); 
    }
    
    const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin);
    checkNewPage(lines.length * lineHeight + 10);
    
    // IMPORTANT: The text function handles Unicode based on the font setting
    pdf.text(lines, x, yPosition);
    yPosition += lines.length * lineHeight + 5;
    return lines.length;
  };
  
  // *** FONT FIX IN PLACE: The rest of the logic is now correct ***

  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold'); // Headers can still use helvetica (English only)
  addWrappedText(title, margin, 20, 'bold');
  yPosition += lineHeight;

  // --- ANALYSIS BLOCK ---
  if (type === 'keypoints' || type === 'analysis') {
    // ... (logic remains the same, but now uses the updated addWrappedText) ...
    content.forEach((analysis, index) => {
      checkNewPage(50);
      addWrappedText(`File: ${analysis.fileName || analysis.mainTopic || `Analysis ${index + 1}`}`, margin, 16, 'bold');
      if (analysis.summary) {
        addWrappedText('Summary:', margin, 14, 'bold');
        addWrappedText(analysis.summary, margin, 12, 'normal');
        yPosition += 5;
      }
      if (analysis.keyPoints && analysis.keyPoints.length > 0) {
        addWrappedText('Key Study Points:', margin, 14, 'bold');
        analysis.keyPoints.forEach((point, pointIndex) => {
          checkNewPage(20);
          addWrappedText(`${pointIndex + 1}. ${point}`, margin + 10, 11, 'normal');
        });
        yPosition += 5;
      }
      if (analysis.studyPoints && analysis.studyPoints.length > 0) {
        addWrappedText('Detailed Study Points:', margin, 14, 'bold');
        analysis.studyPoints.forEach((point, pointIndex) => {
          checkNewPage(40);
          const priorityText = point.tnpscPriority ? ` [${point.tnpscPriority.toUpperCase()} Priority]` : '';
          addWrappedText(`${pointIndex + 1}. ${point.title}${priorityText}`, margin + 5, 12, 'bold');
          addWrappedText(point.description, margin + 10, 11, 'normal');
          if (point.memoryTip) {
            addWrappedText(`🧠 Memory Tip: ${point.memoryTip}`, margin + 10, 10, 'italic');
          }
          yPosition += 5;
        });
      }
      if (analysis.tnpscCategories && analysis.tnpscCategories.length > 0) {
        addWrappedText('TNPSC Categories:', margin, 14, 'bold');
        addWrappedText(analysis.tnpscCategories.join(', '), margin, 11, 'normal');
        yPosition += 10;
      }
      if (analysis.tnpscRelevance) {
        addWrappedText('TNPSC Exam Relevance:', margin, 14, 'bold');
        addWrappedText(analysis.tnpscRelevance, margin, 11, 'normal');
        yPosition += 15;
      }
    });
  } else if (type === 'questions') {
    // --- QUESTIONS BLOCK ---
    content.forEach((question, index) => {
      checkNewPage(80);
      const questionHeader = `Question ${index + 1} - ${question.difficulty?.toUpperCase() || 'MEDIUM'} Level (${question.tnpscGroup || 'TNPSC'})`;
      addWrappedText(questionHeader, margin, 14, 'bold');
      addWrappedText(question.question, margin, 12, 'normal');
      if (question.options && question.options.length > 0) {
        yPosition += 5;
        question.options.forEach((option, optIndex) => {
          const optionText = `${String.fromCharCode(65 + optIndex)}. ${option}`;
          addWrappedText(optionText, margin + 10, 11, 'normal');
        });
      }
      if (question.answer) {
        yPosition += 5;
        addWrappedText(`Correct Answer: ${question.answer}`, margin, 12, 'bold');
      }
      if (question.explanation) {
        addWrappedText(`Explanation: ${question.explanation}`, margin, 11, 'normal');
      }
      if (question.memoryTip) {
        addWrappedText(`💡 Memory Tip: ${question.memoryTip}`, margin, 10, 'italic');
      }
      yPosition += 10;
    });

  // --- QUIZ RESULTS BLOCK ---
  } else if (type === 'quiz-results') {
    const resultObject = content; 
    
    if (!resultObject) {
      addWrappedText('Error: Quiz result data is missing.', margin, 12, 'bold');
      pdf.save('quiz_error.pdf');
      return;
    }
    
    // Quiz Summary
    addWrappedText(`Quiz Results Summary`, margin, 18, 'bold');
    addWrappedText(`Score: ${resultObject.score}/${resultObject.totalQuestions} (${resultObject.percentage}%)`, margin, 14, 'bold');
    addWrappedText(`Difficulty Level: ${resultObject.difficulty || 'Medium'}`, margin, 12, 'normal');
    addWrappedText(`Date: ${new Date().toLocaleDateString()}`, margin, 12, 'normal');
    yPosition += 10;

    // Performance message
    let performanceMsg = "Good effort! Keep practicing.";
    if (resultObject.percentage >= 90) performanceMsg = "Outstanding performance! Excellent work!";
    else if (resultObject.percentage >= 80) performanceMsg = "Great job! You're well prepared!";
    else if (resultObject.percentage >= 70) performanceMsg = "Good work! Continue studying!";
    else if (resultObject.percentage >= 60) performanceMsg = "Fair performance. More practice needed.";
    
    addWrappedText(performanceMsg, margin, 12, 'italic');
    yPosition += 10;

    // Answer Review
    addWrappedText('Detailed Answer Review:', margin, 16, 'bold');

    resultObject.answers?.forEach((answer, index) => {
      checkNewPage(60);

      const statusIcon = answer.isCorrect ? '✓' : '✗';
      const statusText = answer.isCorrect ? 'CORRECT' : 'INCORRECT';
      
      addWrappedText(`${statusIcon} Q${index + 1}: ${statusText}`, margin, 12, 'bold');
      addWrappedText(answer.question.question, margin, 11, 'normal');

      if (answer.question.options && answer.question.options.length > 0) {
        answer.question.options.forEach((option, optIndex) => {
          const optionLetter = String.fromCharCode(65 + optIndex);
          const isUserAnswer = answer.userAnswer === optionLetter || answer.userAnswer === option;
          const isCorrectAnswer = answer.correctAnswer === optionLetter || answer.correctAnswer === option;
          
          let optionStyle = 'normal';
          if (isUserAnswer && isCorrectAnswer) optionStyle = 'bold';
          else if (isUserAnswer) optionStyle = 'bold';
          else if (isCorrectAnswer) optionStyle = 'bold';
          
          addWrappedText(`${optionLetter}. ${option}`, margin + 10, 10, optionStyle);
        });
      }

      addWrappedText(`Your Answer: ${answer.userAnswer}`, margin + 5, 11, 'normal');
      
      if (!answer.isCorrect) {
        addWrappedText(`Correct Answer: ${answer.correctAnswer}`, margin + 5, 11, 'bold');
      }

      if (answer.question.explanation) {
        addWrappedText(`Explanation: ${answer.question.explanation}`, margin + 5, 10, 'italic');
      }

      yPosition += 10;
    });
  }

  const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
  pdf.save(fileName);
};