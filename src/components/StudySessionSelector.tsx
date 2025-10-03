import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Clock, Zap, BookOpen, Target, Coffee, Brain, Play } from "lucide-react";

export interface StudySessionTemplate {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  type: "review" | "focus" | "deep" | "practice" | "break";
  icon: React.ComponentType<any>;
  color: string;
  tips: string[];
  phases?: {
    name: string;
    duration: number;
    type: "focus" | "shortBreak" | "longBreak";
  }[];
}

interface StudySessionSelectorProps {
  onStartSession: (template: StudySessionTemplate, customTopic?: string) => void;
  onBack: () => void;
}

const StudySessionSelector = ({ onStartSession, onBack }: StudySessionSelectorProps) => {
  const [selectedTopic, setSelectedTopic] = useState("");

  const sessionTemplates: StudySessionTemplate[] = [
    {
      id: "quick-review",
      title: "Quick Review",
      description: "Perfect for reviewing notes or flashcards",
      duration: 15,
      type: "review",
      icon: Zap,
      color: "from-yellow-400 to-orange-500",
      tips: [
        "Review key concepts",
        "Use flashcards",
        "Quick recall practice"
      ]
    },
    {
      id: "pomodoro-focus",
      title: "Pomodoro Focus",
      description: "Classic 25-minute focused study session",
      duration: 25,
      type: "focus",
      icon: Clock,
      color: "from-red-400 to-pink-500",
      tips: [
        "Single subject focus",
        "No distractions",
        "5-minute break after"
      ],
      phases: [
        { name: "Focus Time", duration: 25, type: "focus" },
        { name: "Short Break", duration: 5, type: "shortBreak" }
      ]
    },
    {
      id: "deep-study",
      title: "Deep Study",
      description: "Extended session for complex topics",
      duration: 90,
      type: "deep",
      icon: Brain,
      color: "from-purple-400 to-indigo-500",
      tips: [
        "Complex problem solving",
        "Take breaks every 30 min",
        "Stay hydrated"
      ]
    },
    {
      id: "practice-session",
      title: "Practice Session",
      description: "Hands-on practice and problem solving",
      duration: 45,
      type: "practice",
      icon: Target,
      color: "from-blue-400 to-cyan-500",
      tips: [
        "Work through problems",
        "Apply concepts",
        "Check your work"
      ]
    },
    {
      id: "reading-session",
      title: "Reading Session",
      description: "Focused reading with note-taking",
      duration: 60,
      type: "focus",
      icon: BookOpen,
      color: "from-green-400 to-emerald-500",
      tips: [
        "Active reading",
        "Take notes",
        "Summarize chapters"
      ]
    },
    {
      id: "study-break",
      title: "Study & Break",
      description: "Alternating study and break periods",
      duration: 50,
      type: "break",
      icon: Coffee,
      color: "from-amber-400 to-yellow-500",
      tips: [
        "25 min study + 5 min break",
        "Repeat twice",
        "Longer break at end"
      ],
      phases: [
        { name: "Study", duration: 25, type: "focus" },
        { name: "Break", duration: 5, type: "shortBreak" },
        { name: "Study", duration: 25, type: "focus" },
        { name: "Long Break", duration: 15, type: "longBreak" }
      ]
    }
  ];

  const getTypeColor = (type: string) => {
    const colors = {
      review: "bg-yellow-100 text-yellow-700 border-yellow-200",
      focus: "bg-red-100 text-red-700 border-red-200",
      deep: "bg-purple-100 text-purple-700 border-purple-200",
      practice: "bg-blue-100 text-blue-700 border-blue-200",
      break: "bg-amber-100 text-amber-700 border-amber-200"
    };
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  const handleStartSession = (template: StudySessionTemplate) => {
    onStartSession(template, selectedTopic || undefined);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <Card className="glass-card p-3 sm:p-6 mb-4 sm:mb-8 animate-fadeInUp">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <Button
                onClick={onBack}
                variant="ghost"
                className="text-gray-600 hover:text-gray-800 p-1 sm:p-3"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              
              <div className="text-center flex-1">
                <h1 className="text-lg sm:text-2xl md:text-3xl font-bold gradient-text mb-1 sm:mb-2">
                  Choose Your Study Session
                </h1>
                <p className="text-gray-600 text-xs sm:text-base px-2">
                  Select a template that matches your learning goals
                </p>
              </div>
            </div>

            {/* Study Topic Input */}
            <div className="max-w-md mx-auto px-2 sm:px-0">
              <Label htmlFor="study-topic" className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 block">
                What are you studying today? (Optional)
              </Label>
              <Input
                id="study-topic"
                placeholder="e.g., TNPSC History, Mathematics, Science..."
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="input-elegant text-center w-full text-sm"
              />
            </div>
          </Card>

          {/* Session Templates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 stagger-animation px-2 sm:px-0">
            {sessionTemplates.map((template, index) => {
              const IconComponent = template.icon;
              
              return (
                <Card 
                  key={template.id} 
                  className="glass-card p-3 sm:p-6 hover-lift relative overflow-hidden group"
                  style={{animationDelay: `${index * 0.1}s`}}
                >
                  {/* Background Gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${template.color} opacity-5 group-hover:opacity-10 transition-opacity duration-300`}></div>
                  
                  <div className="relative z-10">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className={`p-2 rounded-full bg-gradient-to-r ${template.color} shadow-lg`}>
                        <IconComponent className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                      </div>
                      <div className="text-right">
                        <Badge className={`${getTypeColor(template.type)} border font-semibold text-xs`}>
                          {template.type}
                        </Badge>
                        <div className="text-lg sm:text-2xl font-bold text-gray-800 mt-1">
                          {template.duration} min
                        </div>
                      </div>
                    </div>

                    {/* Title and Description */}
                    <div className="mb-3 sm:mb-4">
                      <h3 className="text-base sm:text-xl font-bold text-gray-800 mb-1 sm:mb-2">
                        {template.title}
                      </h3>
                      <p className="text-gray-600 text-xs leading-relaxed">
                        {template.description}
                      </p>
                    </div>

                    {/* Study Tips */}
                    <div className="mb-4 sm:mb-6">
                      <h4 className="text-xs font-semibold text-gray-700 mb-2">Study Tips:</h4>
                      <ul className="space-y-1 sm:space-y-2">
                        {template.tips.map((tip, tipIndex) => (
                          <li key={tipIndex} className="flex items-start gap-2 text-xs text-gray-600">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Phases Preview (for multi-phase sessions) */}
                    {template.phases && (
                      <div className="mb-4 sm:mb-6">
                        <h4 className="text-xs font-semibold text-gray-700 mb-2">Session Phases:</h4>
                        <div className="flex flex-wrap gap-2">
                          {template.phases.map((phase, phaseIndex) => (
                            <Badge 
                              key={phaseIndex} 
                              variant="outline"
                              className="text-xs bg-white/50"
                            >
                              {phase.name} ({phase.duration}m)
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Start Button */}
                    <Button
                      onClick={() => handleStartSession(template)}
                      className={`w-full bg-gradient-to-r ${template.color} hover:shadow-lg text-white font-semibold py-2 sm:py-3 text-sm sm:text-base transform hover:scale-105 transition-all duration-300`}
                    >
                      <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      Start Session
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Additional Features */}
          <Card className="glass-card p-3 sm:p-6 mt-4 sm:mt-8 animate-fadeInUp mx-2 sm:mx-0" style={{animationDelay: '0.8s'}}>
            <div className="text-center">
              <h3 className="text-base sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">
                🎯 Focus Enhancement Features
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
                <div className="text-center">
                  <div className="p-2 sm:p-3 bg-blue-100 rounded-full w-fit mx-auto mb-2 sm:mb-3">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-1 sm:mb-2 text-sm sm:text-base">Background Timer</h4>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Timer continues running even when you switch to other sections
                  </p>
                </div>
                <div className="text-center">
                  <div className="p-2 sm:p-3 bg-green-100 rounded-full w-fit mx-auto mb-2 sm:mb-3">
                    <Target className="h-6 w-6 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-1 sm:mb-2 text-sm sm:text-base">Progress Tracking</h4>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Track your daily study sessions and build consistency
                  </p>
                </div>
                <div className="text-center">
                  <div className="p-2 sm:p-3 bg-purple-100 rounded-full w-fit mx-auto mb-2 sm:mb-3">
                    <Brain className="h-6 w-6 text-purple-600" />
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-1 sm:mb-2 text-sm sm:text-base">Smart Notifications</h4>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Gentle audio cues for breaks and session transitions
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudySessionSelector;