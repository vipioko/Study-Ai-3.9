
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Play, BookOpen, Target, Brain } from "lucide-react";
import { QuestionResult, Question } from "./StudyAssistant";
import { downloadPDF } from "@/utils/pdfUtils";
import { toast } from "sonner";

interface QuestionResultsProps {
  result: QuestionResult;
  onReset: () => void;
  selectedFiles: File[];
  onStartQuiz: () => void;
}

const QuestionResults = ({ result, onReset, selectedFiles, onStartQuiz }: QuestionResultsProps) => {
  const handleDownload = async () => {
    try {
      await downloadPDF({
        title: `TNPSC Practice Questions - ${result.difficulty.toUpperCase()}`,
        content: result.questions,
        type: 'questions'
      });
      toast.success("Questions downloaded successfully!");
    } catch (error) {
      toast.error("Failed to download questions. Please try again.");
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      'easy': 'from-green-500 to-emerald-600',
      'medium': 'from-yellow-500 to-orange-600',
      'hard': 'from-red-500 to-pink-600',
      'very-hard': 'from-purple-500 to-indigo-600'
    };
    return colors[difficulty as keyof typeof colors] || 'from-gray-500 to-gray-600';
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <Card className="p-6 bg-white/90 backdrop-blur-sm shadow-xl border-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">TNPSC Practice Questions</h1>
                  <p className="text-gray-600">Generated {result.questions?.length || 0} questions for practice</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={onReset}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Upload
                </Button>
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button
                  onClick={onStartQuiz}
                  className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  Start Interactive Quiz
                </Button>
              </div>
            </div>
          </Card>

          {/* Summary */}
          <Card className="p-6 bg-white/90 backdrop-blur-sm shadow-lg border-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {result.questions?.length || 0}
                </div>
                <div className="text-blue-700 font-medium">Total Questions</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-xl">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {result.difficulty.replace('-', ' ').toUpperCase()}
                </div>
                <div className="text-purple-700 font-medium">Difficulty Level</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {result.questions?.filter(q => q.type === 'mcq').length || 0}
                </div>
                <div className="text-green-700 font-medium">MCQ Questions</div>
              </div>
            </div>
          </Card>

          {/* Questions List */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-blue-600" />
              Generated Questions
            </h2>
            
            {result.questions?.map((question, index) => (
              <Card key={index} className="p-6 bg-white/90 backdrop-blur-sm shadow-lg border-0">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <span className="text-lg">{getQuestionTypeIcon(question.type)}</span>
                      </div>
                      <span className="text-lg font-semibold text-gray-800">
                        Question {index + 1}
                      </span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge className={`bg-gradient-to-r ${getDifficultyColor(question.difficulty)} text-white`}>
                        {question.difficulty.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {question.tnpscGroup}
                      </Badge>
                      <Badge variant="outline">
                        {question.type.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-gray-800 text-lg leading-relaxed">{question.question}</p>
                  </div>
                  
                  {question.options && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-700">Options:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {question.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                            <span className="font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">
                              {String.fromCharCode(65 + optionIndex)}
                            </span>
                            <span className="text-gray-800">{option}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 p-4 bg-green-50 border border-green-200 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-green-700">Correct Answer:</span>
                      </div>
                      <span className="text-green-800 font-medium">{question.answer}</span>
                    </div>
                    
                    {question.explanation && (
                      <div className="flex-1 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-blue-700">Explanation:</span>
                        </div>
                        <span className="text-blue-800">{question.explanation}</span>
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
};

export default QuestionResults;
