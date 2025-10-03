import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Play, RotateCcw, Clock, CheckCircle } from "lucide-react";

interface PdfResumeOptionsProps {
  fileName: string;
  totalPages: number;
  analyzedPages: number[];
  lastAnalyzed: Date;
  onResumeAnalysis: () => void;
  onStartNewAnalysis: () => void;
  onBack: () => void;
}

const PdfResumeOptions = ({
  fileName,
  totalPages,
  analyzedPages,
  lastAnalyzed,
  onResumeAnalysis,
  onStartNewAnalysis,
  onBack
}: PdfResumeOptionsProps) => {
  const progressPercentage = (analyzedPages.length / totalPages) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-blue-400/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>
      
      <div className="flex items-center justify-center min-h-screen p-4 relative z-10">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center animate-fadeInUp">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-elegant pulse-glow animate-bounceIn">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold gradient-text animate-slideInRight">
              Resume PDF Analysis
            </h1>
          </div>
          <p className="text-gray-600 text-xl leading-relaxed animate-fadeInUp" style={{animationDelay: '0.2s'}}>
            We found previous analysis for this PDF file
          </p>
        </div>

        <Card className="glass-card p-8 md:p-10 hover-lift animate-fadeInScale" style={{animationDelay: '0.4s'}}>
          <div className="space-y-8">
            {/* File Info */}
            <div className="text-center space-y-4 animate-fadeInUp" style={{animationDelay: '0.6s'}}>
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-6 w-6 text-blue-600 animate-float" />
                <h3 className="text-2xl font-bold text-gray-800">
                  {fileName.length > 40 ? fileName.substring(0, 40) + "..." : fileName}
                </h3>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-base text-gray-600">
                <Clock className="h-5 w-5 text-blue-500" />
                <span>Last analyzed: {lastAnalyzed.toLocaleDateString()} at {lastAnalyzed.toLocaleTimeString()}</span>
              </div>
            </div>

            {/* Progress Summary */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-8 rounded-2xl border border-green-200/50 shadow-elegant animate-fadeInUp" style={{animationDelay: '0.8s'}}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center stagger-animation">
                <div>
                  <div className="text-4xl font-bold text-blue-600 mb-2">{totalPages}</div>
                  <div className="text-base font-medium text-blue-700">Total Pages</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-green-600 mb-2">{analyzedPages.length}</div>
                  <div className="text-base font-medium text-green-700">Analyzed Pages</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-purple-600 mb-2">{Math.round(progressPercentage)}%</div>
                  <div className="text-base font-medium text-purple-700">Progress</div>
                </div>
              </div>

              <div className="mt-8">
                <div className="flex justify-between text-base text-gray-700 mb-3 font-medium">
                  <span>Analysis Progress</span>
                  <span>{analyzedPages.length}/{totalPages} pages</span>
                </div>
                <div className="progress-elegant">
                  <div 
                    className="progress-fill"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Analyzed Pages */}
            <div className="animate-fadeInUp" style={{animationDelay: '1s'}}>
              <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-3 text-lg">
                <CheckCircle className="h-6 w-6 text-green-600 animate-pulse" />
                Previously Analyzed Pages
              </h4>
              <div className="flex flex-wrap gap-3 stagger-animation">
                {analyzedPages.sort((a, b) => a - b).map((pageNum) => (
                  <Badge key={pageNum} className="badge-elegant status-success hover-lift px-4 py-2 text-sm font-semibold">
                    Page {pageNum}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-6 animate-fadeInUp" style={{animationDelay: '1.2s'}}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Button
                  onClick={onResumeAnalysis}
                  className="btn-primary py-8 text-lg font-bold relative group overflow-hidden"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-3">
                      <Play className="h-6 w-6 group-hover:scale-110 transition-transform" />
                      <span>Resume Analysis</span>
                    </div>
                    <div className="text-sm opacity-90">
                      Continue from page {Math.max(...analyzedPages) + 1}
                    </div>
                  </div>
                </Button>

                <Button
                  onClick={onStartNewAnalysis}
                  className="btn-secondary py-8 text-lg font-bold relative group overflow-hidden"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-3">
                      <RotateCcw className="h-6 w-6 group-hover:rotate-180 transition-transform duration-500" />
                      <span>Start New Analysis</span>
                    </div>
                    <div className="text-sm opacity-70">
                      Analyze from beginning
                    </div>
                  </div>
                </Button>
              </div>

              <Button
                onClick={onBack}
                variant="ghost"
                className="w-full text-gray-600 hover:text-gray-800 py-4 text-base font-medium hover:bg-gray-100/50 rounded-xl transition-all duration-300"
              >
                Back to Upload
              </Button>
            </div>
          </div>
        </Card>
        </div>
      </div>
    </div>
  );
};

export default PdfResumeOptions;