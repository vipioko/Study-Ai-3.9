import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronLeft, 
  ChevronRight, 
  ArrowLeft, 
  Brain, 
  FileText, 
  Download, 
  Zap, 
  Target,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { analyzeIndividualPage } from '@/services/geminiService';
import { extractPageRangeFromOcr } from '@/utils/pdfReader';
import { downloadPDF } from '@/utils/pdfUtils';
import { saveStudyHistory, updateStudyHistory } from '@/services/studyHistoryService';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/config/firebase';
import { toast } from 'sonner';

interface PageAnalysis {
  pageNumber: number;
  keyPoints: string[];
  studyPoints: Array<{
    title: string;
    description: string;
    importance: "high" | "medium" | "low";
    memoryTip: string;
  }>;
  summary: string;
  tnpscRelevance: string;
}

interface PdfPageNavigatorProps {
  file: File;
  totalPages: number;
  fullText: string;
  outputLanguage: "english" | "tamil";
  onReset: () => void;
  onStartQuiz: (pageRange: { start: number; end: number }, difficulty: string) => void;
  initialPageAnalyses?: Map<number, any>;
  initialStudyHistoryId?: string;
  currentPage: number;
  onPageChange: (page: number) => void;
  initialShowPageRangeSelector?: boolean;
  isContinueAnalysis?: boolean;
}

