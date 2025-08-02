
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QuestionResult } from "./StudyAssistant";

interface QuizModeProps {
  result: QuestionResult;
  onReset: () => void;
  onBackToResults?: () => void;
  selectedFiles?: File[];
}

const QuizMode = ({ result, onReset, onBackToResults }: QuizModeProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-6">
        <Card className="p-6 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">Quiz Mode</h2>
          <p className="text-gray-600 mb-6">Questions: {result.questions?.length || 0}</p>
          <div className="flex gap-4">
            <Button onClick={onReset}>Back to Upload</Button>
            {onBackToResults && (
              <Button onClick={onBackToResults} variant="outline">Back to Results</Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default QuizMode;
