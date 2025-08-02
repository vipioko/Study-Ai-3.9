
import * as pdfjsLib from 'pdfjs-dist';

// Set up the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

/**
 * Finds the highest page number from an OCR text string that contains
 * markers like "==End of OCR for page X==".
 */
export const findTotalPagesFromOcr = (ocrText: string): number => {
  const pageMarkerRegex = /==End of OCR for page (\d+)==/g;
  let maxPage = 0;
  const matches = ocrText.matchAll(pageMarkerRegex);
  
  for (const match of matches) {
    const pageNumber = parseInt(match[1], 10);
    if (pageNumber > maxPage) {
      maxPage = pageNumber;
    }
  }
  
  return maxPage;
};

/**
 * Extracts text content from a specific page range of OCR text
 */
export const extractPageRangeFromOcr = (ocrText: string, startPage: number, endPage: number): string => {
  const pages: string[] = [];
  
  for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
    const startMarker = `==Start of OCR for page ${pageNum}==`;
    const endMarker = `==End of OCR for page ${pageNum}==`;
    
    const startIndex = ocrText.indexOf(startMarker);
    const endIndex = ocrText.indexOf(endMarker);
    
    if (startIndex !== -1 && endIndex !== -1) {
      const pageContent = ocrText.substring(startIndex + startMarker.length, endIndex).trim();
      pages.push(pageContent);
    }
  }
  
  return pages.join('\n\n');
};

export const getPdfPageCount = async (file: File): Promise<number> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    return pdf.numPages;
  } catch (error) {
    console.error('Error reading PDF:', error);
    return 1;
  }
};

export const extractTextFromPdfPage = async (file: File, pageNumber: number): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    
    return textContent.items
      .map((item: any) => item.str)
      .join(' ');
  } catch (error) {
    console.error('Error extracting text from PDF page:', error);
    return '';
  }
};

export const extractAllPdfText = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    const totalPages = pdf.numPages;
    
    let allText = '';
    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      allText += `==Start of OCR for page ${i}==\n${pageText}\n==End of OCR for page ${i}==\n\n`;
    }
    
    return allText;
  } catch (error) {
    console.error('Error extracting all PDF text:', error);
    return '';
  }
};
