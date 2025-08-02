
import React, { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/config/firebase";
import NavigationHeader from "./components/NavigationHeader";
import StudyAssistant from "./components/StudyAssistant";
import StudyHistory from "./components/StudyHistory";
import UserProfile from "./components/UserProfile";
import ArivuChatbot from "./components/ArivuChatbot";
import LandingPage from "./components/LandingPage";
import StudySessionSelector from "./components/StudySessionSelector";
import ActiveStudySession from "./components/ActiveStudySession";
import { AppProvider } from "./contexts/AppContext";
import { useAppContext } from "./contexts/AppContext";

const queryClient = new QueryClient();

const AppContent = () => {
  const [user, loading] = useAuthState(auth);
  const [currentView, setCurrentView] = useState("study");
  const { questionResult, activeSessionType } = useAppContext();
  const [selectedStudyTemplate, setSelectedStudyTemplate] = useState<any>(null);
  const [studySessionTopic, setStudySessionTopic] = useState<string>("");

  // Handle navigation to quiz when retake quiz is triggered from study history
  React.useEffect(() => {
    if (questionResult && currentView === "history") {
      setCurrentView("study");
    }
  }, [questionResult]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case "study-sessions":
        if (selectedStudyTemplate) {
          return (
            <ActiveStudySession
              template={selectedStudyTemplate}
              studyTopic={studySessionTopic}
              onBack={() => {
                setSelectedStudyTemplate(null);
                setStudySessionTopic("");
              }}
              onComplete={() => {
                setSelectedStudyTemplate(null);
                setStudySessionTopic("");
                setCurrentView("study");
              }}
            />
          );
        }
        return (
          <StudySessionSelector
            onStartSession={(template, topic) => {
              setSelectedStudyTemplate(template);
              setStudySessionTopic(topic || "");
            }}
            onBack={() => setCurrentView("study")}
          />
        );
      case "history":
        return <StudyHistory />;
      case "profile":
        return <UserProfile />;
      case "arivu":
        return <ArivuChatbot />;
      default:
        return <StudyAssistant />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <NavigationHeader 
        currentView={currentView} 
        onViewChange={setCurrentView}
      />
      {renderCurrentView()}
    </div>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </AppProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
