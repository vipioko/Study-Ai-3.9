import React from "react";
import html2canvas from 'html2canvas'; // <<< NEW IMPORT
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Brain, FileText, Zap, ChevronRight } from "lucide-react";
import { AnalysisResult, StudyPoint } from "./StudyAssistant";
import { downloadImageAsPDF } from "@/utils/pdfUtils"; // <<< UPDATED IMPORT
import { saveStudyHistory } from "@/services/studyHistoryService";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/config/firebase";
import { toast } from "sonner";

interface AnalysisResultsProps {
  result: AnalysisResult;
  onReset: () => void;
  selectedFiles: File[];
  onGenerateQuestions: () => void;
  onStartQuiz: () => void;
  isGeneratingQuestions: boolean;
}

// ========================================================================
// 1. DEDICATED RENDERER COMPONENT FOR HTML2CANVAS CAPTURE
// ========================================================================
interface AnalysisContentRendererProps {
    result: AnalysisResult;
    selectedFiles: File[];
}

const AnalysisContentRenderer: React.FC<AnalysisContentRendererProps> = ({ result, selectedFiles }) => {
    // This is the HTML structure that html2canvas will turn into a perfect, readable image in the PDF.
    const fileName = selectedFiles[0]?.name || "Study Material";
    
    return (
        <div 
            id="analysis-content-to-capture" 
            className="p-8 bg-white text-black max-w-4xl mx-auto" 
            style={{ 
                fontFamily: 'Noto Sans Tamil, Arial, sans-serif', // Ensure a Tamil font is referenced here
                fontSize: '12pt',
                lineHeight: '1.6',
                width: '800px', // Fixed width for consistent PDF output size
                minHeight: '1100px', // Minimum height for A4 page dimensions
                padding: '30px'
            }}
        >
            <h1 style={{ fontSize: '24pt', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '2px solid #ccc', paddingBottom: '0.5rem' }}>
                TNPSC Study Analysis
            </h1>
            <p style={{ marginBottom: '1rem', fontSize: '14pt' }}>**Topic:** {result.mainTopic || 'N/A'}</p>
            <p style={{ marginBottom: '1.5rem' }}>**Source File:** {fileName}</p>

            {/* Summary */}
            <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '18pt', fontWeight: 'bold', marginBottom: '0.5rem', color: '#333' }}>Summary</h3>
                <p>{result.summary}</p>
            </div>

            {/* Study Points */}
            {result.studyPoints && result.studyPoints.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '18pt', fontWeight: 'bold', marginBottom: '1rem', color: '#333' }}>Detailed Study Points</h3>
                    <div style={{ border: '1px solid #eee', padding: '1rem', borderRadius: '8px' }}>
                        {result.studyPoints.map((point, index) => (
                            <div key={index} style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px dotted #ccc' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                    <h4 style={{ fontSize: '14pt', fontWeight: 'bold', color: '#007bff' }}>{index + 1}. {point.title}</h4>
                                    <span style={{ fontSize: '10pt', padding: '4px 8px', borderRadius: '4px', backgroundColor: point.importance === 'high' ? '#fdebeb' : point.importance === 'medium' ? '#fffbeb' : '#e6f7e8', color: point.importance === 'high' ? '#c53030' : point.importance === 'medium' ? '#d69e2e' : '#2f855a' }}>
                                        {point.importance.toUpperCase()}
                                    </span>
                                </div>
                                <p style={{ fontSize: '11pt', color: '#555', marginBottom: '10px' }}>{point.description}</p>
                                {point.memoryTip && (
                                    <p style={{ fontSize: '10pt', fontStyle: 'italic', color: '#007bff', backgroundColor: '#e6f0ff', padding: '8px', borderRadius: '4px' }}>
                                        🧠 **Memory Tip:** {point.memoryTip}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Key Points */}
            {result.keyPoints && result.keyPoints.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '18pt', fontWeight: 'bold', marginBottom: '1rem', color: '#333' }}>Quick Review Key Facts</h3>
                    <ul style={{ listStyleType: 'disc', paddingLeft: '20px' }}>
                        {result.keyPoints.slice(0, 10).map((point, index) => (
                            <li key={index} style={{ marginBottom: '5px', fontSize: '11pt' }}>{point}</li>
                        ))}
                    </ul>
                </div>
            )}
            
            {/* Categories */}
            {result.tnpscCategories && result.tnpscCategories.length > 0 && (
                <div style={{ marginTop: '2rem' }}>
                    <h3 style={{ fontSize: '14pt', fontWeight: 'bold', marginBottom: '0.5rem', color: '#333' }}>TNPSC Categories</h3>
                    <p>{result.tnpscCategories.join(', ')}</p>
                </div>
            )}
        </div>
    );
};
// ========================================================================


