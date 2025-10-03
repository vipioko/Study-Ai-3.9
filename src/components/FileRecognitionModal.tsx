import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Clock, 
  ArrowRight, 
  RotateCcw, 
  CheckCircle,
  AlertTriangle,
  Calendar
} from "lucide-react";

interface FileRecognitionModalProps {
  fileName: string;
  totalPages: number;
  analyzedPages: number;
  lastAnalyzed: Date;
  onContinue: () => void;
  onStartNew: () => void;
  onCancel: () => void;
}

const FileRecognitionModal = ({
  fileName,
  totalPages,
  analyzedPages,
  lastAnalyzed,
  onContinue,
  onStartNew,
  onCancel
}: FileRecognitionModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const progressPercentage = (analyzedPages / totalPages) * 100;
  
  const handleContinue = async () => {
    setIsLoading(true);
    await onContinue();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 flex items-center justify-center">
      <Card className="max-w-2xl mx-auto p-8 bg-white/95 backdrop-blur-sm shadow-2xl border-0 animate-fadeInScale">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full w-fit mx-auto">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">
              File Already Analyzed
            </h2>
            <p className="text-gray-600">
              We found previous analysis for this document
            </p>
          </div>

          {/* File Info */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 truncate">{fileName}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(lastAnalyzed)}
                    </span>
                    <span>{totalPages} pages total</span>
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Analysis Progress</span>
                  <span className="text-sm text-gray-600">{analyzedPages}/{totalPages} pages</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
                <div className="text-center">
                  <Badge className={`${progressPercentage === 100 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {progressPercentage === 100 ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Complete
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3 mr-1" />
                        {Math.round(progressPercentage)}% completed
                      </>
                    )}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 text-center">What would you like to do?</h3>
            
            <div className="grid gap-4">
              {/* Continue Option */}
              <div className="border border-blue-200 rounded-lg p-4 hover:bg-blue-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <ArrowRight className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">Continue from where you left off</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Resume analysis from page {analyzedPages + 1} and save tokens
                    </p>
                    <div className="mt-3">
                      <Button 
                        onClick={handleContinue}
                        disabled={isLoading}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                      >
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Loading...
                          </>
                        ) : (
                          <>
                            <ArrowRight className="h-4 w-4 mr-2" />
                            Continue Analysis
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Start New Option */}
              <div className="border border-orange-200 rounded-lg p-4 hover:bg-orange-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <RotateCcw className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">Start fresh analysis</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Completely re-analyze the entire document from the beginning
                    </p>
                    <div className="mt-3">
                      <Button 
                        onClick={onStartNew}
                        variant="outline"
                        className="border-orange-300 text-orange-700 hover:bg-orange-50"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Start New Analysis
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Warning for fresh start */}
          {progressPercentage > 25 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <p className="text-sm text-yellow-700">
                  <strong>Note:</strong> Starting a fresh analysis will use additional tokens and replace your existing progress.
                </p>
              </div>
            </div>
          )}

          {/* Cancel */}
          <div className="text-center pt-4">
            <Button 
              onClick={onCancel}
              variant="ghost"
              className="text-gray-500 hover:text-gray-700"
            >
              Cancel & Choose Different File
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default FileRecognitionModal;