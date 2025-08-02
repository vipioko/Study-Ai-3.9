
import React, { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/config/firebase";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import NavigationHeader from "./components/NavigationHeader";
import StudyAssistant from "./components/StudyAssistant";
import StudyHistory from "./components/StudyHistory";
import UserProfile from "./components/UserProfile";
import ArivuChatbot from "./components/ArivuChatbot";
import AdminPanel from "./components/AdminPanel";
import Library from "./components/Library";
import LandingPage from "./components/LandingPage";
import StudySessionSelector from "./components/StudySessionSelector";
import ActiveStudySession from "./components/ActiveStudySession";
import { AppProvider } from "./contexts/AppContext";
import { useAppContext } from "./contexts/AppContext";

const queryClient = new QueryClient();

const AppContent = () => {
  const [user, loading] = useAuthState(auth);
  const { questionResult, activeSessionType } = useAppContext();
  const [selectedStudyTemplate, setSelectedStudyTemplate] = useState<any>(null);
  const [studySessionTopic, setStudySessionTopic] = useState<string>("");

  // Handle navigation to quiz when retake quiz is triggered from study history
  React.useEffect(() => {
    if (questionResult) {
      // Navigate to quiz route when question result is available
      window.location.hash = "#/quiz";
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


  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <NavigationHeader />
        <Routes>
          <Route path="/" element={<StudyAssistant />} />
          <Route path="/study" element={<StudyAssistant />} />
          <Route path="/study-sessions" element={
            selectedStudyTemplate ? (
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
                  window.location.hash = "#/study";
                }}
              />
            ) : (
              <StudySessionSelector
                onStartSession={(template, topic) => {
                  setSelectedStudyTemplate(template);
                  setStudySessionTopic(topic || "");
                }}
                onBack={() => window.location.hash = "#/study"}
              />
            )
          } />
          <Route path="/history" element={<StudyHistory />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/arivu" element={<ArivuChatbot />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/library" element={<Library />} />
          <Route path="/quiz" element={<StudyAssistant />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
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
