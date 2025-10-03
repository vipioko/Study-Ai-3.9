import React from "react";
import { useState } from "react";
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/config/firebase';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Image, Settings, Languages, Brain, Zap } from "lucide-react";
import { analyzeImage, analyzePdfContent, generateQuestions as generateQuestionsFromService } from "@/services/geminiService";
import { extractAllPdfText, findTotalPagesFromOcr, extractPageRangeFromOcr } from "@/utils/pdfReader";
import { toast } from "sonner";
import { useAppContext } from "@/contexts/AppContext";
import AnalysisResults from "./AnalysisResults";
import QuestionResults from "./QuestionResults";
import ModernQuizMode from "./ModernQuizMode";
import QuickAnalysisMode from "./QuickAnalysisMode";
import PageRangeSelector from "./PageRangeSelector";
import { PdfPageNavigator } from "./PdfPageNavigator";
import PdfResumeOptions from "./PdfResumeOptions";
import FileRecognitionModal from "./FileRecognitionModal";
import AdvancedAnalyzingState from "./AdvancedAnalyzingState";
import { getStudyHistoryForFile } from "@/services/studyHistoryService";

export interface AnalysisResult {
  keyPoints: string[];
  summary: string;
  tnpscRelevance: string;
  studyPoints: StudyPoint[];
  tnpscCategories: string[];
  language?: string;
  mainTopic?: string;
}

export interface StudyPoint {
  title: string;
  description: string;
  importance: "high" | "medium" | "low";
  memoryTip?: string;
}

export interface Question {
  question: string;
  options?: string[];
  answer: string;
  type: "mcq" | "assertion_reason";
  difficulty: string;
  tnpscGroup: string;
  explanation?: string;
  tamilQuestion?: string;
  tamilOptions?: string[];
}

export interface QuestionResult {
  questions: Question[];
  summary: string;
  keyPoints: string[];
  difficulty: string;
  totalQuestions?: number;
}

