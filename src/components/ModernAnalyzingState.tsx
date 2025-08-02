import { Brain, FileText, Zap, Clock, Target, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ModernAnalyzingStateProps {
  files: File[];
  analysisType: "detailed" | "quick" | "pdf" | "comprehensive";
  progress?: number;
  currentStep?: string;
}

const ModernAnalyzingState = ({ 
  files, 
  analysisType, 
  progress = 0, 
  currentStep = "Initializing analysis..." 
}: ModernAnalyzingStateProps) => {
  const getAnalysisIcon = () => {
    switch (analysisType) {
      case "detailed":
        return <Brain className="h-12 w-12 text-white" />;
      case "quick":
        return <Zap className="h-12 w-12 text-white" />;
      case "pdf":
        return <FileText className="h-12 w-12 text-white" />;
      case "comprehensive":
        return <BookOpen className="h-12 w-12 text-white" />;
      default:
        return <Brain className="h-12 w-12 text-white" />;
    }
  };

  const getAnalysisTitle = () => {
    switch (analysisType) {
      case "detailed":
        return "Performing Detailed Analysis";
      case "quick":
        return "Quick Analysis in Progress";
      case "pdf":
        return "Analyzing PDF Content";
      case "comprehensive":
        return "Comprehensive PDF Analysis";
      default:
        return "Analyzing Content";
    }
  };

  const getAnalysisSteps = () => {
    switch (analysisType) {
      case "detailed":
        return [
          "📖 Reading and parsing content",
          "🧠 Extracting key concepts",
          "🎯 Identifying TNPSC relevance",
          "📝 Creating study points",
          "✅ Finalizing analysis"
        ];
      case "quick":
        return [
          "⚡ Quick content scan",
          "🎯 Generating quiz questions",
          "✅ Preparing results"
        ];
      case "pdf":
        return [
          "📄 Processing PDF pages",
          "📖 Extracting text content",
          "🧠 Analyzing study material",
          "🎯 Finding TNPSC patterns",
          "✅ Compiling results"
        ];
      case "comprehensive":
        return [
          "📚 Scanning all pages",
          "📖 Page-by-page analysis",
          "🧠 Deep content extraction",
          "🔗 Connecting concepts",
          "📋 Creating comprehensive summary",
          "✅ Finalizing complete analysis"
        ];
      default:
        return ["🧠 Processing...", "✅ Almost done..."];
    }
  };

  const steps = getAnalysisSteps();
  const currentStepIndex = Math.floor((progress / 100) * steps.length);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-secondary/20 to-primary/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-accent/10 to-primary/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>
      
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="max-w-2xl w-full space-y-8">
          {/* Main Analysis Card */}
          <Card className="glass-card p-12 text-center animate-fadeInScale">
            <div className="space-y-8">
              {/* Animated Icon */}
              <div className="relative">
                <div className="p-6 bg-gradient-to-r from-primary to-primary-glow rounded-full w-fit mx-auto shadow-2xl animate-pulse pulse-glow">
                  {getAnalysisIcon()}
                </div>
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 to-primary-glow/20 animate-ping"></div>
              </div>

              {/* Title */}
              <div>
                <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
                  {getAnalysisTitle()}
                </h1>
                <p className="text-lg text-muted-foreground">
                  AI is processing your study materials to create personalized insights
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-4">
                <div className="progress-elegant">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{progress}% Complete</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Estimated: {Math.max(1, Math.ceil((100 - progress) / 10))} min
                  </span>
                </div>
              </div>

              {/* Current Step */}
              <div className="p-4 bg-secondary/50 rounded-xl border border-border">
                <p className="text-secondary-foreground font-medium">
                  {currentStep}
                </p>
              </div>
            </div>
          </Card>

          {/* Files Being Processed */}
          <Card className="glass-card p-6 animate-fadeInUp">
            <h3 className="text-lg font-semibold mb-4 text-center">
              Processing {files.length} file{files.length > 1 ? 's' : ''}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {files.slice(0, 4).map((file, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                  {file.type.startsWith('image/') ? (
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                  ) : (
                    <div className="p-2 bg-red-100 rounded-lg">
                      <FileText className="h-4 w-4 text-red-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                </div>
              ))}
              {files.length > 4 && (
                <div className="flex items-center justify-center p-3 bg-secondary/30 rounded-lg text-sm text-muted-foreground">
                  +{files.length - 4} more files
                </div>
              )}
            </div>
          </Card>

          {/* Analysis Steps */}
          <Card className="glass-card p-6 animate-fadeInUp" style={{animationDelay: '0.2s'}}>
            <h3 className="text-lg font-semibold mb-4 text-center">Analysis Progress</h3>
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div 
                  key={index} 
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-500 ${
                    index < currentStepIndex 
                      ? 'bg-accent-success/20 text-accent-success' 
                      : index === currentStepIndex 
                      ? 'bg-primary/20 text-primary animate-pulse' 
                      : 'bg-secondary/30 text-muted-foreground'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full ${
                    index < currentStepIndex 
                      ? 'bg-accent-success' 
                      : index === currentStepIndex 
                      ? 'bg-primary animate-pulse' 
                      : 'bg-muted-foreground/30'
                  }`}></div>
                  <span className="text-sm font-medium">{step}</span>
                  {index < currentStepIndex && (
                    <div className="ml-auto">
                      <Target className="h-4 w-4 text-accent-success" />
                    </div>
                  )}
                  {index === currentStepIndex && (
                    <div className="ml-auto">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ModernAnalyzingState;