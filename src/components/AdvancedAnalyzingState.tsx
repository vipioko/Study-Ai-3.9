import React from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FileText, Brain, Zap, Target, CheckCircle, ArrowRight } from "lucide-react";

interface AdvancedAnalyzingStateProps {
  progress: number;
  step: string;
  analysisType: "detailed" | "next-page" | "comprehensive";
  fileName?: string;
  currentPage?: number;
  totalPages?: number;
}

const AdvancedAnalyzingState = ({
  progress,
  step,
  analysisType,
  fileName,
  currentPage,
  totalPages
}: AdvancedAnalyzingStateProps) => {
  const getAnalysisConfig = () => {
    switch (analysisType) {
      case "next-page":
        return {
          title: `Analyzing Page ${currentPage}`,
          subtitle: `Generating insights for the next page`,
          icon: ArrowRight,
          gradient: "from-green-500 to-emerald-600",
          bgGradient: "from-green-50 to-emerald-50"
        };
      case "comprehensive":
        return {
          title: "Comprehensive Analysis",
          subtitle: "Processing entire document for detailed insights",
          icon: Brain,
          gradient: "from-purple-500 to-indigo-600",
          bgGradient: "from-purple-50 to-indigo-50"
        };
      default:
        return {
          title: "Detailed Analysis",
          subtitle: "AI is analyzing your study material",
          icon: FileText,
          gradient: "from-blue-500 to-purple-600",
          bgGradient: "from-blue-50 to-purple-50"
        };
    }
  };

  const config = getAnalysisConfig();
  const IconComponent = config.icon;

  const steps = [
    { id: 1, label: "Processing Content", completed: progress > 20 },
    { id: 2, label: "Extracting Key Points", completed: progress > 40 },
    { id: 3, label: "TNPSC Analysis", completed: progress > 60 },
    { id: 4, label: "Generating Study Points", completed: progress > 80 },
    { id: 5, label: "Finalizing Results", completed: progress > 95 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Enhanced Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-400/30 to-purple-400/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-indigo-400/30 to-pink-400/30 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-br from-green-400/20 to-blue-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Main Analysis Card */}
          <Card className={`glass-card p-8 md:p-12 text-center mb-8 bg-gradient-to-r ${config.bgGradient} border-0 shadow-2xl animate-fade-in`}>
            {/* Animated Icon */}
            <div className={`relative mx-auto mb-8 w-24 h-24 bg-gradient-to-r ${config.gradient} rounded-full flex items-center justify-center shadow-2xl animate-pulse`}>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/20 to-transparent animate-spin"></div>
              <IconComponent className="h-12 w-12 text-white animate-bounce" />
            </div>

            {/* Title and Subtitle */}
            <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-4 animate-fade-in" style={{animationDelay: '0.2s'}}>
              {config.title}
            </h1>
            <p className="text-xl text-gray-600 mb-2 animate-fade-in" style={{animationDelay: '0.4s'}}>
              {config.subtitle}
            </p>
            
            {fileName && (
              <p className="text-lg text-gray-500 mb-8 animate-fade-in" style={{animationDelay: '0.6s'}}>
                📄 {fileName}
                {currentPage && totalPages && (
                  <span className="ml-2 text-blue-600 font-semibold">
                    (Page {currentPage} of {totalPages})
                  </span>
                )}
              </p>
            )}

            {/* Enhanced Progress Bar */}
            <div className="mb-8 animate-fade-in" style={{animationDelay: '0.8s'}}>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-600">Progress</span>
                <span className="text-sm font-bold text-blue-600">{Math.round(progress)}%</span>
              </div>
              <div className="relative">
                <Progress 
                  value={progress} 
                  className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full overflow-hidden"
                />
                <div 
                  className={`absolute top-0 left-0 h-full bg-gradient-to-r ${config.gradient} rounded-full transition-all duration-500 ease-out`}
                  style={{ width: `${progress}%` }}
                >
                  <div className="h-full bg-gradient-to-r from-white/30 to-transparent animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Current Step */}
            <div className={`inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r ${config.gradient} text-white rounded-full shadow-lg animate-fade-in`} style={{animationDelay: '1s'}}>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span className="font-medium">{step}</span>
            </div>
          </Card>

          {/* Process Steps Visualization */}
          <Card className="glass-card p-6 md:p-8 animate-fade-in" style={{animationDelay: '1.2s'}}>
            <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">Analysis Pipeline</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {steps.map((stepItem, index) => (
                <div key={stepItem.id} className="relative">
                  <div className={`flex flex-col items-center p-4 rounded-lg transition-all duration-500 ${
                    stepItem.completed 
                      ? 'bg-gradient-to-b from-green-100 to-emerald-100 text-green-800 shadow-md transform scale-105' 
                      : progress > (stepItem.id - 1) * 20
                      ? 'bg-gradient-to-b from-blue-100 to-indigo-100 text-blue-800 shadow-md animate-pulse'
                      : 'bg-gray-50 text-gray-500'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                      stepItem.completed 
                        ? 'bg-green-500 text-white' 
                        : progress > (stepItem.id - 1) * 20
                        ? 'bg-blue-500 text-white animate-pulse'
                        : 'bg-gray-300 text-gray-600'
                    }`}>
                      {stepItem.completed ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <span className="text-xs font-bold">{stepItem.id}</span>
                      )}
                    </div>
                    <span className="text-xs font-medium text-center leading-tight">
                      {stepItem.label}
                    </span>
                  </div>
                  
                  {/* Connection Line */}
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 -right-2 w-4 h-0.5 bg-gray-300 transform -translate-y-1/2">
                      <div className={`h-full bg-gradient-to-r ${config.gradient} transition-all duration-500 ${
                        stepItem.completed ? 'w-full' : 'w-0'
                      }`}></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Fun Facts or Tips */}
          <Card className="glass-card p-6 text-center animate-fade-in" style={{animationDelay: '1.4s'}}>
            <div className="flex items-center justify-center gap-3 mb-3">
              <Zap className="h-5 w-5 text-yellow-500 animate-pulse" />
              <span className="font-semibold text-gray-800">Did you know?</span>
            </div>
            <p className="text-gray-600">
              {analysisType === "next-page" 
                ? "Our AI analyzes each page for TNPSC-specific content and creates targeted study materials."
                : analysisType === "comprehensive"
                ? "Comprehensive analysis processes every page to create a complete study guide tailored for TNPSC preparation."
                : "Our AI processes text, identifies key concepts, and generates TNPSC-focused study materials in seconds!"
              }
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalyzingState;