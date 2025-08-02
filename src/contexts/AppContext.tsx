
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useEffect } from 'react';
import { AnalysisResult, QuestionResult } from '@/components/StudyAssistant';
import { StudySessionTemplate } from '@/components/StudySessionSelector';
import { saveStudyHistory } from '@/services/studyHistoryService';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/config/firebase';

interface AppContextType {
  selectedFiles: File[];
  setSelectedFiles: (files: File[]) => void;
  analysisResults: AnalysisResult[];
  setAnalysisResults: (results: AnalysisResult[]) => void;
  questionResult: QuestionResult | null;
  setQuestionResult: (result: QuestionResult | null) => void;
  difficulty: string;
  setDifficulty: (difficulty: string) => void;
  outputLanguage: "english" | "tamil";
  setOutputLanguage: (language: "english" | "tamil") => void;
  clearAppState: () => void;
  // Study Session State
  activeSessionType: string | null;
  sessionDuration: number | null;
  timeRemaining: number | null;
  isSessionActive: boolean;
  sessionPhase: 'focus' | 'shortBreak' | 'longBreak' | null;
  sessionsCompletedToday: number;
  studyTopic: string | null;
  // Study Session Actions
  startStudySession: (template: StudySessionTemplate, topic?: string) => void;
  pauseStudySession: () => void;
  resumeStudySession: () => void;
  resetStudySession: () => void;
  completeStudySession: () => void;
  stopStudySession: (notes?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider = ({ children }: AppProviderProps) => {
  const [user] = useAuthState(auth);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [questionResult, setQuestionResult] = useState<QuestionResult | null>(null);
  const [difficulty, setDifficulty] = useState("medium");
  const [outputLanguage, setOutputLanguage] = useState<"english" | "tamil">("english");
  
  // Study Session State
  const [activeSessionType, setActiveSessionType] = useState<string | null>(null);
  const [sessionDuration, setSessionDuration] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionPhase, setSessionPhase] = useState<'focus' | 'shortBreak' | 'longBreak' | null>(null);
  const [sessionsCompletedToday, setSessionsCompletedToday] = useState(0);
  const [studyTopic, setStudyTopic] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isSessionActive && timeRemaining !== null && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 1) {
            setIsSessionActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isSessionActive, timeRemaining]);

  // Load sessions completed today from localStorage
  useEffect(() => {
    const today = new Date().toDateString();
    const storedData = localStorage.getItem('studySessionsToday');
    
    if (storedData) {
      const { date, count } = JSON.parse(storedData);
      if (date === today) {
        setSessionsCompletedToday(count);
      } else {
        // New day, reset counter
        localStorage.setItem('studySessionsToday', JSON.stringify({ date: today, count: 0 }));
        setSessionsCompletedToday(0);
      }
    } else {
      localStorage.setItem('studySessionsToday', JSON.stringify({ date: today, count: 0 }));
    }
  }, []);

  const startStudySession = (template: StudySessionTemplate, topic?: string) => {
    setActiveSessionType(template.id);
    setSessionDuration(template.duration * 60);
    setTimeRemaining(template.duration * 60);
    setIsSessionActive(true);
    setStudyTopic(topic || null);
    setSessionStartTime(new Date());
    
    // Set phase for multi-phase sessions
    if (template.phases && template.phases.length > 0) {
      setSessionPhase(template.phases[0].type);
    } else {
      setSessionPhase('focus');
    }
  };

  const pauseStudySession = () => {
    setIsSessionActive(false);
  };

  const resumeStudySession = () => {
    setIsSessionActive(true);
  };

  const resetStudySession = () => {
    if (sessionDuration) {
      setTimeRemaining(sessionDuration);
      setIsSessionActive(false);
    }
  };

  const completeStudySession = async () => {
    await handleSessionEnd(false);
  };

  const stopStudySession = async (notes?: string) => {
    await handleSessionEnd(true, notes);
  };

  const handleSessionEnd = async (isStopped: boolean = false, notes?: string) => {
    if (user && activeSessionType && sessionStartTime) {
      try {
        // Calculate actual study time
        const endTime = new Date();
        const actualDuration = Math.round((endTime.getTime() - sessionStartTime.getTime()) / 1000 / 60);
        
        // Save to study history
        await saveStudyHistory(
          user.uid,
          "study-session" as any, // Extend the type in studyHistoryService if needed
          {
            sessionType: activeSessionType,
            plannedDuration: sessionDuration ? Math.round(sessionDuration / 60) : 0,
            actualDuration,
            topic: studyTopic,
            completed: !isStopped,
            stopped: isStopped,
            startTime: sessionStartTime,
            endTime,
            notes: notes || undefined
          },
          {
            fileName: `Study Session - ${studyTopic || activeSessionType}`,
            difficulty: "medium",
            language: "english",
            notes: notes || undefined
          }
        );
      } catch (error) {
        console.error("Failed to save study session:", error);
      }
    }
    
    // Update daily counter only if session was completed (not stopped early)
    const newCount = !isStopped ? sessionsCompletedToday + 1 : sessionsCompletedToday;
    setSessionsCompletedToday(newCount);
    
    const today = new Date().toDateString();
    localStorage.setItem('studySessionsToday', JSON.stringify({ date: today, count: newCount }));
    
    // Reset session state
    setActiveSessionType(null);
    setSessionDuration(null);
    setTimeRemaining(null);
    setIsSessionActive(false);
    setSessionPhase(null);
    setStudyTopic(null);
    setSessionStartTime(null);
  };

  const clearAppState = () => {
    setSelectedFiles([]);
    setAnalysisResults([]);
    setQuestionResult(null);
    setDifficulty("medium");
    setOutputLanguage("english");
    // Don't clear study session state when clearing app state
  };

  return (
    <AppContext.Provider value={{
      selectedFiles,
      setSelectedFiles,
      analysisResults,
      setAnalysisResults,
      questionResult,
      setQuestionResult,
      difficulty,
      setDifficulty,
      outputLanguage,
      setOutputLanguage,
      clearAppState,
      // Study Session State
      activeSessionType,
      sessionDuration,
      timeRemaining,
      isSessionActive,
      sessionPhase,
      sessionsCompletedToday,
      studyTopic,
      // Study Session Actions
      startStudySession,
      pauseStudySession,
      resumeStudySession,
      resetStudySession,
      completeStudySession,
      stopStudySession
    }}>
      {children}
    </AppContext.Provider>
  );
};
