import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Brain, FileText, Zap, ChevronRight } from "lucide-react";
import { AnalysisResult } from "./StudyAssistant";
import { downloadPDF } from "@/utils/pdfUtils";
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

  const handleDownloadAnalysis = async () => {
    try {
      await downloadPDF({
        title: `TNPSC Study Analysis - ${result.mainTopic || 'Study Material'}`,
        content: [result],
        type: 'analysis'
      });
      toast.success("Analysis downloaded successfully!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download analysis. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
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