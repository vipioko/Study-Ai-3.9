// src/components/admin/StudyHistory.tsx

import { useState, useEffect } from "react";
import html2canvas from 'html2canvas'; // <<< NEW IMPORT
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { History, Download, Trash2, Calendar, FileText, Trophy, Filter, Search, RefreshCw, Play } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/config/firebase";
import { getStudyHistory, deleteStudyHistory, StudyHistoryRecord } from "@/services/studyHistoryService";
import { toast } from "sonner";
import { downloadImageAsPDF, PDFContent } from "@/utils/pdfUtils"; // <<< UPDATED IMPORT
import { useAppContext } from "@/contexts/AppContext";
import { generateQuestions } from "@/services/geminiService";
import { QuestionResult } from "./StudyAssistant";
import { AnalysisResult, StudyPoint } from "./StudyAssistant"; // Assuming StudyAssistant is in the same directory


// Component to render the record data in a hidden div for html2canvas
interface RecordContentRendererProps {
  record: StudyHistoryRecord;
}

// NOTE: This component MUST be rendered in the main JSX of StudyHistory. 
// However, since I cannot modify the main JSX, I am including the logic 
// to be inserted where it can render the content.
const RecordContentRenderer: React.FC<RecordContentRendererProps> = ({ record }) => {
    // This logic must exactly match the content structure you want in the PDF
    const data = record.type === "quiz" ? record.quizData : record.analysisData;
    const title = record.type === "quiz" ? `Quiz Results` : `Study Analysis`;

    if (!data) return null;

    return (
        <div id={`record-content-${record.id}`} className="p-8 bg-white text-black max-w-4xl mx-auto" style={{
            // Critical styles for rendering the canvas correctly
            fontFamily: 'Noto Sans Tamil, Arial, sans-serif', 
            fontSize: '12pt',
            lineHeight: '1.5',
            padding: '2rem'
        }}>
            <h1 style={{ fontSize: '24pt', fontWeight: 'bold', marginBottom: '1rem' }}>{title}</h1>
            <p style={{ marginBottom: '0.5rem' }}>**File:** {record.fileName || 'N/A'}</p>
            <p style={{ marginBottom: '1rem' }}>**Date:** {record.timestamp.toDate().toLocaleString()}</p>
            
            {/* RENDER ANALYSIS CONTENT */}
            {record.type === "analysis" && Array.isArray(data) && data.map((analysis: AnalysisResult, index) => (
                <div key={index} style={{ marginBottom: '2rem', borderTop: '1px solid #ccc', paddingTop: '1rem' }}>
                    <h2 style={{ fontSize: '18pt', fontWeight: 'bold', marginBottom: '0.5rem' }}>{analysis.mainTopic || `Analysis ${index + 1}`}</h2>
                    
                    <h3 style={{ fontSize: '14pt', fontWeight: 'bold', marginTop: '1rem' }}>Summary:</h3>
                    <p>{analysis.summary}</p>

                    <h3 style={{ fontSize: '14pt', fontWeight: 'bold', marginTop: '1rem' }}>Study Points:</h3>
                    <ul style={{ paddingLeft: '20px' }}>
                        {analysis.studyPoints && analysis.studyPoints.map((point: StudyPoint, pointIndex) => (
                            <li key={pointIndex} style={{ marginBottom: '0.5rem' }}>
                                <p style={{ fontWeight: 'bold' }}>{point.title}</p>
                                <p style={{ marginLeft: '10px' }}>{point.description}</p>
                                <p style={{ marginLeft: '10px', fontStyle: 'italic', color: '#666' }}>🧠 Tip: {point.memoryTip}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
            
            {/* RENDER QUIZ CONTENT (Simplified) */}
            {record.type === "quiz" && (
                <div style={{ marginBottom: '2rem', borderTop: '1px solid #ccc', paddingTop: '1rem' }}>
                    <h2 style={{ fontSize: '18pt', fontWeight: 'bold', marginBottom: '0.5rem' }}>Quiz Results: {data.score}/{data.totalQuestions} ({data.percentage}%)</h2>
                    {data.answers && data.answers.map((answer: any, index: number) => (
                        <div key={index} style={{ marginBottom: '1rem' }}>
                            <p style={{ fontWeight: 'bold', color: answer.isCorrect ? 'green' : 'red' }}>
                                {index + 1}. {answer.question.question}
                            </p>
                            <p style={{ marginLeft: '10px' }}>Your Answer: {answer.userAnswer}</p>
                            {!answer.isCorrect && (
                                <p style={{ marginLeft: '10px', fontWeight: 'bold', color: 'green' }}>Correct Answer: {answer.correctAnswer}</p>
                            )}
                            <p style={{ marginLeft: '10px', fontStyle: 'italic' }}>Explanation: {answer.question.explanation}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
// ========================================================================


const StudyHistory = () => {
  const [user] = useAuthState(auth);
  const [studyHistory, setStudyHistory] = useState<StudyHistoryRecord[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<StudyHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<"all" | "analysis" | "quiz">("all");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [filterLanguage, setFilterLanguage] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isRetakingQuiz, setIsRetakingQuiz] = useState<string | null>(null);
  
  const { setQuestionResult, setDifficulty, setOutputLanguage } = useAppContext();

  useEffect(() => {
    if (user) {
      fetchStudyHistory();
    } else {
      setIsLoading(false); // Stop loading if there's no user
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [studyHistory, filterType, filterDifficulty, filterLanguage, searchTerm]);

  const applyFilters = () => {
    let filtered = [...studyHistory];

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter(record => record.type === filterType);
    }

    // Filter by difficulty
    if (filterDifficulty !== "all") {
      filtered = filtered.filter(record => record.difficulty === filterDifficulty);
    }

    // Filter by language
    if (filterLanguage !== "all") {
      filtered = filtered.filter(record => record.language === filterLanguage);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(record => 
        record.fileName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredHistory(filtered);
  };

  const fetchStudyHistory = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const history = await getStudyHistory(user.uid);
      
      // Keep Firestore timestamps as they are - they have toDate() method
      const processedHistory = history.map(record => ({
        ...record,
        timestamp: record.timestamp // Keep as Firestore Timestamp
      }));
      
      setStudyHistory(processedHistory);
    } catch (error) {
      console.error("Error fetching study history:", error);
      toast.error("Failed to load study history");
    } finally {
      setIsLoading(false);
    }
  };

  // ========================================================================
  // *** CRITICAL DOWNLOAD FUNCTION WITH HTML2CANVAS FIX ***
  // ========================================================================
  const handleDownload = async (record: StudyHistoryRecord) => {
    // 1. Locate the hidden content renderer for the specific record
    const contentElement = document.getElementById(`record-content-${record.id}`); 
    
    if (!contentElement) {
        toast.error("Error: Content rendering failed for download. Element not found.");
        return;
    }

    try {
        toast.info("Capturing content for PDF generation...");
        
        // 2. Use html2canvas to capture the entire DOM element
        const canvas = await html2canvas(contentElement, {
            scale: 2, // Higher scale for better resolution
            useCORS: true,
            // Scroll to the top of the element before capture
            windowWidth: contentElement.scrollWidth,
            windowHeight: contentElement.scrollHeight,
        });

        const base64Image = canvas.toDataURL('image/jpeg', 1.0);
        
        // 3. Call the new utility function
        const title = `${record.type === 'quiz' ? 'Quiz-Results' : 'Analysis'}-${record.fileName || 'Data'}-${record.timestamp.toDate().toLocaleDateString()}`;

        await downloadImageAsPDF({ 
            title, 
            base64Image 
        });
        
        toast.success("Downloaded successfully!");

    } catch (error) {
        console.error("Download error:", error);
        toast.error(`Failed to download PDF. Please ensure 'html2canvas' is installed and check console for errors.`);
    }
  };
  // ========================================================================

  const handleDelete = async (recordId: string) => {
    try {
      const record = studyHistory.find(r => r.id === recordId);
      await deleteStudyHistory(recordId, record?.fileUrls);
      setStudyHistory(prev => prev.filter(record => record.id !== recordId));
      toast.success("Record deleted successfully");
    } catch (error) {
      toast.error("Failed to delete record");
    }
  };

  const handleRetakeQuiz = async (record: StudyHistoryRecord) => {
    if (!record.analysisData) {
      toast.error("Cannot retake quiz: Original analysis data not found");
      return;
    }

    setIsRetakingQuiz(record.id!);
    try {
      const result = await generateQuestions([{
        keyPoints: record.analysisData.keyPoints || [],
        studyPoints: record.analysisData.studyPoints || [],
        summary: record.analysisData.summary || '',
        tnpscRelevance: 'TNPSC relevant content',
        tnpscCategories: record.analysisData.tnpscCategories || [],
        mainTopic: record.analysisData.mainTopic || 'Study Material'
      }], record.difficulty, record.language as "english" | "tamil");
      
      setQuestionResult({
        ...result,
        totalQuestions: result.questions?.length || 0
      });
      setDifficulty(record.difficulty);
      setOutputLanguage(record.language as "english" | "tamil");
      
      toast.success("New quiz generated! Starting quiz...");
      // The parent component will handle navigation to quiz mode
    } catch (error) {
      console.error("Error generating retake quiz:", error);
      toast.error("Failed to generate new quiz. Please try again.");
    } finally {
      setIsRetakingQuiz(null);
    }
  };

  const clearFilters = () => {
    setFilterType("all");
    setFilterDifficulty("all");
    setFilterLanguage("all");
    setSearchTerm("");
  };

  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return "text-green-600 bg-green-50";
    if (percentage >= 60) return "text-blue-600 bg-blue-50";
    if (percentage >= 40) return "text-orange-600 bg-orange-50";
    return "text-red-600 bg-red-50";
  };

  const getUniqueValues = (key: keyof StudyHistoryRecord) => {
    const values = studyHistory.map(record => record[key]).filter(Boolean);
    return [...new Set(values)];
  };

  const analysisRecords = filteredHistory.filter(h => h.type === "analysis");
  const quizRecords = filteredHistory.filter(h => h.type === "quiz");

  if (!user && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <Card className="p-8 max-w-md mx-auto text-center">
          <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Login Required</h3>
          <p className="text-gray-600">Please login to view your study history.</p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your study history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-gradient-to-br from-green-400/15 to-emerald-400/15 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
        <div className="absolute bottom-1/3 right-1/3 w-64 h-64 bg-gradient-to-br from-orange-400/15 to-yellow-400/15 rounded-full blur-3xl animate-pulse" style={{animationDelay: '6s'}}></div>
      </div>
      
      {/* 4. INSERT HIDDEN RENDERER FOR HTML2CANVAS */}
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
          {filteredHistory.map(record => (
              <RecordContentRenderer key={`renderer-${record.id}`} record={record} />
          ))}
      </div>


      <div className="container mx-auto px-4 py-6 relative z-10">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <Card className="glass-card p-6 animate-fadeInUp">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg shadow-lg">
                <History className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold gradient-text">Study History</h1>
            </div>
            <p className="text-gray-600">
              Track your learning progress and access previous study sessions
            </p>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 stagger-animation">
              <div className="text-center p-4 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl text-white shadow-lg hover-lift">
                <div className="text-2xl font-bold">{studyHistory.length}</div>
                <div className="text-sm opacity-90">Total Sessions</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-400 to-green-600 rounded-xl text-white shadow-lg hover-lift" style={{animationDelay: '0.1s'}}>
                <div className="text-2xl font-bold">
                  {analysisRecords.length}
                </div>
                <div className="text-sm opacity-90">Analyses</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl text-white shadow-lg hover-lift" style={{animationDelay: '0.2s'}}>
                <div className="text-2xl font-bold">
                  {quizRecords.length}
                </div>
                <div className="text-sm opacity-90">Quizzes</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl text-white shadow-lg hover-lift" style={{animationDelay: '0.3s'}}>
                <div className="text-2xl font-bold">
                  {Math.round(quizRecords.reduce((acc, h) => 
                    acc + (h.score || 0) / (h.totalQuestions || 1), 0
                  ) / Math.max(quizRecords.length, 1) * 100) || 0}%
                </div>
                <div className="text-sm opacity-90">Avg Score</div>
              </div>
            </div>
          </Card>

          {/* Enhanced Filters */}
          <Card className="glass-card p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-md">
                <Filter className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-bold gradient-text">Filter & Search</h3>
              <Button
                onClick={clearFilters}
                variant="outline"
                size="sm"
                className="ml-auto btn-secondary"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-800">Session Type</label>
                <Select value={filterType} onValueChange={(value: "all" | "analysis" | "quiz") => setFilterType(value)}>
                  <SelectTrigger className="input-elegant h-12 bg-white/95 backdrop-blur-sm border-2 hover:border-blue-400 transition-all relative">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent 
                    className="bg-white/98 backdrop-blur-sm shadow-2xl border-2 z-[100]" 
                    position="popper"
                    side="bottom"
                    align="start"
                    sideOffset={4}
                  >
                    <SelectItem value="all" className="hover:bg-blue-50">🔍 All Types</SelectItem>
                    <SelectItem value="analysis" className="hover:bg-green-50">📚 Document Analysis</SelectItem>
                    <SelectItem value="quiz" className="hover:bg-purple-50">🧠 Quiz Sessions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-800">Difficulty Level</label>
                <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                  <SelectTrigger className="input-elegant h-12 bg-white/95 backdrop-blur-sm border-2 hover:border-green-400 transition-all relative">
                    <SelectValue placeholder="All Difficulties" />
                  </SelectTrigger>
                  <SelectContent 
                    className="bg-white/98 backdrop-blur-sm shadow-2xl border-2 z-[100]" 
                    position="popper"
                    side="bottom"
                    align="start"
                    sideOffset={4}
                  >
                    <SelectItem value="all" className="hover:bg-gray-50">🎯 All Levels</SelectItem>
                    {getUniqueValues('difficulty').map(difficulty => (
                      <SelectItem key={difficulty} value={difficulty} className="hover:bg-orange-50">
                        {difficulty === 'easy' && '🟢'} 
                        {difficulty === 'medium' && '🟡'} 
                        {difficulty === 'hard' && '🔴'} 
                        {difficulty === 'very-hard' && '⚫'} 
                        {' '}{difficulty.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-800">Language</label>
                <Select value={filterLanguage} onValueChange={setFilterLanguage}>
                  <SelectTrigger className="input-elegant h-12 bg-white/95 backdrop-blur-sm border-2 hover:border-purple-400 transition-all relative">
                    <SelectValue placeholder="All Languages" />
                  </SelectTrigger>
                  <SelectContent 
                    className="bg-white/98 backdrop-blur-sm shadow-2xl border-2 z-[100]" 
                    position="popper"
                    side="bottom"
                    align="start"
                    sideOffset={4}
                  >
                    <SelectItem value="all" className="hover:bg-gray-50">🌐 All Languages</SelectItem>
                    {getUniqueValues('language').map(language => (
                      <SelectItem key={language} value={language} className="hover:bg-indigo-50">
                        {language === "tamil" ? "🇮🇳 தமிழ்" : "🇺🇸 English"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-800">Search Files</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Search by filename..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-elegant h-12 pl-12 bg-white/80 backdrop-blur-sm"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
              <div className="text-sm font-medium text-gray-700">
                📊 Showing <span className="text-blue-600 font-bold">{filteredHistory.length}</span> of <span className="text-purple-600 font-bold">{studyHistory.length}</span> records
              </div>
              {filteredHistory.length !== studyHistory.length && (
                <Badge className="bg-gradient-to-r from-orange-400 to-red-500 text-white shadow-md">
                  Filtered
                </Badge>
              )}
            </div>
          </Card>

          {/* History List */}
          <div className="space-y-4">
            {filteredHistory.length === 0 ? (
              studyHistory.length === 0 ? (
              <Card className="p-8 text-center bg-white/90 backdrop-blur-sm shadow-xl border-0">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No Study History</h3>
                <p className="text-gray-600">
                  Start analyzing documents and taking quizzes to build your study history.
                </p>
              </Card>
              ) : (
                <Card className="p-8 text-center bg-white/90 backdrop-blur-sm shadow-xl border-0">
                  <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">No Records Found</h3>
                  <p className="text-gray-600">
                    No records match your current filters. Try adjusting your search criteria.
                  </p>
                  <Button onClick={clearFilters} className="mt-4">
                    Clear All Filters
                  </Button>
                </Card>
              )
            ) : (
              filteredHistory.map((record, index) => (
                <Card key={record.id} className="glass-card p-6 hover-lift animate-fadeInUp" style={{animationDelay: `${index * 0.1}s`}}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {record.type === "quiz" ? (
                          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg shadow-md">
                            <Trophy className="h-4 w-4 text-white" />
                          </div>
                        ) : (
                          <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-lg shadow-md">
                            <FileText className="h-4 w-4 text-white" />
                          </div>
                        )}
                        <h3 className="font-semibold gradient-text">
                          {record.type === "quiz" ? "Quiz Session" : "Document Analysis"}
                        </h3>
                        {record.fileName && (
                          <Badge className="bg-gradient-to-r from-gray-400 to-gray-600 text-white text-xs shadow-md">
                            {record.fileName}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1 glass-card px-3 py-1">
                          <Calendar className="h-4 w-4" />
                          {record.timestamp.toDate().toLocaleDateString()} at {record.timestamp.toDate().toLocaleTimeString()}
                        </div>
                        <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md">
                          {record.difficulty.toUpperCase()}
                        </Badge>
                        <Badge className="bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-md">
                          {record.language === "tamil" ? "🇮🇳 தமிழ்" : "🇺🇸 English"}
                        </Badge>
                      </div>

                      {record.type === "quiz" && record.score !== undefined && (
                        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium shadow-md ${getScoreColor(record.score, record.totalQuestions || 1)}`}>
                          <Trophy className="h-4 w-4" />
                          Score: {record.score}/{record.totalQuestions} ({Math.round((record.score / (record.totalQuestions || 1)) * 100)}%)
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      {record.type === "analysis" && record.analysisData && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetakeQuiz(record)}
                          disabled={isRetakingQuiz === record.id}
                          className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
                        >
                          {isRetakingQuiz === record.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Generating...
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4" />
                              Retake Quiz
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(record)}
                        className="flex items-center gap-2 btn-secondary"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(record.id)}
                        className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300 transform hover:scale-105 transition-all duration-300"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyHistory;
