import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Play, Pause, RotateCcw, Clock, Coffee, Brain, Target, Volume2, VolumeX, Square } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StudySessionTemplate } from "./StudySessionSelector";
import { useAppContext } from "@/contexts/AppContext";
import { toast } from "sonner";

interface ActiveStudySessionProps {
  template: StudySessionTemplate;
  studyTopic?: string;
  onBack: () => void;
  onComplete: () => void;
}

const ActiveStudySession = ({ template, studyTopic, onBack, onComplete }: ActiveStudySessionProps) => {
  const { 
    activeSessionType, 
    timeRemaining, 
    isSessionActive, 
    sessionPhase,
    sessionsCompletedToday,
    startStudySession,
    pauseStudySession,
    resumeStudySession,
    resetStudySession,
    completeStudySession,
    stopStudySession
  } = useAppContext();

  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showStopConfirmation, setShowStopConfirmation] = useState(false);
  const [stopNotes, setStopNotes] = useState("");

  // Initialize session when component mounts
  useEffect(() => {
    if (!activeSessionType) {
      startStudySession(template, studyTopic);
    }
  }, []);

  // Handle session completion
  useEffect(() => {
    if (timeRemaining === 0 && isSessionActive) {
      handlePhaseComplete();
    }
  }, [timeRemaining, isSessionActive]);

  const handlePhaseComplete = () => {
    if (soundEnabled) {
      playNotificationSound();
    }

    if (template.phases && currentPhaseIndex < template.phases.length - 1) {
      // Move to next phase
      const nextPhaseIndex = currentPhaseIndex + 1;
      const nextPhase = template.phases[nextPhaseIndex];
      
      setCurrentPhaseIndex(nextPhaseIndex);
      toast.success(`${template.phases[currentPhaseIndex].name} complete! Starting ${nextPhase.name}`);
      
      // Auto-start next phase after a brief pause
      setTimeout(() => {
        startStudySession({
          ...template,
          duration: nextPhase.duration
        }, studyTopic);
      }, 2000);
    } else {
      // Session complete
      completeStudySession();
      toast.success("🎉 Study session completed! Great work!");
      onComplete();
    }
  };

  const handleStopSession = () => {
    stopStudySession(stopNotes.trim() || undefined);
    setShowStopConfirmation(false);
    setStopNotes("");
    toast.success("Study session stopped and saved!");
    onComplete();
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore audio play errors (browser restrictions)
      });
    } catch (error) {
      // Ignore audio errors
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (!template.phases) {
      const totalDuration = template.duration * 60;
      return ((totalDuration - (timeRemaining || 0)) / totalDuration) * 100;
    }
    
    const currentPhase = template.phases[currentPhaseIndex];
    const phaseDuration = currentPhase.duration * 60;
    return ((phaseDuration - (timeRemaining || 0)) / phaseDuration) * 100;
  };

  const getCurrentPhase = () => {
    if (!template.phases) return null;
    return template.phases[currentPhaseIndex];
  };

  const getPhaseColor = (phaseType: string) => {
    switch (phaseType) {
      case 'focus':
        return 'from-blue-500 to-purple-600';
      case 'shortBreak':
        return 'from-green-500 to-emerald-600';
      case 'longBreak':
        return 'from-orange-500 to-red-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const currentPhase = getCurrentPhase();
  const IconComponent = template.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Dynamic Background based on session phase */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-20 sm:-top-40 -right-20 sm:-right-40 w-48 sm:w-96 h-48 sm:h-96 bg-gradient-to-br ${currentPhase ? getPhaseColor(currentPhase.type) : template.color}/20 rounded-full blur-3xl animate-pulse`}></div>
        <div className={`absolute -bottom-20 sm:-bottom-40 -left-20 sm:-left-40 w-48 sm:w-96 h-48 sm:h-96 bg-gradient-to-br ${currentPhase ? getPhaseColor(currentPhase.type) : template.color}/20 rounded-full blur-3xl animate-pulse`} style={{animationDelay: '2s'}}></div>
      </div>

      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 relative z-10">
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          {/* Header */}
          <Card className="glass-card p-3 sm:p-6 animate-fadeInUp">
            <div className="flex items-center justify-between">
              <Button
                onClick={onBack}
                variant="ghost"
                className="text-gray-600 hover:text-gray-800 p-1 sm:p-3"
              >
                <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
                Back
              </Button>
              
              <div className="flex items-center gap-1">
                <Button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 px-2 text-xs sm:text-sm"
                >
                  {soundEnabled ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
                  <span className="hidden sm:inline">Sound</span>
                </Button>
              </div>
            </div>
          </Card>

          {/* Main Timer Display */}
          <Card className="glass-card p-4 sm:p-6 md:p-8 text-center animate-fadeInScale">
            <div className="space-y-4 sm:space-y-8">
              {/* Session Info */}
              <div>
                <div className="flex flex-col items-center justify-center gap-2 mb-3 sm:mb-4">
                  <div className={`relative w-12 sm:w-20 md:w-24 h-12 sm:h-20 md:h-24 bg-gradient-to-r ${currentPhase ? getPhaseColor(currentPhase.type) : template.color} rounded-full flex items-center justify-center shadow-2xl animate-pulse`}>
                    <IconComponent className="h-6 sm:h-10 md:h-12 w-6 sm:w-10 md:w-12 text-white animate-bounce" />
                  </div>
                  <h1 className="text-lg sm:text-2xl md:text-3xl font-bold gradient-text text-center animate-fade-in" style={{animationDelay: '0.2s'}}>
                    {currentPhase ? `${template.title} - ${currentPhase.name}` : template.title}
                  </h1>
                </div>
                
                <p className="text-xs sm:text-base text-gray-600 mb-2 px-2 animate-fade-in" style={{animationDelay: '0.4s'}}>
                  {currentPhase 
                    ? `${currentPhase.type === 'focus' ? 'Stay focused with' : 'Take a break with'} the proven ${template.title.toLowerCase()} technique`
                    : `Stay focused with the proven ${template.title.toLowerCase()} technique`
                  }
                </p>
                
                {studyTopic && (
                  <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs sm:text-base px-2 sm:px-4 py-1">
                    Studying: {studyTopic}
                  </Badge>
                )}
              </div>

              {/* Phase Buttons (for multi-phase sessions) */}
              {template.phases && (
                <div className="flex justify-center gap-1 flex-wrap px-2">
                  {template.phases.map((phase, index) => (
                    <Button
                      key={index}
                      variant={index === currentPhaseIndex ? "default" : "outline"}
                      size="sm"
                      className={index === currentPhaseIndex ? `bg-gradient-to-r ${getPhaseColor(phase.type)} text-white` : ""}
                      disabled
                      style={{ fontSize: '0.65rem' }}
                    >
                      {phase.name}
                    </Button>
                  ))}
                </div>
              )}

              {/* Timer Display */}
              <div className="space-y-3 sm:space-y-6">
                <div className="text-3xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-gray-800 font-mono tracking-wider">
                  {formatTime(timeRemaining || 0)}
                </div>
                
                <div className="text-xs sm:text-base text-gray-600">
                  {currentPhase ? currentPhase.name : 'Focus Time'}
                </div>

                {/* Progress Bar */}
                <div className="max-w-xs sm:max-w-md mx-auto px-2 sm:px-0">
                  <Progress 
                    value={getProgressPercentage()} 
                    className="h-2 sm:h-4 bg-gray-200 rounded-full overflow-hidden"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-1 sm:mt-2">
                    <span>Progress</span>
                    <span>{Math.round(getProgressPercentage())}%</span>
                  </div>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex flex-col gap-2 sm:gap-3 px-2 sm:px-0">
                <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3">
                <Button
                  onClick={isSessionActive ? pauseStudySession : resumeStudySession}
                  className={`bg-gradient-to-r ${currentPhase ? getPhaseColor(currentPhase.type) : template.color} hover:shadow-lg text-white px-3 sm:px-6 py-2 sm:py-4 text-sm sm:text-lg font-semibold w-full sm:w-auto`}
                >
                  {isSessionActive ? (
                    <>
                      <Pause className="h-4 w-4 mr-1 sm:mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-1 sm:mr-2" />
                      {timeRemaining === (template.duration * 60) ? 'Start' : 'Resume'}
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={resetStudySession}
                  variant="outline"
                  className="px-3 sm:px-6 py-2 sm:py-4 text-sm sm:text-lg font-semibold border-2 w-full sm:w-auto"
                >
                  <RotateCcw className="h-4 w-4 mr-1 sm:mr-2" />
                  Reset
                </Button>
                </div>
                
                {/* Take Break Button - Only show during focus phases */}
                {(currentPhase?.type === 'focus' || !currentPhase) && isSessionActive && (
                  <Button
                    onClick={() => {
                      pauseStudySession();
                      toast.success("Break time! Take a few minutes to rest.");
                    }}
                    variant="outline"
                    className="px-3 sm:px-6 py-2 sm:py-4 text-sm sm:text-lg font-semibold border-2 w-full bg-gradient-to-r from-green-50 to-blue-50 border-green-300 text-green-700 hover:bg-gradient-to-r hover:from-green-100 hover:to-blue-100"
                  >
                    <Coffee className="h-4 w-4 mr-1 sm:mr-2" />
                    Take Break
                  </Button>
                )}
                
                <AlertDialog open={showStopConfirmation} onOpenChange={setShowStopConfirmation}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      className="px-3 sm:px-6 py-2 sm:py-4 text-sm sm:text-lg font-semibold w-full"
                    >
                      <Square className="h-4 w-4 mr-1 sm:mr-2" />
                      Stop
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-sm sm:max-w-md mx-4">
                    <AlertDialogHeader>
                      <AlertDialogTitle>End Study Session?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to end this study session? Your progress will be saved.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    
                    <div className="space-y-3 py-3">
                      <div className="space-y-2">
                        <Label htmlFor="session-notes">Session Notes (Optional)</Label>
                        <Textarea
                          id="session-notes"
                          placeholder="What did you accomplish in this session? Any key insights or topics covered..."
                          value={stopNotes}
                          onChange={(e) => setStopNotes(e.target.value)}
                          className="min-h-[60px] sm:min-h-[100px] resize-none text-sm"
                        />
                      </div>
                      <div className="text-xs text-gray-600 px-1">
                        💡 Adding notes helps you track your learning progress and review what you've studied.
                      </div>
                    </div>
                    
                    <AlertDialogFooter>
                      <AlertDialogCancel>Continue Session</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleStopSession}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        End Session
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {/* Session Stats */}
              <div className="text-center mt-3 sm:mt-0">
                <p className="text-sm sm:text-base text-gray-600">
                  Sessions completed today: <span className="font-bold text-blue-600">{sessionsCompletedToday}</span>
                </p>
              </div>
            </div>
          </Card>

          {/* Study Tips */}
          <Card className="glass-card p-3 sm:p-6 animate-fadeInUp" style={{animationDelay: '0.4s'}}>
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600" />
              Study Tips for Maximum Focus
            </h3>
            
            <div className="grid grid-cols-1 gap-2 sm:gap-4">
              {template.tips.map((tip, index) => (
                <div key={index} className="flex items-start gap-2 p-2 sm:p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                  <div className="w-5 h-5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-xs sm:text-base text-gray-700">{tip}</p>
                </div>
              ))}
            </div>

            {/* Additional Focus Tips */}
            <div className="mt-3 sm:mt-6 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
              <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2 text-xs sm:text-base">
                <Target className="h-4 w-4" />
                Pro Focus Tips
              </h4>
              <ul className="text-xs text-yellow-700 space-y-1">
                <li>• Put your phone in another room or use airplane mode</li>
                <li>• Close all unnecessary browser tabs and applications</li>
                <li>• Have water and healthy snacks nearby</li>
                <li>• Use noise-canceling headphones or white noise</li>
                <li>• Set a specific goal for this study session</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ActiveStudySession;