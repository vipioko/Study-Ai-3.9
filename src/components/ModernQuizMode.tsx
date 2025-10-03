import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle, AlertTriangle, Brain, Trophy, Target, Award, Clock, Download, Sparkles } from "lucide-react";
import { QuestionResult, Question } from "./StudyAssistant";
import { downloadPDF } from "@/utils/pdfUtils";
import { saveStudyHistory } from "@/services/studyHistoryService";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/config/firebase";
import { toast } from "sonner";

interface ModernQuizModeProps {
  result: QuestionResult;
  onReset: () => void;
  onBackToAnalysis: () => void;
  difficulty: string;
  outputLanguage: "english" | "tamil";
}

interface UserAnswer {
  questionIndex: number;
  selectedOption: string;
}

interface QuizResult {
  score: number;
  totalQuestions: number;
  percentage: number;
  answers: {
    question: Question;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    questionIndex: number;
  }[];
}

const ModernQuizMode = ({ result, onReset, onBackToAnalysis, difficulty, outputLanguage }: ModernQuizModeProps) => {
  const [user] = useAuthState(auth);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [startTime] = useState<Date>(new Date());

  const questions = result.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  const getDifficultyColor = (diff: string) => {
    const colors = {
      'easy': 'from-green-500 to-emerald-600',
      'medium': 'from-yellow-500 to-orange-600', 
      'hard': 'from-red-500 to-pink-600',
      'very-hard': 'from-purple-500 to-indigo-600'
    };
    return colors[diff as keyof typeof colors] || 'from-gray-500 to-gray-600';
  };

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'mcq':
        return '📝';
      case 'assertion_reason':
        return '🔗';
      default:
        return '❓';
    }
  };

  const handleAnswerSelect = (value: string) => {
    setSelectedOption(value);
  };

  const handleNextQuestion = () => {
    if (!selectedOption.trim()) {
      toast.error("Please select an answer before proceeding");
      return;
    }

    const newAnswer: UserAnswer = {
      questionIndex: currentQuestionIndex,
      selectedOption: selectedOption
    };

    const updatedAnswers = [...userAnswers.filter(a => a.questionIndex !== currentQuestionIndex), newAnswer];
    setUserAnswers(updatedAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      const savedAnswer = updatedAnswers.find(a => a.questionIndex === currentQuestionIndex + 1);
      setSelectedOption(savedAnswer?.selectedOption || "");
    } else {
      calculateResults(updatedAnswers);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      const savedAnswer = userAnswers.find(a => a.questionIndex === currentQuestionIndex - 1);
      setSelectedOption(savedAnswer?.selectedOption || "");
    }
  };

  // Fixed answer validation logic
  const calculateResults = (answers: UserAnswer[]) => {
    const results = answers.map(answer => {
      const question = questions[answer.questionIndex];
      
      // Improved answer validation - handle both option letters and full option text
      let isCorrect = false;
      const userAnswer = answer.selectedOption.trim();
      const correctAnswer = question.answer?.trim() || "";
      
      // Check if user selected by option letter (A, B, C, D)
      if (userAnswer.length === 1 && /^[A-D]$/i.test(userAnswer)) {
        // User selected option letter, compare with correct answer letter
        isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
      } else {
        // User selected full option text, find the corresponding letter
        const optionIndex = question.options?.findIndex(option => 
          option.trim().toLowerCase() === userAnswer.toLowerCase()
        );
        
        if (optionIndex !== undefined && optionIndex !== -1) {
          const userOptionLetter = String.fromCharCode(65 + optionIndex); // Convert to A, B, C, D
          isCorrect = userOptionLetter.toLowerCase() === correctAnswer.toLowerCase();
        } else {
          // Direct text comparison as fallback
          isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
        }
      }
      
      return {
        question,
        userAnswer: answer.selectedOption,
        correctAnswer: question.answer || "",
        isCorrect,
        questionIndex: answer.questionIndex
      };
    });

    const score = results.filter(r => r.isCorrect).length;
    const percentage = Math.round((score / questions.length) * 100);

    const quizResultData = {
      score,
      totalQuestions: questions.length,
      percentage,
      answers: results
    };

    setQuizResult(quizResultData);

    // Save quiz results to study history
    if (user) {
      saveStudyHistory(
        user.uid,
        "quiz",
        quizResultData,
        {
          fileName: `Quiz - ${difficulty.toUpperCase()} - ${new Date().toLocaleDateString()}`,
          difficulty,
          language: outputLanguage,
          score,
          totalQuestions: questions.length,
          percentage,
          quizAnswers: results,
          quizData: quizResultData // Add complete quiz data for proper saving
        }
      ).then(() => {
        console.log("Quiz results saved to study history successfully");
        toast.success("Quiz results saved to your study history!");
      }).catch(error => {
        console.error("Failed to save quiz results:", error);
        toast.error("Failed to save quiz results to history");
      });
    }

    setQuizCompleted(true);
    toast.success("🎉 Quiz completed successfully!");
  };

  const getPerformanceMessage = (percentage: number) => {
    if (percentage >= 90) return "Outstanding! You're mastering TNPSC concepts! 🏆";
    if (percentage >= 80) return "Excellent work! You're well prepared! 🌟";
    if (percentage >= 70) return "Great job! Keep up the good work! 👏";
    if (percentage >= 60) return "Good effort! Review and improve! 📚";
    if (percentage >= 40) return "Fair performance. More practice needed! 💪";
    return "Keep studying! You'll improve with practice! 📖";
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-blue-600';
    if (percentage >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const handleDownloadResults = async () => {
    try {
      if (!quizResult) {
        toast.error("No quiz results available to download");
        return;
      }

      await downloadPDF({
        title: `TNPSC Quiz Results - ${difficulty.toUpperCase()}`,
        content: [quizResult],
        type: 'quiz-results'
      });
      toast.success("Quiz results downloaded successfully!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download results. Please try again.");
    }
  };

  const getTimeTaken = () => {
    const endTime = new Date();
    const diffMs = endTime.getTime() - startTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    return `${diffMins}m ${diffSecs}s`;
  };

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="glass-card p-8 max-w-md mx-auto text-center">
          <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-4">No Questions Available</h3>
          <p className="text-gray-600 mb-6">
            Unable to generate quiz questions from the uploaded content. Please try uploading different files.
          </p>
          <Button onClick={onReset} className="btn-primary">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Upload New Files
          </Button>
        </Card>
      </div>
    );
  }

  if (quizCompleted && quizResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-green-400/20 to-blue-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>
        
        <div className="p-4 relative z-10">
        <div className="container mx-auto max-w-4xl space-y-6">
          {/* Results Header */}
          <Card className="glass-card p-8 text-center animate-fadeInScale hover-lift">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="p-4 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 shadow-elegant pulse-glow">
                <Trophy className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold gradient-text">
                  Quiz Complete!
                </h1>
                <p className="text-gray-600 mt-2">TNPSC Practice Results</p>
              </div>
            </div>

            <div className="glass-card p-8 mb-6">
              <div className={`text-7xl font-bold mb-4 ${getScoreColor(quizResult.percentage)}`}>
                {quizResult.percentage}%
              </div>
              <div className="text-xl text-gray-700 mb-3">
                {quizResult.score} out of {quizResult.totalQuestions} questions correct
              </div>
              <div className="text-lg font-medium text-gray-600 glass-card p-4 mb-4">
                {getPerformanceMessage(quizResult.percentage)}
              </div>

              <div className="flex justify-center gap-6 text-sm text-gray-600 stagger-animation">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Time: {getTimeTaken()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  <span>Difficulty: {difficulty.toUpperCase()}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={handleDownloadResults} 
                className="btn-secondary"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Results
              </Button>
              <Button 
                onClick={onBackToAnalysis} 
                className="btn-secondary"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Analysis
              </Button>
              <Button 
                onClick={onReset} 
                className="btn-primary"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                New Quiz
              </Button>
            </div>
          </Card>

          {/* Answer Review */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold gradient-text flex items-center gap-2">
              <Target className="h-6 w-6 text-blue-600" />
              Answer Review
            </h2>
            
            {quizResult.answers.map((answer, index) => (
              <Card key={index} className={`glass-card p-6 hover-lift animate-fadeInUp ${
                answer.isCorrect 
                  ? 'border-l-4 border-l-green-500' 
                  : 'border-l-4 border-l-red-500'
              }`} style={{animationDelay: `${index * 0.1}s`}}>
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${answer.isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
                        {answer.isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <span className="text-lg font-semibold text-gray-800">
                        Question {index + 1} {getQuestionTypeIcon(answer.question.type)}
                      </span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge className={`bg-gradient-to-r ${getDifficultyColor(answer.question.difficulty)} text-white`}>
                        {answer.question.difficulty.toUpperCase()}
                      </Badge>
                      <Badge className="badge-elegant bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200">
                        {answer.question.tnpscGroup}
                      </Badge>
                      <Badge className="badge-elegant bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border-purple-200">
                        {answer.question.type.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="glass-card p-4">
                    <p className="text-gray-800 text-lg leading-relaxed">{answer.question.question}</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className={`p-4 rounded-xl ${
                      answer.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-700">Your Answer:</span>
                        <span className={`font-medium ${answer.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                          {answer.userAnswer}
                        </span>
                      </div>
                    </div>
                    
                    {!answer.isCorrect && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-700">Correct Answer:</span>
                          <span className="font-medium text-green-700">{answer.correctAnswer}</span>
                        </div>
                      </div>
                    )}

                    {answer.question.explanation && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <div className="flex items-start gap-2">
                          <Brain className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div>
                            <span className="font-semibold text-blue-800">Explanation:</span>
                            <p className="text-blue-700 mt-1">{answer.question.explanation}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-green-400/20 to-blue-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="p-4 relative z-10">
        <div className="container mx-auto max-w-4xl space-y-6">
          {/* Header */}
          <Card className="glass-card p-6 animate-fadeInScale">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 shadow-elegant">
                  <Brain className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold gradient-text">TNPSC Quiz Mode</h1>
                  <p className="text-gray-600">Test your knowledge with practice questions</p>
                </div>
              </div>
              <Button 
                onClick={onBackToAnalysis} 
                className="btn-secondary"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Analysis
              </Button>
            </div>

            {/* Progress Bar */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {Math.round(progress)}% Complete
                </span>
              </div>
              <Progress value={progress} className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </Progress>
            </div>
          </Card>

          {/* Question Card */}
          <Card className="glass-card p-8 animate-fadeInUp hover-lift">
            <div className="space-y-6">
              {/* Question Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100">
                    <span className="text-2xl">{getQuestionTypeIcon(currentQuestion.type)}</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">
                      Question {currentQuestionIndex + 1}
                    </h2>
                    <p className="text-gray-600">Choose the correct answer</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge className={`bg-gradient-to-r ${getDifficultyColor(currentQuestion.difficulty)} text-white`}>
                    {currentQuestion.difficulty.toUpperCase()}
                  </Badge>
                  <Badge className="badge-elegant bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200">
                    {currentQuestion.tnpscGroup}
                  </Badge>
                  <Badge className="badge-elegant bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border-purple-200">
                    {currentQuestion.type.toUpperCase()}
                  </Badge>
                </div>
              </div>

              {/* Question Text */}
              <div className="glass-card p-6">
                <p className="text-lg text-gray-800 leading-relaxed">
                  {currentQuestion.question}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Select your answer:</h3>
                <RadioGroup value={selectedOption} onValueChange={handleAnswerSelect}>
                  <div className="space-y-3">
                    {currentQuestion.options?.map((option, index) => {
                      const optionLetter = String.fromCharCode(65 + index); // A, B, C, D
                      return (
                        <div key={index} className="flex items-center space-x-3 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200 cursor-pointer">
                          <RadioGroupItem value={optionLetter} id={`option-${index}`} />
                          <Label 
                            htmlFor={`option-${index}`} 
                            className="flex-1 cursor-pointer text-gray-700 leading-relaxed"
                          >
                            <span className="font-semibold text-blue-600 mr-2">{optionLetter}.</span>
                            {option}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </RadioGroup>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6">
                <Button 
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="btn-secondary"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                
                <Button 
                  onClick={handleNextQuestion}
                  disabled={!selectedOption.trim()}
                  className="btn-primary"
                >
                  {currentQuestionIndex === questions.length - 1 ? (
                    <>
                      <Trophy className="h-4 w-4 mr-2" />
                      Finish Quiz
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Question Navigation */}
          <Card className="glass-card p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Question Navigation</h3>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {questions.map((_, index) => {
                const isAnswered = userAnswers.some(a => a.questionIndex === index);
                const isCurrent = index === currentQuestionIndex;
                
                return (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentQuestionIndex(index);
                      const savedAnswer = userAnswers.find(a => a.questionIndex === index);
                      setSelectedOption(savedAnswer?.selectedOption || "");
                    }}
                    className={`
                      w-10 h-10 rounded-lg font-semibold text-sm transition-all duration-200
                      ${isCurrent 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-elegant' 
                        : isAnswered 
                          ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200' 
                          : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                      }
                    `}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-6 mt-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded"></div>
                <span>Current</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
                <span>Not Answered</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ModernQuizMode;