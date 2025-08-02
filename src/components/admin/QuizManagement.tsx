import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Brain, Edit, Trash2, Save, X, Plus, Zap, FileText, Languages } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/config/firebase";
import { Category, QuestionBank, Quiz } from "@/types/admin";
import { Question } from "@/components/StudyAssistant";
import { 
  getCategories, 
  getQuestionBanks, 
  getQuizzes, 
  addQuiz, 
  updateQuiz, 
  deleteQuiz,
  getQuestionBankById 
} from "@/services/adminService";
import { generateQuestions } from "@/services/geminiService";
import { toast } from "sonner";

const QuizManagement = () => {
  const [user] = useAuthState(auth);
  const [categories, setCategories] = useState<Category[]>([]);
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  
  // Note: The original code had a potential issue where `difficulty` was not in the quizForm state.
  // I've added it to avoid potential errors in handleGenerateQuiz if it's needed there.
  // If not, it can be removed. Based on the code, it seems you want a default 'medium' for new quizzes,
  // so this state might not be strictly necessary for the form itself.
  const [quizForm, setQuizForm] = useState({
    title: "",
    description: "",
    questionBankId: "",
    language: "english",
    difficulty: "medium" // Default difficulty
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [categoriesData, questionBanksData, quizzesData] = await Promise.all([
        getCategories(),
        getQuestionBanks(),
        getQuizzes()
      ]);
      setCategories(categoriesData);
      setQuestionBanks(questionBanksData);
      setQuizzes(quizzesData);
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateQuiz = async (questionBankId: string) => {
    if (!user) return;

    try {
      setIsGenerating(true);
      const questionBank = await getQuestionBankById(questionBankId);
      
      if (!questionBank || !questionBank.analysisData) {
        toast.error("Question bank not found or not analyzed yet");
        return;
      }

      // Check if we have full OCR text for exact question extraction
      if (questionBank.fullOcrText) {
        // Use the new extraction method with full OCR text
        const result = await generateQuestions([], "medium", quizForm.language, questionBank.fullOcrText);
        setGeneratedQuestions(result.questions || []);
        toast.success(`Extracted ${result.questions?.length || 0} questions from the question paper!`);
      } else if (questionBank.analysisData) {
        // Fallback to analysis-based generation for older question banks
        const analysisResults = [{
          keyPoints: questionBank.analysisData.keyPoints || [],
          summary: questionBank.analysisData.summary || '',
          tnpscRelevance: questionBank.analysisData.tnpscRelevance || '',
          studyPoints: questionBank.analysisData.studyPoints || [],
          tnpscCategories: questionBank.analysisData.tnpscCategories || []
        }];

        const result = await generateQuestions(analysisResults, "medium", quizForm.language);
        setGeneratedQuestions(result.questions || []);
        toast.success(`Generated ${result.questions?.length || 0} questions from analysis data!`);
      } else {
        toast.error("Question bank has no content data available for quiz generation");
        return;
      }
      
      setQuizForm(prev => ({
        ...prev,
        questionBankId,
        title: `${questionBank.title} - Quiz`
      }));
      
    } catch (error) {
      console.error("Error generating quiz:", error);
      toast.error("Failed to generate quiz");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveQuiz = async () => {
    if (!user || !quizForm.title.trim() || !quizForm.questionBankId || generatedQuestions.length === 0) {
      toast.error("Please fill in all required fields and generate questions");
      return;
    }

    try {
      const questionBank = questionBanks.find(qb => qb.id === quizForm.questionBankId);
      if (!questionBank) {
        toast.error("Question bank not found");
        return;
      }

      if (editingQuiz) {
        await updateQuiz(editingQuiz.id, {
          title: quizForm.title.trim(),
          description: quizForm.description.trim(),
          difficulty: editingQuiz.difficulty, // Keep original difficulty when editing
          language: quizForm.language,
          questions: generatedQuestions,
          totalQuestions: generatedQuestions.length
        });
        toast.success("Quiz updated successfully!");
      } else {
        await addQuiz({
          title: quizForm.title.trim(),
          description: quizForm.description.trim(),
          questionBankId: quizForm.questionBankId,
          categoryId: questionBank.categoryId,
          difficulty: "medium", // Default difficulty for new quizzes
          language: quizForm.language,
          questions: generatedQuestions,
          totalQuestions: generatedQuestions.length,
          createdBy: user.uid,
          isActive: true,
          tags: []
        });
        toast.success("Quiz saved successfully!");
      }

      resetQuizForm();
      fetchData();
    } catch (error) {
      console.error("Error saving quiz:", error);
      toast.error("Failed to save quiz");
    }
  };

  const handleEditQuiz = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setQuizForm({
      title: quiz.title,
      description: quiz.description || "",
      questionBankId: quiz.questionBankId,
      language: quiz.language,
      difficulty: quiz.difficulty
    });
    setGeneratedQuestions(quiz.questions);
    setIsEditing(true);
    // Scroll to the top to see the editor
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteQuiz = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      await deleteQuiz(id);
      toast.success("Quiz deleted successfully!");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete quiz");
    }
  };

  const resetQuizForm = () => {
    setQuizForm({
      title: "",
      description: "",
      questionBankId: "",
      language: "english",
      difficulty: "medium"
    });
    setGeneratedQuestions([]);
    setIsEditing(false);
    setEditingQuiz(null);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    setGeneratedQuestions(prev => prev.map((q, i) => 
      i === index ? { ...q, [field]: value } : q
    ));
  };

  const updateQuestionOption = (questionIndex: number, optionIndex: number, value: string) => {
    setGeneratedQuestions(prev => prev.map((q, i) => 
      i === questionIndex ? {
        ...q,
        options: q.options?.map((opt, oi) => oi === optionIndex ? value : opt) || []
      } : q
    ));
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || "Unknown";
  };

  const getQuestionBankName = (questionBankId: string) => {
    const bank = questionBanks.find(qb => qb.id === questionBankId);
    return bank?.title || "Unknown";
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading quiz management...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quiz Generation */}
      <Card className="glass-card p-6">
        <h3 className="text-lg font-semibold gradient-text mb-4">
          {isEditing ? 'Edit Quiz' : 'Generate New Quiz'}
        </h3>
        
        {/* FIX: Wrapped the form controls in a grid layout to fix alignment and the stray </div> error */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <Label>Question Bank</Label>
            <Select 
              value={quizForm.questionBankId} 
              onValueChange={(value) => setQuizForm(prev => ({ ...prev, questionBankId: value }))}
              disabled={isEditing} // Prevent changing the source when editing
            >
              <SelectTrigger className="input-elegant">
                <SelectValue placeholder="Select question bank" />
              </SelectTrigger>
              <SelectContent>
                {questionBanks.map((bank) => (
                  <SelectItem key={bank.id} value={bank.id}>
                    {bank.title} ({bank.year})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Language</Label>
            <Select value={quizForm.language} onValueChange={(value: 'english' | 'tamil') => setQuizForm(prev => ({ ...prev, language: value }))}>
              <SelectTrigger className="input-elegant">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="english">🇬🇧 English</SelectItem>
                <SelectItem value="tamil">🇮🇳 தமிழ்</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-end">
            <Button
              onClick={() => handleGenerateQuiz(quizForm.questionBankId)}
              disabled={!quizForm.questionBankId || isGenerating || isEditing}
              className="btn-primary w-full"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Generate Quiz
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Generated Questions Editor */}
        {generatedQuestions.length > 0 && (
          <div className="space-y-6 mt-6 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-800">
                {isEditing ? 'Editing Questions' : 'Generated Questions'} ({generatedQuestions.length})
              </h4>
              <div className="flex gap-3">
                <Button onClick={handleSaveQuiz} className="btn-primary">
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? 'Update Quiz' : 'Save Quiz'}
                </Button>
                <Button onClick={resetQuizForm} variant="outline">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>

            {/* Quiz Details Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="quiz-title">Quiz Title *</Label>
                <Input
                  id="quiz-title"
                  value={quizForm.title}
                  onChange={(e) => setQuizForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter quiz title"
                  className="input-elegant"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quiz-description">Description</Label>
                <Textarea
                  id="quiz-description"
                  value={quizForm.description}
                  onChange={(e) => setQuizForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this quiz"
                  className="input-elegant min-h-[80px]"
                />
              </div>
            </div>

            {/* Questions Editor */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto p-2">
              {generatedQuestions.map((question, index) => (
                <Card key={index} className="p-4 bg-white">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-blue-100 text-blue-700">Q{index + 1}</Badge>
                      <Badge className={`${
                        question.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                        question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        question.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {question.difficulty.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Question</Label>
                      <Textarea
                        value={question.question}
                        onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                        className="input-elegant min-h-[60px]"
                      />
                    </div>

                    {question.options && (
                      <div className="space-y-2">
                        <Label>Options</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {question.options.map((option, optIndex) => (
                            <div key={optIndex} className="flex items-center gap-2">
                              <span className="font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded text-sm">
                                {String.fromCharCode(65 + optIndex)}
                              </span>
                              <Input
                                value={option}
                                onChange={(e) => updateQuestionOption(index, optIndex, e.target.value)}
                                className="input-elegant"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Correct Answer</Label>
                        <Input
                          value={question.answer}
                          onChange={(e) => updateQuestion(index, 'answer', e.target.value)}
                          placeholder="A, B, C, or D"
                          className="input-elegant"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>TNPSC Group</Label>
                        <Input
                          value={question.tnpscGroup}
                          onChange={(e) => updateQuestion(index, 'tnpscGroup', e.target.value)}
                          placeholder="e.g., Group 1"
                          className="input-elegant"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Explanation</Label>
                      <Textarea
                        value={question.explanation || ""}
                        onChange={(e) => updateQuestion(index, 'explanation', e.target.value)}
                        placeholder="Explanation for the correct answer"
                        className="input-elegant min-h-[60px]"
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Existing Quizzes */}
      <Card className="glass-card p-6">
        <h3 className="text-lg font-semibold gradient-text mb-4">
          Existing Quizzes ({quizzes.length})
        </h3>
        
        {quizzes.length === 0 ? (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No quizzes found. Generate your first quiz to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {quizzes.map((quiz, index) => (
              <Card key={quiz.id} className="p-4 hover-lift animate-fadeInUp" style={{animationDelay: `${index * 0.05}s`}}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <Brain className="h-5 w-5 text-purple-600" />
                      <h4 className="font-semibold text-gray-800">{quiz.title}</h4>
                      <Badge className={`${
                        quiz.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                        quiz.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        quiz.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {quiz.difficulty.toUpperCase()}
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-700">
                        {quiz.language === 'tamil' ? 'தமிழ்' : 'English'}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">{quiz.description}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                        <span>Questions: {quiz.totalQuestions}</span>
                        <span>•</span>
                        <span>Category: {getCategoryName(quiz.categoryId)}</span>
                        <span>•</span>
                        <span>Source: {getQuestionBankName(quiz.questionBankId)}</span>
                        <span>•</span>
                        <span>Created: {quiz.creationDate.toDate().toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button
                      onClick={() => handleEditQuiz(quiz)}
                      variant="outline"
                      size="sm"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default QuizManagement;