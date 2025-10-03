// src/utils/pdfUtils.ts - FINAL, BUILD-SAFE VERSION

import jsPDF from 'jspdf';
// We assume html2canvas is installed and used externally.
// NO REACT/JSX/REACTDOM IMPORTS HERE.

// --- INTERFACES ---
export interface ImageToPDFContent {
  title: string;
  base64Image: string; // The content is the image captured from the DOM
}

// Interface for the old function signature (kept for compatibility)
export interface PDFContent {
  title: string;
  content: any;
  type: 'keypoints' | 'questions' | 'analysis' | 'quiz-results';
}
// --- END INTERFACES ---


// ========================================================================
// 1. CORE LOGIC: IMAGE-TO-PDF (Updated from previous step)
// ========================================================================
// NOTE: This function is the one StudyHistory.tsx will call after html2canvas.
export const downloadImageAsPDF = async ({ title, base64Image }: ImageToPDFContent) => {
  const pdf = new jsPDF('p', 'mm', 'a4'); 
  const imgWidth = 210; 
  const pageHeight = 297; 
  
  const img = new Image();
  img.src = base64Image;

  await new Promise(resolve => img.onload = resolve);

  const imgActualWidth = img.naturalWidth;
  const imgActualHeight = img.naturalHeight;

  const ratio = imgWidth / imgActualWidth;
  const newHeight = imgActualHeight * ratio;

  let heightLeft = newHeight;
  let position = 0; 

  while (heightLeft > -1) { 
    if (position > 0) {
      pdf.addPage();
    }
    
    // Add the image slice to the PDF
    pdf.addImage(
      base64Image, 
      'JPEG', 
      0, 
      0, 
      imgWidth, 
      newHeight, 
      undefined, 
      'FAST',
      0,
      {
        x: 0,
        y: position * ratio,
        width: imgWidth,
        height: pageHeight
      }
    );

    heightLeft -= pageHeight;
    position += pageHeight;
  }

  const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_image.pdf`;
  pdf.save(fileName);
};


// ========================================================================
// 2. COMPATIBILITY STUB: OLD downloadPDF
//    This stub is LEFT AS IS TO PREVENT THE BUILD CRASH.
//    The component calling it MUST be fixed.
// ========================================================================
export const downloadPDF = async (content: PDFContent) => {
    console.error("The old downloadPDF function is a stub. The component calling it MUST be fixed to use downloadImageAsPDF.");
    throw new Error("Old PDF download method is deprecated. The component is misconfigured.");
};