const StudyAssistant = () => {
  const [user] = useAuthState(auth);
  
  const {
    selectedFiles,
    setSelectedFiles,
    analysisResults,
    setAnalysisResults,
    questionResult,
    setQuestionResult,
    difficulty,
    setDifficulty,
    outputLanguage,
    setOutputLanguage,
    clearAppState
  } = useAppContext();

  const [currentView, setCurrentView] = useState<"upload" | "analysis" | "questions" | "quiz" | "quick-analysis" | "pdf-page-select" | "comprehensive-pdf" | "pdf-navigator" | "pdf-resume-options" | "quiz-page-select" | "old-pdf-page-select" | "page-range-quiz" | "file-recognition">("upload");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState("");
  const [pdfInfo, setPdfInfo] = useState<{file: File; totalPages: number} | null>(null);
  const [pdfFullText, setPdfFullText] = useState<string>("");
  const [existingStudyHistory, setExistingStudyHistory] = useState<{
    id: string;
    pageAnalysesMap: Map<number, any>;
    analyzedPages: number[];
    lastAnalyzed: Date;
  } | null>(null);
  const [isGeneratingNextPage, setIsGeneratingNextPage] = useState(false);
  const [isProcessingPageRange, setIsProcessingPageRange] = useState(false);
  const [pdfCurrentPage, setPdfCurrentPage] = useState(1);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => 
      file.type.startsWith('image/') || file.type === 'application/pdf'
    );
    if (validFiles.length !== fileArray.length) {
      toast.error("Only image files (PNG, JPG, etc.) and PDF files are supported");
    }
    setSelectedFiles(validFiles);
  };

  const analyzeFiles = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select files to analyze");
      return;
    }
    const pdfFile = selectedFiles.find(file => file.type === 'application/pdf');
    if (pdfFile) {
      try {
        const fullText = await extractAllPdfText(pdfFile);
        const totalPages = findTotalPagesFromOcr(fullText);
        if (totalPages > 0) {
          setPdfInfo({ file: pdfFile, totalPages });
          setPdfFullText(fullText);
          const buffer = await pdfFile.arrayBuffer();
          const hash = await crypto.subtle.digest('SHA-256', buffer);
          const hashArray = Array.from(new Uint8Array(hash));
          const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          const existingHistory = await getStudyHistoryForFile(user?.uid || '', pdfFile.name, fileHash, pdfFile.size);
          if (existingHistory && existingHistory.pageAnalysesMap && Object.keys(existingHistory.pageAnalysesMap).length > 0) {
            const pageAnalysesMap = new Map();
            const analyzedPages: number[] = [];
            Object.entries(existingHistory.pageAnalysesMap).forEach(([pageNum, analysis]) => {
              const pageNumber = parseInt(pageNum);
              pageAnalysesMap.set(pageNumber, analysis);
              analyzedPages.push(pageNumber);
            });
            setExistingStudyHistory({
              id: existingHistory.id!,
              pageAnalysesMap,
              analyzedPages,
              lastAnalyzed: existingHistory.timestamp.toDate()
            });
            setCurrentView("file-recognition");
          } else {
            setCurrentView("pdf-navigator");
          }
        } else {
          toast.error("Unable to process PDF. It might be empty or corrupted.");
        }
      } catch (error) {
        console.error("PDF analysis error:", error);
        toast.error("Failed to analyze PDF. Please try again.");
      }
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setAnalysisStep("Initializing analysis...");
    try {
      const results: AnalysisResult[] = [];
      const totalFiles = selectedFiles.filter(f => f.type.startsWith('image/')).length;
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        if (file.type.startsWith('image/')) {
          setAnalysisStep(`Analyzing image ${i + 1} of ${totalFiles}...`);
          const result = await analyzeImage(file, outputLanguage);
          results.push({ ...result, language: outputLanguage, mainTopic: result.studyPoints?.[0]?.title || "Study Material" });
          setAnalysisProgress(((i + 1) / totalFiles) * 100);
        }
      }
      setAnalysisResults(results);
      setCurrentView("analysis");
      toast.success("Analysis completed successfully!");
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to analyze files. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateQuestionsFromAnalysis = async () => {
    if (analysisResults.length === 0) return;
    setIsGeneratingQuestions(true);
    try {
      const result = await generateQuestionsFromService(analysisResults, difficulty, outputLanguage);
      if (result.error) throw new Error(result.error);
      setQuestionResult({ ...result, totalQuestions: result.questions?.length || 0 });
      setCurrentView("questions");
      toast.success("Questions generated successfully!");
    } catch (error) {
      console.error("Question generation error:", error);
      toast.error(`Failed to generate questions: ${(error as Error).message}`);
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const startQuickAnalysis = () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select files first");
      return;
    }
    setCurrentView("quick-analysis");
  };

  const handleQuickAnalysisQuiz = (result: QuestionResult) => {
    setQuestionResult({ ...result, totalQuestions: result.questions?.length || 0 });
    setCurrentView("quiz");
  };

  React.useEffect(() => {
    if (questionResult && currentView === "upload") {
      setCurrentView("quiz");
    }
  }, [questionResult, currentView]);

  const handlePdfNavigatorQuiz = async (pageRange: { start: number; end: number }, difficulty: string) => {
    if (!pdfInfo) return;
    
    setIsGeneratingQuestions(true);
    try {
        const fullText = pdfFullText;
        const pageContent = extractPageRangeFromOcr(fullText, pageRange.start, pageRange.end);

        if (!pageContent.trim()) {
            toast.error(`No text content found in the selected page range (${pageRange.start}-${pageRange.end}).`);
            setIsGeneratingQuestions(false);
            return;
        }

        // For question papers, we pass the raw text. For study material, we pass analysis.
        // A simple heuristic: check for question-like patterns.
        const isQuestionPaper = /q\)|question:|^\d+\./im.test(pageContent.substring(0, 1000));

        let result;
        if (isQuestionPaper) {
            console.log("Detected question paper format. Extracting questions directly.");
            result = await generateQuestionsFromService([], difficulty, outputLanguage, pageContent);
        } else {
            console.log("Detected study material format. Analyzing content first.");
            const analysisResult = await analyzePdfContent(pageContent, outputLanguage);
            result = await generateQuestionsFromService([analysisResult], difficulty, outputLanguage);
        }

        if (result.error) {
            throw new Error(result.error);
        }

        if (!result.questions || result.questions.length === 0) {
            toast.warn("No questions could be generated from the selected content.");
            setIsGeneratingQuestions(false);
            return;
        }

        setQuestionResult({
            ...result,
            totalQuestions: result.questions.length
        });
        setCurrentView("questions");
        toast.success(`Quiz generated for pages ${pageRange.start} to ${pageRange.end}!`);

    } catch (error) {
      console.error("Question generation error in handlePdfNavigatorQuiz:", error);
      const errorMessage = (error as Error).message || '';

      if (errorMessage.includes('MAX_TOKENS') || errorMessage.includes('token limit')) {
        toast.error("Content is too large for the AI. Please try a smaller page range (e.g., 1-3 pages).");
      } else if (errorMessage.includes('malformed JSON') || errorMessage.includes('Unterminated string')) {
        toast.error("The AI response was incomplete. Please try again, or use a smaller page range.");
      } else if (errorMessage.includes('SAFETY')) {
        toast.error("Content was blocked by safety filters. Please try a different section.");
      } else if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
        toast.error("API limit reached. Please wait a moment and try again.");
      } else {
        toast.error("Failed to generate questions. Please try again.");
      }
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const handlePageRangeConfirm = (startPage: number, endPage: number) => {
    setCurrentView("pdf-navigator");
  };

  const resetToUpload = () => {
    clearAppState();
    setExistingStudyHistory(null);
    setPdfInfo(null);
    setPdfFullText("");
    setCurrentView("upload");
  };

  const startQuizFromAnalysis = () => {
    if (questionResult) {
      setCurrentView("quiz");
    }
  };
  
  const handleContinueFromRecognition = () => {
    if (pdfInfo && existingStudyHistory) {
      setCurrentView("pdf-navigator");
    }
  };

  const handleStartNewFromRecognition = () => {
    setExistingStudyHistory(null);
    if (pdfInfo) {
      setCurrentView("pdf-navigator");
    }
  };
  
  const handleCancelRecognition = () => {
    resetToUpload();
  };

  // --- RENDER LOGIC ---

  if (isAnalyzing || isGeneratingNextPage) {
    return (
      <AdvancedAnalyzingState
        progress={analysisProgress}
        step={analysisStep}
        analysisType="detailed"
        fileName={selectedFiles[0]?.name}
      />
    );
  }

  if (currentView === "quick-analysis") {
    return (
      <QuickAnalysisMode
        files={selectedFiles}
        difficulty={difficulty}
        outputLanguage={outputLanguage}
        onStartQuiz={handleQuickAnalysisQuiz}
        onReset={resetToUpload}
      />
    );
  }

  if (currentView === "quiz" && questionResult) {
    return (
      <ModernQuizMode
        result={questionResult}
        onReset={resetToUpload}
        onBackToAnalysis={() => setCurrentView("analysis")}
        difficulty={difficulty}
        outputLanguage={outputLanguage}
      />
    );
  }

  if (currentView === "questions" && questionResult) {
    return (
      <QuestionResults
        result={questionResult}
        onReset={resetToUpload}
        selectedFiles={selectedFiles}
        onStartQuiz={startQuizFromAnalysis}
      />
    );
  }

  if (currentView === "analysis" && analysisResults.length > 0) {
    return (
      <AnalysisResults
        result={analysisResults[0]}
        onReset={resetToUpload}
        selectedFiles={selectedFiles}
        onGenerateQuestions={generateQuestionsFromAnalysis}
        isGeneratingQuestions={isGeneratingQuestions}
      />
    );
  }

  if (currentView === "pdf-navigator" && pdfInfo) {
    return (
      <PdfPageNavigator
        file={pdfInfo.file}
        totalPages={pdfInfo.totalPages}
        fullText={pdfFullText}
        outputLanguage={outputLanguage}
        onReset={resetToUpload}
        onStartQuiz={handlePdfNavigatorQuiz}
        isGeneratingQuiz={isGeneratingQuestions}
        initialPageAnalyses={existingStudyHistory?.pageAnalysesMap}
        initialStudyHistoryId={existingStudyHistory?.id}
        currentPage={pdfCurrentPage}
        onPageChange={setPdfCurrentPage}
        initialShowPageRangeSelector={!existingStudyHistory}
        isContinueAnalysis={!!existingStudyHistory}
      />
    );
  }

  if (currentView === "pdf-resume-options" && pdfInfo && existingStudyHistory) {
    return (
      <PdfResumeOptions
        fileName={pdfInfo.file.name}
        totalPages={pdfInfo.totalPages}
        analyzedPages={existingStudyHistory.analyzedPages}
        lastAnalyzed={existingStudyHistory.lastAnalyzed}
        onResumeAnalysis={handleContinueFromRecognition}
        onStartNewAnalysis={handleStartNewFromRecognition}
        onBack={resetToUpload}
      />
    );
  }

  if (currentView === "pdf-page-select" && pdfInfo) {
    return (
      <PageRangeSelector
        totalPages={pdfInfo.totalPages}
        onConfirm={handlePageRangeConfirm}
        onBack={resetToUpload}
        title="Select PDF Pages"
        description="Choose which pages to analyze for TNPSC preparation"
        isProcessing={isProcessingPageRange}
      />
    );
  }

  if (currentView === "file-recognition" && pdfInfo && existingStudyHistory) {
    return (
      <FileRecognitionModal
        fileName={pdfInfo.file.name}
        totalPages={pdfInfo.totalPages}
        analyzedPages={existingStudyHistory.analyzedPages.length}
        lastAnalyzed={existingStudyHistory.lastAnalyzed}
        onContinue={handleContinueFromRecognition}
        onStartNew={handleStartNewFromRecognition}
        onCancel={handleCancelRecognition}
      />
    );
  }
  
  // --- DEFAULT UPLOAD VIEW ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 relative overflow-hidden">
        {/* UI Elements remain unchanged, so they are omitted for brevity */}
        {/* ... Paste your existing JSX for the upload view here ... */}
    </div>
  );
};

export default StudyAssistant;