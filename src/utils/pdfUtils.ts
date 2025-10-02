// src/utils/pdfUtils.ts (New Content)

import jsPDF from 'jspdf';

// --- NEW INTERFACE ---
export interface ImageToPDFContent {
  title: string;
  base64Image: string; // The base64 image data from html2canvas
}

// NOTE: The previous downloadPDF function is replaced by this one.
export const downloadImageAsPDF = async ({ title, base64Image }: ImageToPDFContent) => {
  const pdf = new jsPDF('p', 'mm', 'a4'); // 'p' for portrait, 'mm' for units, 'a4' for size
  const imgWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  
  // Create a temporary image object to get actual dimensions
  const img = new Image();
  img.src = base64Image;

  // Wait for image to load to get dimensions
  await new Promise(resolve => img.onload = resolve);

  const imgActualWidth = img.naturalWidth;
  const imgActualHeight = img.naturalHeight;

  // Calculate scaling factor to fit the image to the PDF page width
  const ratio = imgWidth / imgActualWidth;
  const newHeight = imgActualHeight * ratio;

  let heightLeft = newHeight;
  let position = 0; // Tracks the current vertical position on the image

  // Calculate how much height is needed for a full A4 page slice in image units
  const imgSliceHeight = pageHeight / ratio;

  // Handle multi-page PDF for long content
  while (heightLeft > -1) { // Loop until we've covered the entire height
    if (position > 0) {
      pdf.addPage();
    }
    
    // Draw the image slice onto the PDF page
    // Arguments: addImage(imageData, format, x, y, width, height, alias, compression, rotation)
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
      // Calculate the part of the image to show by offsetting the Y position
      {
        x: 0,
        y: position * ratio, // Offset in scaled mm for viewport
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

// You need to export the original downloadPDF interface for compatibility with StudyHistory.tsx
export interface PDFContent {
    title: string;
    content: any;
    type: 'keypoints' | 'questions' | 'analysis' | 'quiz-results';
}

// Re-export as a stub for now, as it's not the function being used directly
export const downloadPDF = async (content: PDFContent) => {
    console.error("The old downloadPDF function is a stub. The component should use html2canvas + downloadImageAsPDF.");
    throw new Error("Old PDF download method is deprecated. The component is misconfigured.");
};