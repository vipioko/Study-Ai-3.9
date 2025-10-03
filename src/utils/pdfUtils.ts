// src/utils/pdfUtils.ts

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas'; // <<< YOU MUST INSTALL THIS: npm install html2canvas

// Helper to render React components to a hidden DOM element
import ReactDOMServer from 'react-dom/server'; 
import React from 'react';

// NOTE: You will need to import the necessary components for rendering the PDF content.
// Since I do not have access to your components, this will be a generic Renderer.
// We must assume the caller (StudyHistory/AnalysisResults) provides data in the expected format.

// --- INTERFACES (RETAINED FOR COMPATIBILITY) ---
export interface PDFContent {
  title: string;
  content: any;
  type: 'keypoints' | 'questions' | 'analysis' | 'quiz-results';
}
// --- END INTERFACES ---

// ========================================================================
// 1. CORE LOGIC: IMAGE-TO-PDF (Updated from previous step)
// ========================================================================
export const downloadImageAsPDF = async ({ title, base64Image }: { title: string, base64Image: string }) => {
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


// ========================================================================
// 2. COMPATIBILITY FIX: downloadPDF (The stub that was causing the error)
//    This function now implements the full HTML-to-Image-to-PDF logic.
// ========================================================================

const PDFRenderer = ({ title, content, type }: PDFContent) => {
    // --- THIS IS THE CRITICAL CONTENT RENDERER LOGIC ---
    // This must match the logic in StudyHistory.tsx's RecordContentRenderer
    // NOTE: This is a simplified mock. You MUST use your actual UI components
    // and data transformation logic here for accurate rendering.
    
    // For now, we return a simple representation that will be readable.
    
    let displayContent = '';

    if (type === 'analysis' && Array.isArray(content) && content[0]) {
        const analysis = content[0];
        displayContent = `
            <h1>TNPSC Analysis: ${analysis.mainTopic || title}</h1>
            <h2>Summary:</h2>
            <p>${analysis.summary}</p>
            <h2>Study Points:</h2>
            <ul>
                ${analysis.studyPoints?.map((p: any) => `<li><strong>${p.title}:</strong> ${p.description} (${p.memoryTip})</li>`).join('')}
            </ul>
        `;
    } else if (type === 'quiz-results' && content && content.answers) {
        displayContent = `
            <h1>Quiz Results: ${content.score}/${content.totalQuestions}</h1>
            <h2>Review:</h2>
            ${content.answers.map((a: any, i: number) => `
                <div style="color:${a.isCorrect ? 'green' : 'red'}; margin-bottom: 5px;">
                    <strong>Q${i + 1}.</strong> ${a.question.question}
                    <br><strong>Correct:</strong> ${a.correctAnswer} | Your Answer: ${a.userAnswer}
                </div>
            `).join('')}
        `;
    } else {
        displayContent = `<h1>${title}</h1><p>Content type: ${type}. No display logic available.</p>`;
    }
    
    // CRITICAL STYLE: Ensure a Tamil-capable font is set for the DOM element
    return (
        <div 
            id="pdf-content-to-capture" 
            style={{ 
                fontFamily: 'Noto Sans Tamil, Arial, sans-serif', // Use a standard OS Tamil font
                fontSize: '12pt',
                lineHeight: '1.5',
                width: '800px',
                padding: '2rem',
                backgroundColor: 'white',
            }} 
            dangerouslySetInnerHTML={{ __html: displayContent }}
        />
    );
};


export const downloadPDF = async ({ title, content, type }: PDFContent) => {
    
    // 1. Render the React component to a temporary DOM element
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    document.body.appendChild(container);

    // Render the React content into the container
    ReactDOM.render(<PDFRenderer title={title} content={content} type={type} />, container);

    // Wait for the DOM to update (necessary for html2canvas)
    await new Promise(resolve => setTimeout(resolve, 50)); 

    try {
        // 2. Use html2canvas to capture the element
        const canvas = await html2canvas(container, {
            scale: 2, 
            useCORS: true,
            windowWidth: container.scrollWidth,
            windowHeight: container.scrollHeight,
        });

        const base64Image = canvas.toDataURL('image/jpeg', 1.0);
        
        // 3. Convert the image to a multi-page PDF
        await downloadImageAsPDF({ title, base64Image });

    } catch (error) {
        console.error("Error in compatibility downloadPDF:", error);
        throw new Error(`PDF generation failed: ${(error as Error).message}.`);
    } finally {
        // 4. Clean up the temporary DOM element
        document.body.removeChild(container);
    }
};
