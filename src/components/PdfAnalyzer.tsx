
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, FileText, Download, Brain, HelpCircle, File, Target, Zap } from "lucide-react";
import { generatePageAnalysis } from "@/services/geminiService";
import { downloadPDF } from "@/utils/pdfUtils";
import { getPdfPageCount } from "@/utils/pdfReader";
import { toast } from "sonner";

interface PdfAnalyzerProps {
  file: File;
  onReset: () => void;
  onStartQuiz: (pageRange: { start: number; end: number }, difficulty: string, questionsPerPage: number) => void;
  outputLanguage: "english" | "tamil";
}

interface PageAnalysis {
  page: number;
  keyPoints: string[];
  summary: string;
  importance: "high" | "medium" | "low";
  tnpscRelevance: string;
}

const PdfAnalyzer = ({ file, onReset, onStartQuiz, outputLanguage }: PdfAnalyzerProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageAnalyses, setPageAnalyses] = useState<Map<number, PageAnalysis>>(new Map());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [quizStartPage, setQuizStartPage] = useState<number>(1);
  const [quizEndPage, setQuizEndPage] = useState<number>(10);
  const [quizDifficulty, setQuizDifficulty] = useState<string>("medium");
  const [questionsPerPage, setQuestionsPerPage] = useState<number>(10);
  const [isLoadingPdf, setIsLoadingPdf] = useState(true);

  // Load PDF page count on component mount
  useEffect(() => {
    const loadPdfInfo = async () => {
      try {
        setIsLoadingPdf(true);
        const pageCount = await getPdfPageCount(file);
        setTotalPages(pageCount);
        setQuizEndPage(Math.min(10, pageCount));
        console.log(`PDF loaded: ${pageCount} pages`);
      } catch (error) {
        console.error('Error loading PDF info:', error);
        toast.error('Failed to load PDF information');
      } finally {
        setIsLoadingPdf(false);
      }
    };

    loadPdfInfo();
  }, [file]);

  const getCurrentPageAnalysis = async () => {
    if (pageAnalyses.has(currentPage)) {
      return pageAnalyses.get(currentPage);
    }

    setIsAnalyzing(true);
    try {
      const analysis = await generatePageAnalysis(file, currentPage, outputLanguage);
      const newAnalyses = new Map(pageAnalyses);
      newAnalyses.set(currentPage, analysis);
      setPageAnalyses(newAnalyses);
      toast.success(`Page ${currentPage} analysis completed!`);
      return analysis;
    } catch (error) {
      console.error("Page analysis failed:", error);
      toast.error("Failed to analyze page. Please try again.");
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleDownloadKeyPoints = async () => {
    try {
      const allAnalyses = Array.from(pageAnalyses.values());
      if (allAnalyses.length === 0) {
        toast.error("No analyses available to download. Please analyze some pages first.");
        return;
      }
      
      await downloadPDF({
        title: `TNPSC Key Points - ${file.name}`,
        content: allAnalyses,
        type: 'keypoints'
      });
      toast.success("Key points PDF downloaded successfully!");
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Failed to download PDF. Please try again.");
    }
  };

  const handleStartQuiz = () => {
    console.log("Starting quiz with config:", {
      startPage: quizStartPage,
      endPage: quizEndPage,
      difficulty: quizDifficulty,
      questionsPerPage
    });

    if (quizStartPage > quizEndPage) {
      toast.error("Start page cannot be greater than end page");
      return;
    }

    if (quizStartPage < 1 || quizEndPage > totalPages) {
      toast.error(`Page range must be between 1 and ${totalPages}`);
      return;
    }
    
    toast.success(`Starting quiz generation for pages ${quizStartPage} to ${quizEndPage}...`);
    onStartQuiz(
      { start: quizStartPage, end: quizEndPage },
      quizDifficulty,
      questionsPerPage
    );
  };

  const currentAnalysis = pageAnalyses.get(currentPage);

  if (isLoadingPdf) {
    return (
      <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm shadow-lg border-0">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading PDF information...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm shadow-lg border-0">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button
              onClick={onReset}
              variant="ghost"
              className="text-gray-600 hover:text-gray-800 text-sm md:text-base"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Upload
            </Button>
            
            <Button
              onClick={handleDownloadKeyPoints}
              variant="outline"
              size="sm"
              disabled={pageAnalyses.size === 0}
              className="text-xs md:text-sm"
            >
              <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              Download All
            </Button>
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl md:text-2xl font-bold text-gray-800">PDF Page Analysis</h2>
            </div>
            
            {/* File Info Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
              <div className="bg-blue-50 p-2 md:p-3 rounded-lg text-center">
                <File className="h-4 w-4 md:h-5 md:w-5 text-blue-600 mx-auto mb-1" />
                <div className="text-xs md:text-sm font-medium text-blue-700 truncate">
                  {file.name.length > 15 ? file.name.substring(0, 15) + "..." : file.name}
                </div>
              </div>
              <div className="bg-purple-50 p-2 md:p-3 rounded-lg text-center">
                <div className="text-lg md:text-xl font-bold text-purple-600">{totalPages}</div>
                <div className="text-xs md:text-sm text-purple-700">Total Pages</div>
              </div>
              <div className="bg-green-50 p-2 md:p-3 rounded-lg text-center">
                <div className="text-lg md:text-xl font-bold text-green-600">{pageAnalyses.size}</div>
                <div className="text-xs md:text-sm text-green-700">Analyzed</div>
              </div>
              <div className="bg-orange-50 p-2 md:p-3 rounded-lg text-center">
                <Target className="h-4 w-4 md:h-5 md:w-5 text-orange-600 mx-auto mb-1" />
                <div className="text-xs md:text-sm text-orange-700">TNPSC Ready</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Page Navigation */}
      <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm shadow-lg border-0">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base md:text-lg font-semibold text-gray-800">Navigate Pages</h3>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => handlePageChange(currentPage - 1)}
                variant="outline"
                disabled={currentPage === 1}
                size="sm"
              >
                <ArrowLeft className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
              
              <span className="text-sm font-medium text-gray-600 px-2">
                {currentPage} / {totalPages}
              </span>
              
              <Button
                onClick={() => handlePageChange(currentPage + 1)}
                variant="outline"
                disabled={currentPage === totalPages}
                size="sm"
              >
                <ArrowRight className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Go to:</label>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={currentPage}
                onChange={(e) => handlePageChange(parseInt(e.target.value) || 1)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Page"
              />
            </div>
            
            <Button
              onClick={getCurrentPageAnalysis}
              disabled={isAnalyzing}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 w-full md:w-auto"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Analyze Page {currentPage}
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Current Page Analysis */}
      {currentAnalysis && (
        <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm shadow-lg border-0">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <h3 className="text-lg md:text-xl font-bold text-gray-800">Page {currentPage} - Key Points</h3>
              <Badge className={`w-fit ${
                currentAnalysis.importance === 'high' ? 'bg-red-100 text-red-700' :
                currentAnalysis.importance === 'medium' ? 'bg-orange-100 text-orange-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {currentAnalysis.importance.toUpperCase()} Priority
              </Badge>
            </div>

            <div className="space-y-4">
              <div className="bg-yellow-50 p-3 md:p-4 rounded-lg border-l-4 border-yellow-400">
                <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  TNPSC Relevance
                </h4>
                <p className="text-yellow-700 text-sm md:text-base">{currentAnalysis.tnpscRelevance}</p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  Key Study Points:
                </h4>
                <div className="space-y-2">
                  {currentAnalysis.keyPoints.map((point, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                      <span className="text-blue-500 mt-1 font-bold text-sm">{index + 1}.</span>
                      <span className="text-gray-700 text-sm md:text-base">{point}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 p-3 md:p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Summary</h4>
                <p className="text-blue-700 text-sm md:text-base">{currentAnalysis.summary}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Quiz Configuration */}
      <Card className="p-4 md:p-6 bg-gradient-to-r from-green-50 to-blue-50 shadow-lg border-0">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-green-600" />
            <h3 className="text-lg md:text-xl font-bold text-gray-800">Configure Practice Quiz</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Page</label>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={quizStartPage}
                onChange={(e) => setQuizStartPage(Math.max(1, Math.min(totalPages, parseInt(e.target.value) || 1)))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Page</label>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={quizEndPage}
                onChange={(e) => setQuizEndPage(Math.max(1, Math.min(totalPages, parseInt(e.target.value) || 1)))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
              <Select value={quizDifficulty} onValueChange={setQuizDifficulty}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">🟢 Easy</SelectItem>
                  <SelectItem value="medium">🟡 Medium</SelectItem>
                  <SelectItem value="hard">🔴 Hard</SelectItem>
                  <SelectItem value="very-hard">⚫ Very Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Questions/Page</label>
              <Select value={questionsPerPage.toString()} onValueChange={(value) => setQuestionsPerPage(parseInt(value))}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 Questions</SelectItem>
                  <SelectItem value="10">10 Questions</SelectItem>
                  <SelectItem value="15">15 Questions</SelectItem>
                  <SelectItem value="20">20 Questions</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-white/50 p-3 md:p-4 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-4">
              <div>
                <div className="text-lg md:text-xl font-bold text-blue-600">{quizEndPage - quizStartPage + 1}</div>
                <div className="text-xs md:text-sm text-gray-600">Pages</div>
              </div>
              <div>
                <div className="text-lg md:text-xl font-bold text-green-600">{(quizEndPage - quizStartPage + 1) * questionsPerPage}</div>
                <div className="text-xs md:text-sm text-gray-600">Total Questions</div>
              </div>
              <div>
                <div className="text-lg md:text-xl font-bold text-purple-600">{quizDifficulty.toUpperCase()}</div>
                <div className="text-xs md:text-sm text-gray-600">Difficulty</div>
              </div>
              <div>
                <div className="text-lg md:text-xl font-bold text-orange-600">TNPSC</div>
                <div className="text-xs md:text-sm text-gray-600">Focused</div>
              </div>
            </div>
            
            <Button
              onClick={handleStartQuiz}
              className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 py-3 md:py-4"
            >
              <Brain className="h-4 w-4 mr-2" />
              Start Practice Quiz
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PdfAnalyzer;
