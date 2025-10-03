// src/utils/pdfUtils.ts - FINAL FIX: Simplified and Robust Multi-Page Image-to-PDF

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
// 1. CORE LOGIC: IMAGE-TO-PDF (UPDATED FOR ROBUST MULTI-PAGE)
// ========================================================================
export const downloadImageAsPDF = async ({ title, base64Image }: ImageToPDFContent) => {
  const pdf = new jsPDF('p', 'mm', 'a4'); 
  const imgWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  
  const img = new Image();
  img.src = base64Image;

  await new Promise(resolve => img.onload = resolve);

  const imgActualWidth = img.naturalWidth;
  const imgActualHeight = img.naturalHeight;

  // Calculate scaling factor to fit the image to the PDF page width (210mm)
  const ratio = imgWidth / imgActualWidth;
  const imgScaledHeight = imgActualHeight * ratio;

  let heightLeft = imgScaledHeight;
  let position = 0; 
  let currentPage = 1;

  // The critical loop uses negative Y offset on the full image
  while (heightLeft > 0) {
    if (currentPage > 1) {
      pdf.addPage();
    }

    // Add the image. The key is the NEGATIVE Y OFFSET (-position)
    pdf.addImage(
      base64Image, 
      'JPEG', 
      0, 
      -position, // Use negative position to scroll the image up/down
      imgWidth, 
      imgScaledHeight // Use the full scaled height
    );

    heightLeft -= pageHeight;
    position += pageHeight; // Increment position by one page height
    currentPage++;
  }

  const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_image.pdf`;
  pdf.save(fileName);
};


// ========================================================================
// 2. COMPATIBILITY STUB: OLD downloadPDF (Unchanged)
// ========================================================================
export const downloadPDF = async (content: PDFContent) => {
    console.error("The old downloadPDF function is a stub. The component calling it MUST be fixed to use downloadImageAsPDF.");
    throw new Error("Old PDF download method is deprecated. The component is misconfigured.");
};