// FIX: Added 'export' here to create a named export
export const PdfPageNavigator = ({
  file,
  totalPages,
  fullText,
  outputLanguage,
  onReset,
  onStartQuiz,
  initialPageAnalyses,
  initialStudyHistoryId,
  currentPage,
  onPageChange,
  initialShowPageRangeSelector = false,
  isContinueAnalysis = false
}: PdfPageNavigatorProps) => {
  const [user] = useAuthState(auth);
  const [pageAnalyses, setPageAnalyses] = useState<Map<number, PageAnalysis>>(new Map());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [studyHistoryId, setStudyHistoryId] = useState<string | null>(initialStudyHistoryId || null);
  const [quizStartPage, setQuizStartPage] = useState(1);
  const [quizEndPage, setQuizEndPage] = useState(Math.min(10, totalPages));
  const [difficulty, setDifficulty] = useState("medium");
  const [showPageRangeSelector, setShowPageRangeSelector] = useState(initialShowPageRangeSelector && !isContinueAnalysis);
  const [rangeStartPage, setRangeStartPage] = useState(1);
  const [rangeEndPage, setRangeEndPage] = useState(Math.min(10, totalPages));

  // Initialize with existing analyses if provided
  useEffect(() => {
    if (initialPageAnalyses) {
      setPageAnalyses(new Map(initialPageAnalyses));
    }
    // Set quiz range to analyzed pages if resuming analysis
    if (isContinueAnalysis && initialPageAnalyses && initialPageAnalyses.size > 0) {
        const analyzedKeys = Array.from(initialPageAnalyses.keys()).sort((a, b) => a - b);
        if (analyzedKeys.length > 0) {
            setQuizStartPage(analyzedKeys[0]);
            setQuizEndPage(analyzedKeys[analyzedKeys.length - 1]);
        }
    }
  }, [initialPageAnalyses, isContinueAnalysis]);

  const getCurrentPageAnalysis = () => {
    return pageAnalyses.get(currentPage);
  };

  const analyzeCurrentPage = async () => {
    if (pageAnalyses.has(currentPage)) {
      toast.info(`Page ${currentPage} is already analyzed`);
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    
    try {
      const pageContent = extractPageRangeFromOcr(fullText, currentPage, currentPage);
      
      if (!pageContent.trim()) {
        toast.error(`No content found on page ${currentPage}`);
        return;
      }

      setAnalysisProgress(30);
      const analysis = await analyzeIndividualPage(pageContent, currentPage, outputLanguage);
      setAnalysisProgress(80);

      const newPageAnalyses = new Map(pageAnalyses);
      newPageAnalyses.set(currentPage, analysis);
      setPageAnalyses(newPageAnalyses);

      // Save or update study history
      if (user) {
        const analysisData = {
          keyPoints: Array.from(newPageAnalyses.values()).flatMap(p => p.keyPoints),
          studyPoints: Array.from(newPageAnalyses.values()).flatMap(p => p.studyPoints),
          summary: `Analysis of ${newPageAnalyses.size} pages from ${file.name}`,
          tnpscRelevance: `Comprehensive analysis covering pages: ${Array.from(newPageAnalyses.keys()).sort().join(', ')}`,
          tnpscCategories: ["PDF Analysis"],
          mainTopic: file.name
        };

        const pageAnalysesMap = Object.fromEntries(newPageAnalyses);

        if (studyHistoryId) {
          await updateStudyHistory(studyHistoryId, analysisData, pageAnalysesMap);
        } else {
          const newHistoryId = await saveStudyHistory(
            user.uid,
            "analysis",
            [analysisData],
            {
              fileName: file.name,
              difficulty: "medium",
              language: outputLanguage,
              pageAnalysesMap
            }
          );
          setStudyHistoryId(newHistoryId);
        }
      }

      setAnalysisProgress(100);
      toast.success(`Page ${currentPage} analyzed successfully!`);
    } catch (error) {
      console.error(`Error analyzing page ${currentPage}:`, error);
      toast.error(`Failed to analyze page ${currentPage}: ${(error as Error).message.substring(0, 50)}...`);
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  };

  const analyzePageRange = async (startPage: number, endPage: number) => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    
    try {
      const totalPagesToAnalyze = endPage - startPage + 1;
      let analyzedCount = 0;

      for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
        if (pageAnalyses.has(pageNum)) {
          analyzedCount++;
          setAnalysisProgress((analyzedCount / totalPagesToAnalyze) * 100);
          continue; // Skip already analyzed pages
        }

        const pageContent = extractPageRangeFromOcr(fullText, pageNum, pageNum);
        
        if (!pageContent.trim()) {
          console.warn(`No content found on page ${pageNum}, skipping`);
          analyzedCount++;
          setAnalysisProgress((analyzedCount / totalPagesToAnalyze) * 100);
          continue;
        }

        try {
          const analysis = await analyzeIndividualPage(pageContent, pageNum, outputLanguage);
          
          setPageAnalyses(prev => {
            const newMap = new Map(prev);
            newMap.set(pageNum, analysis);
            return newMap;
          });

          analyzedCount++;
          setAnalysisProgress((analyzedCount / totalPagesToAnalyze) * 100);
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error(`Error analyzing page ${pageNum}:`, error);
          // Log API failure specifically to the console for easier debugging of the "No content received" error
          console.warn(`Page ${pageNum} FAILED API CALL:`, (error as Error).message);
          toast.error(`Page ${pageNum} failed: ${(error as Error).message.substring(0, 50)}...`);
          
          analyzedCount++;
          setAnalysisProgress((analyzedCount / totalPagesToAnalyze) * 100);
        }
      }

      // Save or update study history after range analysis
      if (user) {
        const currentAnalyses = Array.from(pageAnalyses.values());
        const analysisData = {
          keyPoints: currentAnalyses.flatMap(p => p.keyPoints),
          studyPoints: currentAnalyses.flatMap(p => p.studyPoints),
          summary: `Analysis of ${currentAnalyses.length} pages from ${file.name}`,
          tnpscRelevance: `Comprehensive analysis covering pages: ${Array.from(pageAnalyses.keys()).sort().join(', ')}`,
          tnpscCategories: ["PDF Analysis"],
          mainTopic: file.name
        };

        const pageAnalysesMap = Object.fromEntries(pageAnalyses);

        if (studyHistoryId) {
          await updateStudyHistory(studyHistoryId, analysisData, pageAnalysesMap);
        } else {
          const newHistoryId = await saveStudyHistory(
            user.uid,
            "analysis",
            [analysisData],
            {
              fileName: file.name,
              difficulty: "medium",
              language: outputLanguage,
              pageAnalysesMap
            }
          );
          setStudyHistoryId(newHistoryId);
        }
      }

      toast.success(`Analysis complete for pages ${startPage} to ${endPage}! ${totalPagesToAnalyze - analyzedCount} pages skipped/failed.`);
    } catch (error) {
      console.error("Error in range analysis:", error);
      toast.error("Failed to complete range analysis");
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
      setShowPageRangeSelector(false);
    }
  };

  const handleDownloadAnalysis = async () => {
    try {
      const analysesToDownload = Array.from(pageAnalyses.values()).map(analysis => ({
        fileName: `Page ${analysis.pageNumber}`,
        keyPoints: analysis.keyPoints,
        studyPoints: analysis.studyPoints,
        summary: analysis.summary,
        tnpscRelevance: analysis.tnpscRelevance,
        tnpscCategories: []
      }));

      if (analysesToDownload.length === 0) {
        toast.error("No analyses available to download");
        return;
      }

      await downloadPDF({
        title: `PDF Analysis - ${file.name}`,
        content: analysesToDownload,
        type: 'analysis'
      });

      toast.success("Analysis downloaded successfully!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download analysis");
    }
  };

  const handleStartQuiz = () => {
    if (quizStartPage > quizEndPage) {
      toast.error("Start page cannot be greater than end page");
      return;
    }

    if (quizStartPage < 1 || quizEndPage > totalPages) {
      toast.error(`Page range must be between 1 and ${totalPages}`);
      return;
    }

    onStartQuiz({ start: quizStartPage, end: quizEndPage }, difficulty);
  };

  const currentAnalysis = getCurrentPageAnalysis();
  const analyzedPages = Array.from(pageAnalyses.keys()).sort((a, b) => a - b);
  const progressPercentage = (analyzedPages.length / totalPages) * 100;

  if (showPageRangeSelector) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-card to-background p-4">
        <div className="container mx-auto max-w-2xl space-y-6">
          <Card className="glass-card p-6 shadow-elegant-lg hover-lift">
            <div className="flex items-center gap-4 mb-4">
              <Button
                onClick={() => setShowPageRangeSelector(false)}
                className="theme-toggle"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="p-3 bg-gradient-to-r from-primary to-primary-glow rounded-lg shadow-md">
                <Target className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold gradient-text">Select Page Range</h1>
                <p className="text-muted-foreground">Choose which pages to analyze</p>
              </div>
            </div>
          </Card>

          <Card className="glass-card p-8 hover-lift shadow-elegant">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-foreground mb-2">Analyze Page Range</h2>
                <p className="text-muted-foreground">Select the pages you want to analyze for study points</p>
              </div>

              <div className="bg-gradient-to-r from-secondary/50 to-primary/5 p-4 rounded-xl border border-border/50">
                <div className="flex items-center justify-center gap-8">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{totalPages}</div>
                    <div className="text-sm text-primary-hover">Total Pages</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-secondary-foreground">{rangeEndPage - rangeStartPage + 1}</div>
                    <div className="text-sm text-secondary-hover">Selected Pages</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-accent-success">{analyzedPages.length}</div>
                    <div className="text-sm text-accent-success">Analyzed</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">
                    Start Page
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={rangeStartPage}
                    onChange={(e) => setRangeStartPage(Math.max(1, parseInt(e.target.value) || 1))}
                    className="input-elegant h-12 text-center text-lg font-semibold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">
                    End Page
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={rangeEndPage}
                    onChange={(e) => setRangeEndPage(Math.min(totalPages, parseInt(e.target.value) || 1))}
                    className="input-elegant h-12 text-center text-lg font-semibold"
                  />
                </div>
              </div>


              <div className="flex gap-4">
                <Button
                  onClick={() => setShowPageRangeSelector(false)}
                  variant="outline"
                  className="flex-1 btn-secondary"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={() => analyzePageRange(rangeStartPage, rangeEndPage)}
                  disabled={isAnalyzing || rangeStartPage > rangeEndPage}
                  className="flex-1 btn-primary"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Analyzing... ({Math.round(analysisProgress)}%)
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Analyze Pages
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="app-hero-bg">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <Card className="glass-card p-6 shadow-elegant-lg">
            <div className="flex items-center justify-between mb-4">
              <Button
                onClick={onReset}
                className="theme-toggle"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleDownloadAnalysis}
                  variant="outline"
                  size="sm"
                  disabled={pageAnalyses.size === 0}
                  className="btn-secondary"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Analysis
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-3 mb-4">
              <FileText className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-2xl font-bold text-foreground">PDF Page Navigator</h2>
                <p className="text-muted-foreground truncate">{file.name}</p>
              </div>
            </div>

            {/* Progress Overview */}
            <div className="bg-gradient-to-r from-secondary/50 to-primary/5 p-4 rounded-xl border border-border/50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-4">
                <div>
                  <div className="text-2xl font-bold text-primary">{totalPages}</div>
                  <div className="text-sm text-primary-hover">Total Pages</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-accent-success">{analyzedPages.length}</div>
                  <div className="text-sm text-accent-foreground">Analyzed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-secondary-foreground">{Math.round(progressPercentage)}%</div>
                  <div className="text-sm text-secondary-hover">Progress</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-warning">{analyzedPages.length > 0 ? "Ready" : "Start"}</div>
                  <div className="text-sm text-warning-foreground">TNPSC Focus</div>
                </div>
              </div>
              
              {totalPages > 0 && (
                <div>
                  <div className="flex justify-between text-sm text-foreground mb-2">
                    <span>Analysis Progress</span>
                    <span>{analyzedPages.length}/{totalPages} pages</span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>
              )}
            </div>
          </Card>

          {/* Analysis Progress - Consolidated with the one from range selector */}
          {isAnalyzing && (
            <Card className="glass-card p-6 shadow-elegant pulse-glow">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <h3 className="text-lg font-semibold text-foreground">Analyzing Pages...</h3>
                </div>
                <Progress value={analysisProgress} className="h-3" />
                <p className="text-sm text-muted-foreground">
                  Please wait while we analyze the selected pages for TNPSC study points.
                </p>
              </div>
            </Card>
          )}

          {/* Page Navigation */}
          <Card className="glass-card p-6 hover-lift shadow-elegant">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Navigate Pages</h3>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    variant="outline"
                    disabled={currentPage === 1}
                    size="sm"
                    className="theme-toggle w-10 h-10"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <span className="text-sm font-bold text-foreground px-3">
                    {currentPage} / {totalPages}
                  </span>
                  
                  <Button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    variant="outline"
                    disabled={currentPage === totalPages}
                    size="sm"
                    className="theme-toggle w-10 h-10"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center gap-2 flex-1 w-full">
                  <label className="text-sm font-medium text-foreground whitespace-nowrap">Go to:</label>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => onPageChange(parseInt(e.target.value) || 1)}
                    className="input-elegant flex-1"
                    placeholder="Page"
                  />
                </div>
                
                <Button
                  onClick={analyzeCurrentPage}
                  disabled={isAnalyzing || pageAnalyses.has(currentPage)}
                  className="btn-primary w-full sm:w-auto"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Analyzing...
                    </>
                  ) : pageAnalyses.has(currentPage) ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Analyzed
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Analyze Page {currentPage}
                    </>
                  )}
                </Button>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => setShowPageRangeSelector(true)}
                  variant="outline"
                  className="flex-1 btn-secondary"
                  disabled={isAnalyzing}
                >
                  <Target className="h-4 w-4 mr-2" />
                  Analyze Page Range
                </Button>
              </div>
            </div>
          </Card>

          {/* Current Page Analysis */}
          {currentAnalysis && (
            <Card className="glass-card p-6 shadow-elegant hover-lift">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-foreground">Page {currentPage} Analysis</h3>
                  <Badge className="status-success badge-elegant">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Analyzed
                  </Badge>
                </div>

                {/* TNPSC Relevance */}
                <div className="bg-warning/10 p-4 rounded-lg border-l-4 border-warning">
                  <h4 className="font-semibold text-warning-foreground mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    TNPSC Relevance
                  </h4>
                  <p className="text-muted-foreground">{currentAnalysis.tnpscRelevance}</p>
                </div>

                {/* Key Points */}
                <div>
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Key Study Points ({currentAnalysis.keyPoints.length})
                  </h4>
                  <div className="grid gap-3">
                    {currentAnalysis.keyPoints.map((point, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
                        <div className="w-6 h-6 bg-gradient-to-r from-primary to-secondary-foreground text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                          {index + 1}
                        </div>
                        <p className="text-foreground">{point}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Study Points */}
                {currentAnalysis.studyPoints.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-3">
                      Detailed Study Points ({currentAnalysis.studyPoints.length})
                    </h4>
                    <div className="space-y-4">
                      {currentAnalysis.studyPoints.map((point, index) => (
                        <div key={index} className="border-l-4 border-primary pl-4">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-semibold text-foreground">{point.title}</h5>
                            <Badge className={
                              point.importance === 'high' 
                                ? 'status-error badge-elegant' 
                                : point.importance === 'medium'
                                ? 'status-warning badge-elegant'
                                : 'status-success badge-elegant'
                            }>
                              {point.importance} priority
                            </Badge>
                          </div>
                          <p className="text-muted-foreground mb-2">{point.description}</p>
                          {point.memoryTip && (
                            <p className="text-sm text-primary-hover bg-secondary p-3 rounded-lg border-l-4 border-primary/50">
                              <strong>🧠 Memory Tip:</strong> {point.memoryTip}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className="bg-primary/10 p-4 rounded-lg">
                  <h4 className="font-semibold text-primary mb-2">Summary</h4>
                  <p className="text-primary-hover">{currentAnalysis.summary}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Analyzed Pages Overview */}
          {analyzedPages.length > 0 && (
            <Card className="glass-card p-6 shadow-elegant">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Analyzed Pages ({analyzedPages.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {analyzedPages.map((pageNum) => (
                  <Button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    className={currentPage === pageNum ? "btn-primary" : "btn-secondary"}
                  >
                    {pageNum}
                  </Button>
                ))}
              </div>
            </Card>
          )}

          {/* Quiz Generation */}
          {analyzedPages.length > 0 && (
            <Card className="glass-card p-6 bg-gradient-to-r from-accent/10 to-primary/10 hover-lift shadow-elegant">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-accent-success pulse-glow" />
                  <h3 className="text-lg font-bold text-foreground">Generate Practice Quiz</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Start Page</label>
                    <input
                      type="number"
                      min="1"
                      max={totalPages}
                      value={quizStartPage}
                      onChange={(e) => setQuizStartPage(Math.max(1, Math.min(totalPages, parseInt(e.target.value) || 1)))}
                      className="input-elegant w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">End Page</label>
                    <input
                      type="number"
                      min="1"
                      max={totalPages}
                      value={quizEndPage}
                      onChange={(e) => setQuizEndPage(Math.max(1, Math.min(totalPages, parseInt(e.target.value) || 1)))}
                      className="input-elegant w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Difficulty</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="input-elegant w-full"
                    >
                      <option value="easy">🟢 Easy</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="hard">🔴 Hard</option>
                      <option value="very-hard">⚫ Very Hard</option>
                    </select>
                  </div>
                </div>

                <div className="bg-card/50 p-4 rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-center mb-4">
                    <div>
                      <div className="text-xl font-bold text-primary">{quizEndPage - quizStartPage + 1}</div>
                      <div className="text-sm text-muted-foreground">Pages</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-accent-success">{difficulty.toUpperCase()}</div>
                      <div className="text-sm text-muted-foreground">Difficulty</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-secondary-foreground">TNPSC</div>
                      <div className="text-sm text-muted-foreground">Focused</div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleStartQuiz}
                    className="w-full btn-primary py-4"
                    disabled={quizStartPage > quizEndPage}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Generate Quiz (Pages {quizStartPage}-{quizEndPage})
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};