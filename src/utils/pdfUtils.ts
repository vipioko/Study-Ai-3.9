// src/utils/pdfUtils.ts - Final Fix: Proper Font Registration for Tamil

import jsPDF from 'jspdf';
// NOTE: You must ensure 'NotoSansTamil' font data is loaded and registered in your environment.
// This code assumes that a font named 'NotoSansTamil' is registered via pdf.addFont().

const TAMIL_FONT_NAME = 'NotoSansTamil';
const DEFAULT_FONT_NAME = 'helvetica';

// Helper function to detect Tamil text
const containsTamilText = (text: string): boolean => {
  return /[\u0B80-\u0BFF]/.test(text);
};

// Interface remains unchanged
export interface PDFContent {
  title: string;
  content: any;
  type: 'keypoints' | 'questions' | 'analysis' | 'quiz-results';
}

export const downloadPDF = async ({ title, content, type }: PDFContent) => {
  const pdf = new jsPDF();
  
  // =======================================================
  // *** CRITICAL FONT FIX: Registration & Setting ***
  
  // 1. Explicitly register the font (even if the data is loaded elsewhere)
  // This line is essential for the structure, even if the data loading is external.
  try {
      // Assuming 'NotoSansTamil' is the name given during the font file conversion.
      pdf.addFont(TAMIL_FONT_NAME, TAMIL_FONT_NAME, 'normal'); 
      pdf.addFont(TAMIL_FONT_NAME, TAMIL_FONT_NAME, 'bold'); 
  } catch (e) {
      console.warn("Custom font registration failed. Check if Noto Sans Tamil data is embedded.", e);
  }
  
  // 2. Set default font for document headers/English text
  pdf.setFont(DEFAULT_FONT_NAME, 'bold');
  pdf.setR2L(false); // Left-to-Right text direction for English/Tamil

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
    
    // Determine which font to use based on content
    const isTamil = containsTamilText(text);
    const fontToUse = isTamil ? TAMIL_FONT_NAME : DEFAULT_FONT_NAME;
    
    pdf.setFontSize(fontSize);
    
    // Set the font. This is where the magic happens.
    try {
        pdf.setFont(fontToUse, fontStyle); 
        // If the font is the custom one, we assume it supports Unicode
    } catch (e) {
        // Fallback to default if custom font is not registered
        pdf.setFont(DEFAULT_FONT_NAME, fontStyle); 
    }
    
    const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin);
    checkNewPage(lines.length * lineHeight + 10);
    
    pdf.text(lines, x, yPosition);
    yPosition += lines.length * lineHeight + 5;
    return lines.length;
  };
  
  // *** FONT LOGIC APPLIED ***

  pdf.setFontSize(20);
  pdf.setFont(DEFAULT_FONT_NAME, 'bold'); 
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