const AnalysisResults = ({ 
  result, 
  onReset, 
  selectedFiles, 
  onGenerateQuestions, 
  onStartQuiz,
  isGeneratingQuestions
}: AnalysisResultsProps) => {
  const [user] = useAuthState(auth);

  // Save to study history when component mounts
  React.useEffect(() => {
    const saveToHistory = async () => {
      if (user && result) {
        try {
          await saveStudyHistory(
            user.uid,
            "analysis",
            [result],
            {
              fileName: selectedFiles[0]?.name || "Study Material",
              difficulty: "medium", // You can pass this as a prop
              language: result.language || "english",
              files: selectedFiles
            }
          );
          console.log("Analysis saved to study history");
        } catch (error) {
          console.error("Failed to save to study history:", error);
        }
      }
    };

    saveToHistory();
  }, [user, result, selectedFiles]);

  // ========================================================================
  // *** CRITICAL FIX: handleDownloadAnalysis now uses html2canvas ***
  // ========================================================================
  const handleDownloadAnalysis = async () => {
    // 1. Locate the hidden content renderer element
    const contentElement = document.getElementById('analysis-content-to-capture'); 
    
    if (!contentElement) {
        toast.error("Error: Could not find the analysis content element for download.");
        return;
    }

    try {
        toast.info("Capturing analysis content for PDF generation...");
        
        // 2. Use html2canvas to capture the entire DOM element
        const canvas = await html2canvas(contentElement as HTMLElement, {
            scale: 2, // Higher scale for better resolution
            useCORS: true,
            windowWidth: contentElement.scrollWidth,
            windowHeight: contentElement.scrollHeight,
        });

        const base64Image = canvas.toDataURL('image/jpeg', 1.0);
        
        // 3. Call the new utility function
        const title = `Study-Analysis-${result.mainTopic || 'Data'}-${new Date().toLocaleDateString()}`;

        await downloadImageAsPDF({ 
            title, 
            base64Image 
        });
        
        toast.success("Downloaded successfully!");

    } catch (error) {
        console.error("Download error:", error);
        toast.error(`Failed to download PDF. Please ensure 'html2canvas' is installed.`);
    }
  };
  // ========================================================================


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* 2. INSERT HIDDEN RENDERER FOR HTML2CANVAS */}
      <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: -100, // Move it off-screen so it doesn't interfere with the UI
          opacity: 0, 
          pointerEvents: 'none',
          height: 'auto',
          width: '100%',
      }}>
          <AnalysisContentRenderer result={result} selectedFiles={selectedFiles} />
      </div>
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>
      
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6 relative z-10">
          {/* Header */}
          <Card className="glass-card p-4 md:p-6 animate-fadeInUp hover-lift">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
                  <Button
                    onClick={onReset}
                    variant="ghost"
                    className="text-gray-600 hover:text-gray-800 p-2"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Upload New Files
                  </Button>
                </div>
                
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-5 w-5 text-blue-600" />
                    <h2 className="text-xl md:text-2xl font-bold gradient-text">
                      {result.mainTopic || "TNPSC Study Analysis"}
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="badge-elegant badge-success">
                      Source Files: {selectedFiles.length}
                    </Badge>
                    <Badge className="badge-elegant badge-success">
                      Analysis Complete
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={onGenerateQuestions}
                    disabled={isGeneratingQuestions}
                    className="btn-primary flex-1"
                  >
                    {isGeneratingQuestions ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generating Questions...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Start Interactive Quiz
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={handleDownloadAnalysis}
                    className="btn-secondary"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Analysis
                  </Button>
                </div>
              </div>

              {selectedFiles.length > 0 && (
                <div className="w-full sm:w-48 flex-shrink-0">
                  <div className="text-sm font-medium text-gray-700 mb-2">Source Files</div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedFiles.slice(0, 3).map((file, index) => (
                      <div key={index} className="text-xs text-gray-600 truncate">
                        {file.name}
                      </div>
                    ))}
                    {selectedFiles.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{selectedFiles.length - 3} more files
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Key Points */}
          {result.keyPoints && result.keyPoints.length > 0 && (
            <Card className="glass-card p-4 md:p-6 animate-fadeInUp hover-lift" style={{animationDelay: '0.1s'}}>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                <span className="gradient-text">Key Points</span>
              </h3>
              <div className="grid gap-3 stagger-animation">
                {result.keyPoints.map((point, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg hover-lift">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 shadow-md">
                      {index + 1}
                    </div>
                    <p className="text-gray-700 leading-relaxed">{point}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Summary */}
          {result.summary && (
            <Card className="glass-card p-4 md:p-6 animate-fadeInUp hover-lift" style={{animationDelay: '0.2s'}}>
              <h3 className="text-lg font-semibold gradient-text mb-4">Summary</h3>
              <p className="text-gray-700 leading-relaxed">{result.summary}</p>
            </Card>
          )}


          {/* Study Points */}
          {result.studyPoints && result.studyPoints.length > 0 && (
            <Card className="glass-card p-4 md:p-6 animate-fadeInUp hover-lift" style={{animationDelay: '0.3s'}}>
              <h3 className="text-lg font-semibold gradient-text mb-4">Study Points</h3>
              <div className="space-y-4">
                {result.studyPoints.map((point, index) => (
                  <div key={index} className="border-l-4 border-gradient-to-b from-blue-500 to-purple-600 pl-4 hover-lift">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-800">{point.title}</h4>
                      <div className="flex gap-2 flex-wrap">
                        <Badge 
                          className={
                            point.importance === 'high' 
                              ? 'badge-elegant badge-error' 
                              : point.importance === 'medium'
                              ? 'badge-elegant badge-warning'
                              : 'badge-elegant badge-success'
                          }
                        >
                          {point.importance} priority
                        </Badge>
                      </div>
                    </div>
                    <p className="text-gray-700 mb-2">{point.description}</p>
                    {point.memoryTip && (
                      <p className="text-sm text-blue-700 bg-gradient-to-r from-blue-50 to-cyan-50 p-3 rounded-lg mt-2 border-l-4 border-blue-400">
                        <strong>🧠 Memory Tip:</strong> {point.memoryTip}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* TNPSC Categories */}
          {result.tnpscCategories && result.tnpscCategories.length > 0 && (
            <Card className="glass-card p-4 md:p-6 animate-fadeInUp hover-lift" style={{animationDelay: '0.4s'}}>
              <h3 className="text-lg font-semibold gradient-text mb-4">TNPSC Categories</h3>
              <div className="flex flex-wrap gap-2">
                {result.tnpscCategories.map((category, index) => (
                  <Badge key={index} className="badge-elegant bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 border-indigo-200 text-sm">
                    {category}
                  </Badge>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisResults;