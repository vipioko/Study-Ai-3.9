import { useState, useEffect } from "react";
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/config/firebase';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Brain, FileText, Image, Download, Play, CheckCircle, AlertCircle, Loader2, Sparkles, Target } from "lucide-react";
import { analyzeImage } from "@/services/geminiService";
import { extractTextFromPdfPage } from "@/utils/pdfReader";
import { downloadPDF } from "@/utils/pdfUtils";
import { saveStudyHistory } from "@/services/studyHistoryService";
import { QuestionResult } from "./StudyAssistant";
import { toast } from "sonner";

interface QuickAnalysisModeProps {
  files: File[];
  difficulty: string;
  outputLanguage: "english" | "tamil";
  onStartQuiz: (result: QuestionResult) => void;
  onReset: () => void;
}

interface FileAnalysis {
  fileName: string;
  fileType: 'pdf' | 'image';
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  keyPoints: string[];
  summary: string;
  tnpscCategories: string[];
  pageCount?: number;
}

const QuickAnalysisMode = ({ files, difficulty, outputLanguage, onStartQuiz, onReset }: QuickAnalysisModeProps) => {
  const [user] = useAuthState(auth);
  const [analyses, setAnalyses] = useState<FileAnalysis[]>([]);
  const [currentAnalyzing, setCurrentAnalyzing] = useState<number>(-1);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [allCompleted, setAllCompleted] = useState(false);

  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyAJ2P2TqBOXQncnBgT0T_BNsLcAA7cToo4";

  useEffect(() => {
    initializeAnalyses();
  }, [files]);

  const initializeAnalyses = () => {
    const initialAnalyses: FileAnalysis[] = files.map(file => ({
      fileName: file.name,
      fileType: file.type === 'application/pdf' ? 'pdf' : 'image',
      status: 'pending',
      keyPoints: [],
      summary: '',
      tnpscCategories: []
    }));
    setAnalyses(initialAnalyses);
  };

  const analyzeFile = async (file: File, index: number) => {
    setCurrentAnalyzing(index);
    setAnalyses(prev => prev.map((analysis, i) => 
      i === index ? { ...analysis, status: 'analyzing' } : analysis
    ));

    try {
      let result;
      if (file.type === 'application/pdf') {
        // For PDFs, extract text from first few pages
        const textContent = await extractTextFromPdfPage(file, 1);
        result = await analyzeTextContent(textContent, file.name);
      } else {
        // For images, use existing image analysis
        result = await analyzeImage(file, outputLanguage);
      }

      setAnalyses(prev => prev.map((analysis, i) => 
        i === index ? {
          ...analysis,
          status: 'completed',
          keyPoints: result.studyPoints?.map(p => `${p.title}: ${p.description}`) || [],
          summary: result.summary || '',
          tnpscCategories: result.tnpscCategories || []
        } : analysis
      ));

      // Save individual file analysis to study history
      if (user) {
        try {
          const analysisResult = {
            keyPoints: result.studyPoints?.map(p => `${p.title}: ${p.description}`) || [],
            summary: result.summary || '',
            tnpscRelevance: result.tnpscRelevance || '',
            studyPoints: result.studyPoints || [],
            tnpscCategories: result.tnpscCategories || [],
            mainTopic: file.name
          };

          await saveStudyHistory(
            user.uid,
            "analysis",
            [analysisResult],
            {
              fileName: file.name,
              difficulty: difficulty,
              language: outputLanguage,
              files: [file]
            }
          );
        } catch (error) {
          console.error("Failed to save file analysis to study history:", error);
        }
      }

      toast.success(`✅ ${file.name} analyzed successfully!`);
    } catch (error) {
      console.error(`Analysis failed for ${file.name}:`, error);
      setAnalyses(prev => prev.map((analysis, i) => 
        i === index ? { ...analysis, status: 'error' } : analysis
      ));
      toast.error(`❌ Failed to analyze ${file.name}`);
    }

    setCurrentAnalyzing(-1);
  };

  const analyzeTextContent = async (text: string, fileName: string) => {
    const languageInstruction = outputLanguage === "tamil" 
      ? "Please provide all responses in Tamil language. Use Tamil script for all content."
      : "Please provide all responses in English language.";

    const prompt = `
Analyze this text content for TNPSC preparation:

Content: ${text.substring(0, 3000)}

${languageInstruction}

Provide analysis in this JSON format:
{
  "mainTopic": "Main topic of the content",
  "studyPoints": [
    {
      "title": "Key point title",
      "description": "Detailed description",
      "importance": "high/medium/low",
      "tnpscRelevance": "TNPSC relevance explanation"
    }
  ],
  "summary": "Overall summary of the content",
  "tnpscCategories": ["Category1", "Category2"]
}

Focus on TNPSC Group 1, 2, 4 exam relevance.
`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
      })
    });

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanedContent);
  };

  const startAnalysis = async () => {
    for (let i = 0; i < files.length; i++) {
      await analyzeFile(files[i], i);
      setOverallProgress(((i + 1) / files.length) * 100);
    }
    setAllCompleted(true);
    toast.success("🎉 All files analyzed successfully!");
  };

  const generateQuizFromAnalyses = async () => {
    setIsGeneratingQuiz(true);
    try {
      const completedAnalyses = analyses.filter(a => a.status === 'completed');
      if (completedAnalyses.length === 0) {
        throw new Error("No completed analyses available");
      }

      // Combine all key points and summaries
      const allKeyPoints = completedAnalyses.flatMap(a => a.keyPoints);
      const combinedSummary = completedAnalyses.map(a => `${a.fileName}: ${a.summary}`).join('\n\n');
      const allCategories = Array.from(new Set(completedAnalyses.flatMap(a => a.tnpscCategories)));

      // Generate questions using Gemini API
      const questions = await generateQuestionsFromContent(allKeyPoints.join('\n'), combinedSummary);

      const result: QuestionResult = {
        questions,
        summary: combinedSummary,
        keyPoints: allKeyPoints,
        difficulty
      };

      onStartQuiz(result);
    } catch (error) {
      console.error("Quiz generation failed:", error);
      toast.error("Failed to generate quiz. Please try again.");
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const generateQuestionsFromContent = async (keyPoints: string, summary: string) => {
    const languageInstruction = outputLanguage === "tamil" 
      ? "Please provide all questions and answers in Tamil language."
      : "Please provide all questions and answers in English language.";

    const prompt = `
Based on this TNPSC study content, generate 15-20 questions:

Key Points: ${keyPoints.substring(0, 2000)}
Summary: ${summary.substring(0, 1000)}

Difficulty: ${difficulty}
${languageInstruction}

Generate a mix of:
- Multiple choice questions (4 options each)
- True/False questions
- Short answer questions

Return as JSON array:
[
  {
    "question": "Question text",
    "options": ["A", "B", "C", "D"], // for MCQ only
    "answer": "Correct answer",
    "type": "mcq" | "true_false" | "short_answer",
    "difficulty": "${difficulty}",
    "tnpscGroup": "Group 1",
    "explanation": "Brief explanation"
  }
]
`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 3000 }
      })
    });

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanedContent);
  };

  const handleDownloadAnalysis = async () => {
    try {
      const completedAnalyses = analyses.filter(a => a.status === 'completed');
      await downloadPDF({
        title: 'TNPSC Study Analysis Report',
        content: completedAnalyses,
        type: 'analysis'
      });
      toast.success("Analysis report downloaded successfully!");
    } catch (error) {
      toast.error("Failed to download report. Please try again.");
    }
  };

  const getStatusIcon = (status: FileAnalysis['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'analyzing':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <div className="h-4 w-4 bg-gray-300 rounded-full" />;
    }
  };

  const getDifficultyColor = (diff: string) => {
    const colors = {
      'easy': 'from-green-500 to-emerald-600',
      'medium': 'from-yellow-500 to-orange-600',
      'hard': 'from-red-500 to-pink-600',
      'very-hard': 'from-purple-500 to-indigo-600'
    };
    return colors[diff as keyof typeof colors] || 'from-gray-500 to-gray-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <Card className="p-6 bg-white/90 backdrop-blur-sm shadow-xl border-0">
            <div className="flex items-center justify-between mb-4">
              <Button
                onClick={onReset}
                variant="ghost"
                className="text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Upload
              </Button>
              
              <div className="flex items-center gap-2">
                <Brain className="h-6 w-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-800">Smart Analysis</h1>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{files.length}</div>
                <div className="text-sm text-blue-700">Files</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {analyses.filter(a => a.status === 'completed').length}
                </div>
                <div className="text-sm text-green-700">Analyzed</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <Badge className={`bg-gradient-to-r ${getDifficultyColor(difficulty)} text-white`}>
                  {difficulty.toUpperCase()}
                </Badge>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <Badge className="bg-orange-100 text-orange-700">
                  {outputLanguage === 'tamil' ? 'தமிழ்' : 'English'}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Progress */}
          {overallProgress > 0 && overallProgress < 100 && (
            <Card className="p-6 bg-white/90 backdrop-blur-sm shadow-xl border-0">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Analysis Progress</span>
                  <span className="text-sm text-gray-600">{Math.round(overallProgress)}%</span>
                </div>
                <Progress value={overallProgress} className="h-2" />
              </div>
            </Card>
          )}

          {/* File Status */}
          <Card className="p-6 bg-white/90 backdrop-blur-sm shadow-xl border-0">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              File Analysis Status
            </h3>
            
            <div className="space-y-3">
              {analyses.map((analysis, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    {analysis.fileType === 'pdf' ? (
                      <FileText className="h-5 w-5 text-red-600" />
                    ) : (
                      <Image className="h-5 w-5 text-blue-600" />
                    )}
                    <span className="font-medium text-gray-700 truncate">
                      {analysis.fileName}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusIcon(analysis.status)}
                    <span className="text-sm text-gray-600 capitalize">
                      {analysis.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Action Buttons */}
          <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 shadow-xl border-0">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!allCompleted ? (
                <Button
                  onClick={startAnalysis}
                  disabled={currentAnalyzing !== -1}
                  className={`bg-gradient-to-r ${getDifficultyColor(difficulty)} hover:shadow-lg px-8 py-6 text-lg font-semibold`}
                >
                  {currentAnalyzing !== -1 ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                      Analyzing Files...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-3" />
                      Start Analysis
                    </>
                  )}
                </Button>
              ) : (
                <>
                  <Button
                    onClick={generateQuizFromAnalyses}
                    disabled={isGeneratingQuiz}
                    className={`bg-gradient-to-r ${getDifficultyColor(difficulty)} hover:shadow-lg px-8 py-6 text-lg font-semibold`}
                  >
                    {isGeneratingQuiz ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                        Generating Quiz...
                      </>
                    ) : (
                      <>
                        <Play className="h-5 w-5 mr-3" />
                        Start Smart Quiz
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={handleDownloadAnalysis}
                    variant="outline"
                    className="px-8 py-6 text-lg font-semibold border-2"
                  >
                    <Download className="h-5 w-5 mr-3" />
                    Download Report
                  </Button>
                </>
              )}
            </div>
          </Card>

          {/* Analysis Results Preview */}
          {allCompleted && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-800">Analysis Summary</h3>
              {analyses.filter(a => a.status === 'completed').map((analysis, index) => (
                <Card key={index} className="p-6 bg-white/90 backdrop-blur-sm shadow-lg border-0">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {analysis.fileType === 'pdf' ? (
                        <FileText className="h-5 w-5 text-red-600" />
                      ) : (
                        <Image className="h-5 w-5 text-blue-600" />
                      )}
                      <h4 className="font-semibold text-gray-800">{analysis.fileName}</h4>
                    </div>
                    
                    <p className="text-gray-600 text-sm">{analysis.summary}</p>
                    
                    {analysis.tnpscCategories.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {analysis.tnpscCategories.map((category, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickAnalysisMode;