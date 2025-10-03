I will update the Gemini prompt in your `ArivuChatbot` component to enforce a **clearer, bulleted, and unformatted** output style, ensuring the response is concise and directly answers the user's implicit request for study notes.

### Updated `ArivuChatbot.tsx` Script

The major changes are:
1.  **Simplify and Stricten the Gemini Prompt:** Remove the conversational overhead and specifically instruct the model to use plain text/bullets and avoid Markdown formatting (`**`).
2.  **Add Final Output Instruction:** Tell the model to stick strictly to the analysis of the *uploaded image* when files are present.

The relevant change is in the `sendMessage` function, where the `prompt` is constructed (around lines 152-178).

```typescript
// src/components/admin/ArivuChatbot.tsx
// VERSION: Final - Refined prompt for concise, unformatted, and useful TNPSC output.

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Paperclip, Image, MessageCircle, Brain, User, Languages } from "lucide-react";
import { toast } from "sonner";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/config/firebase";
import { getStudyHistory } from "@/services/studyHistoryService";

interface Message {
  id: string;
  content: string;
  sender: "user" | "arivu";
  timestamp: Date;
  attachments?: File[];
}

const ArivuChatbot = () => {
  const [user] = useAuthState(auth);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! I'm Arivu, your intelligent study companion. I have access to your complete study history and can provide personalized guidance. I can help with TNPSC preparation, connect your current questions to previously studied materials, suggest study strategies based on your performance, and much more. What would you like to explore today?",
      sender: "arivu",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [language, setLanguage] = useState<"english" | "tamil">("english");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyDQcwO_13vP_dXB3OXBuTDvYfMcLXQIfkM";

  useEffect(() => {
    if (language === "tamil") {
      setMessages(prev => prev.length === 1 ? [{
        id: "1",
        content: "வணக்கம்! நான் அறிவு, உங்கள் புத்திசாலி படிப்பு துணைவன். உங்கள் முழு படிப்பு வரலாறும் எனக்குத் தெரியும், தனிப்பட்ட வழிகாட்டுதல் வழங்க முடியும். தமிழ்நாடு பொதுச் சேவை ஆணையம் தயாரிப்பு, முன்பு படித்த பொருட்களுடன் தற்போதைய கேள்விகளை இணைத்தல், உங்கள் செயல்திறனின் அடிப்படையில் படிப்பு உத்திகளை பரிந்துரைத்தல் மற்றும் பல விஷயங்களில் உதவ முடியும். இன்று நீங்கள் என்ன ஆராய விரும்புகிறீர்கள்?",
        sender: "arivu",
        timestamp: new Date()
      }] : prev);
    }You are correct. The AI's response in the image is too verbose, uses unnecessary markdown artifacts (`**`), and the structure is overly elaborate for a quick, supportive chatbot.

We need to make the AI's response logic in `ArivuChatbot.tsx` much crisper and cleaner by heavily modifying the **PROMPT** used to generate the response.

### The Fix: Refining the Gemini Prompt

The main issue is the prompt encourages verbosity and markdown for structure. We will simplify the prompt by:

1.  **Removing Redundant Instructions:** The AI knows its name and features.
2.  **Explicitly forbidding unnecessary Markdown.**
3.  **Prioritizing a Concise, Direct Answer.**
4.  **Limiting Output Length:** Reducing the `maxOutputTokens` from 2000 to a lower, conversational limit (e.g., 512 or 768) to force conciseness.

### Full Updated `ArivuChatbot.tsx` Script

The major changes are in the `sendMessage` function's `prompt` and `generationConfig`.

```typescript
// src/components/admin/ArivuChatbot.tsx

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Paperclip, Image, MessageCircle, Brain, User, Languages } from "lucide-react";
import { toast } from "sonner";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/config/firebase";
import { getStudyHistory } from "@/services/studyHistoryService";

interface Message {
  id: string;
  content: string;
  sender: "user" | "arivu";
  timestamp: Date;
  attachments?: File[];
}

const ArivuChatbot = () => {
  const [user] = useAuthState(auth);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! I'm Arivu, your intelligent study companion. I have access to your complete study history and can provide personalized guidance. I can help with TNPSC preparation, connect your current questions to previously studied materials, suggest study strategies based on your performance, and much more. What would you like to explore today?",
      sender: "arivu",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [language, setLanguage] = useState<"english" | "tamil">("english");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // NOTE: Assuming GEMINI_API_KEY is correctly imported from env variables
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyDQcwO_13vP_dXB3OXBuTDvYfMcLXQIfkM";

  useEffect(() => {
    if (language === "tamil") {
      setMessages(prev => prev.length === 1 ? [{
        id: "1",
        content: "வணக்கம்! நான் அறிவு, உங்கள் புத்திசாலி படிப்பு துணைவன். உங்கள் முழு படிப்பு வரலாறும் எனக்குத் தெரியும், தனிப்பட்ட வழிகாட்டுதல் வழங்க முடியும். தமிழ்நாடு பொதுச் சேவை ஆணையம் தயாரிப்பு, முன்பு படித்த பொருட்களுடன் தற்போதைய கேள்விகளை இணைத்தல், உங்கள் செயல்திறனின் அடிப்படையில் படிப்பு உத்திகளை பரிந்துரைத்தல் மற்றும் பல விஷயங்களில் உதவ முடியும். இன்று நீங்கள் என்ன ஆராய விரும்புகிறீர்கள்?",
        sender: "arivu",
        timestamp: new Date()
      }] = recentPerformance[0] > recentPerformance[1] ? "improving" : "needs attention";
          contextText += `PERFORMANCE TREND: ${trend}\n`;
        }
      }
      
      return contextText;
    } catch (error) {
      console.error("Error fetching study history:", error);
      return "";
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => 
      file.type.startsWith('image/') || file.type === 'application/pdf'
    );
    
    if (validFiles.length !== fileArray.length) {
      toast.error("Only image files and PDF files are supported");
    }
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() && selectedFiles.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: "user",
      timestamp: new Date(),
      attachments: selectedFiles
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const conversationHistory = messages.slice(-5).map(msg => 
        `${msg.sender === 'user' ? 'User' : 'Arivu'}: ${msg.content}`
      ).join('\n');

      const studyHistory = await fetchRecentStudyHistory();

      const languageInstruction = language === "tamil" 
        ? "Please respond in Tamil language using Tamil script."
        : else {
      setMessages(prev => prev.length === 1 ? [{
        id: "1",
        content: "Hello! I'm Arivu, your intelligent study companion. I have access to your complete study history and can provide personalized guidance. I can help with TNPSC preparation, connect your current questions to previously studied materials, suggest study strategies based on your performance, and much more. What would you like to explore today?",
        sender: "arivu",
        timestamp: new Date()
      }] : prev);
    }
  }, [language]);

  const fetchRecentStudyHistory = async () => {
    if (!user) return "";
    
    try {
      const history = await getStudyHistory(user.uid);
      const recentHistory = history.slice(0, 10); // Get more history for better context
      
      // Create comprehensive study context
      const analysisRecords = recentHistory.filter(h => h.type === "analysis");
      const quizRecords = recentHistory.filter(h => h.type === "quiz");
      
      let contextText = "";
      
      if (analysisRecords.length > 0) {
        contextText += "RECENT STUDY MATERIALS:\n";
        analysisRecords.slice(0, 5).forEach((record, index) => {
          if (record.analysisData) {
            contextText += `${index + 1}. ${record.fileName || 'Study Material'}\n`;
            contextText += `   Key Topics: ${record.analysisData.keyPoints?.slice(0, 3).join(', ') || 'N/A'}\n`;
            contextText += `   Summary: ${record.analysisData.summary?.substring(0, 100) || 'N/A'}...\n`;
            if (record.analysisData.studyPoints?.length > 0) {
              contextText += `   Study Points: ${record.analysisData.studyPoints.slice(0, 2).map(p => p.title).join(', ')}\n`;
            }
          }
        });
        contextText += "\n";
      }
      
      if (quizRecords.length > 0) {
        contextText += "RECENT QUIZ PERFORMANCE:\n";
        quizRecords.slice(0, 3).forEach((record, index) => {
          contextText += `${index + 1}. ${record.fileName || 'Quiz'} - Score: ${record.score}/${record.totalQuestions} (${record.percentage}%)\n`;
          contextText += `   Difficulty: ${record.difficulty}, Language: ${ : prev);
    } else {
      setMessages(prev => prev.length === 1 ? [{
        id: "1",
        content: "Hello! I'm Arivu, your intelligent study companion. I have access to your complete study history and can provide personalized guidance. I can help with TNPSC preparation, connect your current questions to previously studied materials, suggest study strategies based on your performance, and much more. What would you like to explore today?",
        sender: "arivu",
        timestamp: new Date()
      }] : prev);
    }
  }, [language]);

  const fetchRecentStudyHistory = async () => {
    if (!user) return "";
    
    try {
      const history = await getStudyHistory(user.uid);
      const recentHistory = history.slice(0, 10); // Get more history for better context
      
      // Create comprehensive study context
      const analysisRecords = recentHistory.filter(h => h.type === "analysis");
      const quizRecords = recentHistory.filter(h => h.type === "quiz");
      
      let contextText = "";
      
      if (analysisRecords.length > 0) {
        contextText += "RECENT STUDY MATERIALS:\n";
        analysisRecords.slice(0, 5).forEach((record, index) => {
          if (record.analysisData) {
            contextText += `${index + 1}. ${record.fileName || 'Study Material'}\n`;
            contextText += `   Key Topics: ${record.analysisData.keyPoints?.slice(0, 3).join(', ') || 'N/A'}\n`;
            contextText += `   Summary: ${record.analysisData.summary?.substring(0, 100) || 'N/A'}...\n`;
            if (record.analysisData.studyPoints?.length > 0) {
              contextText += `   Study Points: ${record.analysisData.studyPoints.slice(0, 2).map(p => p.title).join(', ')}\n`;
            }
          }
        });
        contextText += "\n";
      }
      
      if (quizRecords.length > 0) {
        contextText += "RECENT QUIZ PERFORMANCE:\n";
        quizRecords.slice(0, 3).forEach((record, index) => {
          contextText += `${index + 1}. ${record.fileName || 'Quiz'} - Score: ${record.score}/${record.totalQuestions} (${record.percentage}%)\n`;
          contextText += `   Difficulty: ${record "Please respond in English language.";

      // Enhanced context-aware prompt
      let prompt = `You are 'Arivu', an intelligent AI study companion with deep knowledge of the user's learning journey. Your primary expertise is TNPSC (Tamil Nadu Public Service Commission) exam preparation.

INTELLIGENT FEATURES:
- You have access to the user's complete study history and can reference previous materials
- You can provide personalized study recommendations based on past performance
- You proactively offer relevant suggestions from the user's study database

RESPONSE APPROACH:
- Be helpful, accurate, and conversational.
- **CRITICAL: Be Concise and Stick to the main point.**
- **CRITICAL: Avoid ALL unnecessary Markdown formatting (e.g., **, #, ---, long lists of bullet points). Use simple text paragraphs.**
- ALWAYS check if the question relates to previously studied materials and mention connections (e.g., "This relates to your recent study on [topic]...").
- For TNPSC topics, provide exam-focused content with brief, effective memory tips (e.g., "Memory Tip: Article 76 = AG (Attorney General)").
- ${languageInstruction}
- Be encouraging and supportive.

${studyHistory ? `USER'S STUDY CONTEXT:\n${studyHistory}\n` : 'No previous study history available.\n'}

Conversation history:
${conversationHistory}

User's newrecord.language}\n`;
        });
        
        // Calculate average performance
        const avgScore = Math.round(quizRecords.reduce((acc, h) => acc + (h.percentage || 0), 0) / quizRecords.length);
        contextText += `   Average Performance: ${avgScore}%\n\n`;
      }
      
      // Add study patterns and suggestions
      if (recentHistory.length > 0) {
        const recentTopics = analysisRecords
          .map(r => r.analysisData?.mainTopic || r.fileName)
          .filter(Boolean)
          .slice(0, 5);
        
        if (recentTopics.length > 0) {
          contextText += `RECENT STUDY FOCUS: ${recentTopics.join(', ')}\n`;
        }
        
        // Add performance insights
        if (quizRecords.length >= 2) {
          const recentPerformance = quizRecords.slice(0, 3).map(q => q.percentage || 0);
          const trend = recentPerformance[0].difficulty}, Language: ${record.language}\n`;
        });
        
        // Calculate average performance
        const avgScore = Math.round(quizRecords.reduce((acc, h) => acc + (h.percentage || 0), 0) / quizRecords.length);
        contextText += `   Average Performance: ${avgScore}%\n\n`;
      }
      
      // Add study patterns and suggestions
      if (recentHistory.length > 0) {
        const recentTopics = analysisRecords
          .map(r => r.analysisData?.mainTopic || r.fileName)
          .filter(Boolean)
          .slice(0, 5);
        
        if (recentTopics.length > 0) {
          contextText += `RECENT STUDY FOCUS: ${recentTopics.join(', ')}\n`;
        }
        
        // Add performance insights
        if (quizRecords.length >= 2) {
          const recentPerformance = quizRecords.slice(0, 3).map(q => q.percentage || 0);
          const trend = recentPerformance[0] > recentPerformance[1] ? "improving" : "needs attention";
          contextText += `PERFORMANCE TREND: ${trend}\n`;
        }
      }
      
      return contextText;
    } catch (error) {
      console.error("Error fetching study history:", error);
      return "";
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => 
      file.type.startsWith('image/') || file.type === 'application/pdf'
    );
    
    if (validFiles.length !== fileArray.length) {
      toast.error("Only image files and PDF files are supported");
    }
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const sendMessage message: ${inputMessage}

Remember: Provide direct, useful, concise answers, and proactively connect to the user's study history!`;

      const requestBody: any = {
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
        }
      };

      // Add images if any
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          if (file.type.startsWith('image/')) {
            const base64Image = await convertToBase64(file);
            // FIX: Use inlineData (camelCase) as required by the v1beta endpoint
            requestBody.contents[0].parts.push({
              inlineData: {
                mime_type: file.type,
                data: base64Image.split(',')[1]
              }
            });
          }
        }
      } else {
          // Ensure the contents array is correctly structured even without image parts
          if (!requestBody.contents[0].parts) {
              requestBody.contents[0].parts = [];
          }
          // The prompt text is already the first part, so this block is mainly for safety.
      }
      
      // Safety check for contents array structure for text-only messages (if image loop didn't run)
      if (!requestBody.contents[0].parts. > recentPerformance[1] ? "improving" : "needs attention";
          contextText += `PERFORMANCE TREND: ${trend}\n`;
        }
      }
      
      return contextText;
    } catch (error) {
      console.error("Error fetching study history:", error);
      return "";
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => 
      file.type.startsWith('image/') || file.type === 'application/pdf'
    );
    
    if (validFiles.length !== fileArray.length) {
      toast.error("Only image files and PDF files are supported");
    }
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() && selectedFiles.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: "user",
      timestamp: new Date(),
      attachments: selectedFiles
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const conversationHistory = messages.slice(-5).map(msg => 
        `${msg.sender === 'user' ? 'User' : 'Arivu'}: ${msg.content}`
      ).join('\ = async () => {
    if (!inputMessage.trim() && selectedFiles.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: "user",
      timestamp: new Date(),
      attachments: selectedFiles
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const conversationHistory = messages.slice(-5).map(msg => 
        `${msg.sender === 'user' ? 'User' : 'Arivu'}: ${msg.content}`
      ).join('\n');

      const studyHistory = await fetchRecentStudyHistory();

      const languageInstruction = language === "tamil" 
        ? "Please respond in Tamil language using Tamil script."
        : "Please respond in English language.";

      // ========================================================================
      // *** PROMPT FIX: Make Response Crisper and Remove Unnecessary Markdown ***
      // ========================================================================
      let prompt = `You are 'Arivu', an intelligent, conversational, and concise AI study companion. Your primary role is to assist with TNPSC (Tamil Nadu Public Service Commission) exam preparation.

INTELLIGENT FEATURES:
- You have access to the user's complete study history.
- You must connect the user's question to their study history (e.g., "This relates to the [document] you studied...").
- You must provide brief, exam-focused, and factual answers.

RESPONSE APPROACH:
- **Be extremely concise and direct.** Stick to the core facts.
- **DO NOT use excessive or unnecessary markdown (like triple asterisks or bullet points for a single thought).** Use singlesome((p: any) => p.text)) {
          // If the prompt was the only part and got replaced, ensure it's still there
          requestBody.contents[0].parts.unshift({ text: prompt });
      }

      // Use the stable v1beta endpoint with gemini-2.5-flash
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText.substring(0, 100)}...`);
      }

      const data = await response.json();
      const arivuResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (arivuResponse) {
        const arivuMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: arivuResponse,
          sender: "arivu",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, arivuMessage]);
      } else {
        throw new Error('No response from Arivu');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Failed to get response from Arivu. Please try again.");
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: language === "tamil" 
          ? "மன்னிக்கவும், இப்போது பதிலளிப்பதில் சிக்கல் உள்ளது. சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்."
          : "I'm sorry, I'm having trouble responding right now. Please try again in a moment.",
        sender: "arivu",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setSelectedFiles([]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Scroll to the bottom of the chat area whenever messages update
  useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({
            top: scrollAreaRefn');

      const studyHistory = await fetchRecentStudyHistory();

      const languageInstruction = language === "tamil" 
        ? "Please respond in Tamil language using Tamil script."
        : "Please respond in English language.";

      // ========================================================================
      // *** PROMPT FIX: Simplified and Stricter for Concise Output ***
      // ========================================================================
      let prompt = `You are 'Arivu', an intelligent AI study companion with deep knowledge of the user's learning journey.

CRITICAL INSTRUCTIONS:
- You are a specialized TNPSC study partner. Prioritize accuracy and conciseness.
- For analysis of an uploaded image/document, your output MUST be a structured, unformatted, point-by-point summary of the facts.
- **Do NOT use Markdown formatting like **bold** or *italics*. Use clear bullet points (-) or numbered lists.**
- **Stick strictly to the facts and avoid overly conversational or elaborate phrasing.**
- ${languageInstruction}

INTELLIGENT FEATURES:
- You have access to the user's study history (provided below). Proactively suggest connections or related study materials when relevant.
- Proactively suggest study strategies or knowledge gaps based on the performance context.

${studyHistory ? `USER'S STUDY CONTEXT:\n${studyHistory}\n` : 'No previous study history available.\n'}

User's Query (Analyze/Question/Message): ${inputMessage}

REMEMBER: Be concise, accurate, and avoid unnecessary conversational fluff or Markdown formatting.`;
      // ========================================================================


      const requestBody: any = {
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.5, // Reduced temperature for more deterministic/factual output
          maxOutputTokens: 2000,
        }
      };

      // Add images if any
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          if (file.type.startsWith('image/')) {
            const base64Image = await convertToBase64(file);
            // NOTE: You are using the INLINE_DATA structure for the REST asterisks (*) only for *bolding* keywords.
- Limit your answer to a maximum of 4 small paragraphs.
- ALWAYS check if the question relates to previously studied materials and reference them.
- Proactively suggest one related topic or study tip from the user's context.
- ${languageInstruction}

${studyHistory ? `USER'S STUDY CONTEXT:\n${studyHistory}\n` : 'No previous study history available.\n'}

Conversation history:
${conversationHistory}

User's new message: ${inputMessage}

Remember: Be concise, factual, and proactive in connecting the question to the user's study history!`;
      // ========================================================================

      const requestBody: any = {
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 768, // Reduced from 2000 to force conciseness
        }
      };

      // Add images if any
      if (selectedFiles.length > 0) {
        //.current.scrollHeight,
            behavior: 'smooth'
        });
    }
  }, [messages]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-green-400/20 to-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-gradient-to-br from-cyan-400/15 to-indigo-400/15 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-gradient-to-br from-yellow-40 API
            requestBody.contents[0].parts.push({
              inlineData: { // Corrected from inline_data in previous steps
                mime_type: file.type,
                data: base64Image.split(',')[1]
              }
            });
          }
        }
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const arivuResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (arivuResponse) {
        const arivuMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: arivuResponse,
          sender: "arivu",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, arivuMessage]);
      } else {
        throw new Error('No response from Arivu');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Failed to get response from Arivu. Please try again.");
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: language === "tamil" 
          ? "மன்னிக்கவும், இப்போது பதிலளிப்பதில் சிக்கல் உள்ளது. சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்."
          : "I'm sorry, I'm having trouble responding right now. Please try again in NOTE: The previous inline_data structure was fixed in the service layer, but 
        // to be compatible with this multi-part request, we ensure the correct casing.
        const imageParts = [];
        for (const file of selectedFiles) {
          if (file.type.startsWith('image/')) {
            const base64Image = await convertToBase64(file);
            imageParts.push({
              inlineData: { // Use correct casing for safety
                mime_type: file.type,
                data: base64Image.split(',')[1]
              }
            });
          }
        }
        requestBody.contents[0].parts.push(...imageParts);
      }

      // NOTE: Using gemini-2.5-flash which is generally better for complex instructions
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API error:", errorText);
        throw new Error(`HTTP error! status: ${response.status}. Details: ${errorText.substring(0, 100)}`);
      }

      const data = await response.json();
      const arivuResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (arivuResponse) {
        const arivuMessage: Message = {
          id0/15 to-orange-400/15 rounded-full blur-3xl animate-pulse" style={{animationDelay: '6s'}}></div>
      </div>

      <div className="container mx-auto px-4 py-6 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <Card className="glass-card p-4 md:p-6 mb-6 animate-fadeInUp">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-r from-green-500 to-blue-600 rounded-full shadow-lg">
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold gradient-text">
                    Arivu - AI Assistant
                  </h1>
                  <p className="text-gray-600">Your intelligent study companion</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-r from-orange-400 to-red-500 rounded-lg shadow-md">
                  <Languages className="h-4 w-4 text-white" />
                </div>
                <select
                  value={language}
 a moment.",
        sender: "arivu",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setSelectedFiles([]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-green-400/20 to-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400: (Date.now() + 1).toString(),
          content: arivuResponse,
          sender: "arivu",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, arivuMessage]);
      } else {
        throw new Error('No response content received from Arivu');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Failed to get response from Arivu. Please try again.");
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: language === "tamil" 
          ? "மன்னிக்கவும், இப்போது பதிலளிப்பதில் சிக்கல் உள்ளது. சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்."
          : `I'm sorry, I'm having trouble responding right now. Please try again in a moment.`,
        sender: "arivu",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setSelectedFiles([]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.                  onChange={(e) => setLanguage(e.target.value as "english" | "tamil")}
                  className="input-elegant text-sm py-2 px-3 relative z-10"
                >
                  <option value="english">English</option>
                  <option value="tamil">தமிழ்</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Chat Area */}
          <Card className="glass-card animate-fadeInUp" style={{animationDelay: '0.2s'}}>
            <ScrollArea className="h-[500px] p-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fadeInUp`}
                    style={{animationDelay: `${index * 0.1}s`}}
                  >
                    {message.sender === 'arivu' && (
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-gradient-to-br from-cyan-400/15 to-indigo-400/15 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-gradient-to-br from-yellow-400/15 to-orange-400/15 rounded-full blur-3xl animate-pulse" style={{animationDelay: '6s'}}></div>
      </div>

      <div className="container mx-auto px-4 py-6 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <Card className="glass-card p-4 md:p-6 mb-6 animate-fadeInUp">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-r from-green-500 to-blue-600 rounded-full shadow-lg">
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold gradient-text">
                    Arivu - AI Assistant
                  </h1>
                  <p className="text-gray-600">Your intelligent study companion</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-r from-orange-400 to-red-500 rounded-preventDefault();
      sendMessage();
    }
  };

  // Auto-scroll logic (optional but good for chat UIs)
  useEffect(() => {
    if (scrollAreaRef.current) {
        const scrollElement = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (scrollElement) {
            scrollElement.scrollTop = scrollElement.scrollHeight;
        }
    }
  }, [messages]);


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-green-400/20 to-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-gradient-to-br from-cyan-400/15 to-indigo-400/15 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
        <div className="absolute bottom-1/4 left-0 shadow-lg">
                        <Brain className="h-4 w-4 text-white" />
                      </div>
                    )}
                    
                    <div className={`max-w-[80%] ${message.sender === 'user' ? 'order-1' : 'order-2'}`}>
                      <div
                        className={`p-3 rounded-2xl backdrop-blur-sm shadow-lg ${
                          message.sender === 'user'
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white ml-auto hover:shadow-xl transition-all duration-300'
                            : 'bg-white/95 text-gray-800 border border-gray-200/50 hover:shadow-xl transition-all duration-300'
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2 space-ylg shadow-md">
                  <Languages className="h-4 w-4 text-white" />
                </div>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as "english" | "tamil")}
                  className="input-elegant text-sm py-2 px-3 relative z-10"
                >
                  <option value="english">English</option>
                  <option value="tamil">தமிழ்</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Chat Area */}
          <Card className="glass-card animate-fadeInUp" style={{animationDelay: '0.2s'}}>
            <ScrollArea className="h-[500px] p-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fadeInUp`}
                    style={{animationDelay: `${index * 0.1}s`}}
                  >
                    {message.sender === 'arivu' && (
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                        <Brain className="h-4 w-4 text-white" />
                      </div>
                    )}
                    
                    <div className={`max-w-[80%] ${message.sender === 'user' ? 'order-1' : '-1/4 w-64 h-64 bg-gradient-to-br from-yellow-400/15 to-orange-400/15 rounded-full blur-3xl animate-pulse" style={{animationDelay: '6s'}}></div>
      </div>

      <div className="container mx-auto px-4 py-6 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <Card className="glass-card p-4 md:p-6 mb-6 animate-fadeInUp">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-r from-green-500 to-blue-600 rounded-full shadow-lg">
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold gradient-text">
                    Arivu - AI Assistant
                  </h1>
                  <p className="text-gray-600">Your intelligent study companion</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-r from-orange-400 to-red-500 rounded-lg shadow-md">
                  <Languages className="h-4 w-4 text-white" />
                </div>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as "english" | "tamil")}
                  -1">
                            {message.attachments.map((file, index) => (
                              <div key={index} className="text-xs opacity-75 bg-white/20 rounded-lg px-2 py-1">
                                📎 {file.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 px-1">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>

                    {message.sender === 'user' && (
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 order-2 shadow-lg">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                      <Brain className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-gray-100 p-3 rounded-2xl">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
order-2'}`}>
                      <div
                        className={`p-3 rounded-2xl backdrop-blur-sm shadow-lg ${
                          message.sender === 'user'
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white ml-auto hover:shadow-xl transition-all duration-300'
                            : 'bg-white/95 text-gray-800 border border-gray-200/50 hover:shadow-xl transition-all duration-300'
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {message.attachments.map((file, index) => (
                              <div key={index} className="text-xs opacity-75 bg-white/20 rounded-lg px-2 py-1">
                                📎 {file.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 px-1">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>

                    {message.sender === 'user' && (
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 order-2 shadow-lg">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    )}
                  className="input-elegant text-sm py-2 px-3 relative z-10"
                >
                  <option value="english">English</option>
                  <option value="tamil">தமிழ்</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Chat Area */}
          <Card className="glass-card animate-fadeInUp" style={{animationDelay: '0.2s'}}>
            <ScrollArea className="h-[500px] p-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fadeInUp`}
                    style={{animationDelay: `${index * 0.1}s`}}
                  >
                    {message.sender === 'arivu' && (
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                        <Brain className="h-4 w-4 text-white" />
                      </div>
                    )}
                    
                    <div className={`max-w-[80%] ${message.sender === 'user' ? 'order-1' : 'order-2'}`}>
                                          </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* File Attachments */}
            {selectedFiles.length > 0 && (
              <div className="border-t border-gray-200/50 p-4 bg-gradient-to-r from-purple-50/50 to-blue-50/50">
                <div className="flex flex-wrap gap-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 glass-card px-3 py-2 animate-fadeInUp" style={{animationDelay: `${index * 0.1}s`}}>
                      {file.type.startsWith('image/') ? (
                        <div className="p-1 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-lg">
                          <Image className="h-3 w-3 text-white" />
                        </div>
                      ) : (
                        <div className="p-1 bg-gradient-to-r from-red-400 to-pink-500 rounded-lg">
                          <Paperclip className="h-3 w-3 text-white" />
                        </div>
                      )}
                      <span className="text-sm text-blue-800 font-medium truncate max-w-[100px]">
                        {file.name}
                      </span>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full w-5 h-5 flex items-center justify-center transition-all duration-200 text-sm leading-none"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="border-t border-gray-200/50 p-4 bg-gradient-to-r from-blue-50/50 to-purple-50/50 backdrop-blur-sm">
              <div className="flex gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileSelect(e.target.files)}
                  accept="image/*,application/pdf"
                  multiple
                  className="hidden"
                />
                
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  size="sm"
                  className="</div>
                ))}
                
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                      <Brain className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-gray-100 p-3 rounded-2xl">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* File Attachments */}
            {selectedFiles.length > 0 && (
              <div className="border-t border-gray-200/50 p-4 bg-gradient-to-r from-purple-50/50 to-blue-50/50">
                <div className="flex flex-wrap gap-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 glass-card px-3 py-2 animate-fadeInUp" style={{animationDelay: `${index * 0.1}s`}}>
<div
                        className={`p-3 rounded-2xl backdrop-blur-sm shadow-lg ${
                          message.sender === 'user'
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white ml-auto hover:shadow-xl transition-all duration-300'
                            : 'bg-white/95 text-gray-800 border border-gray-200/50 hover:shadow-xl transition-all duration-300'
                        }`}
                      >
                        {/* FIX: Render the markdown content safely and style it */}
                        <div className="prose prose-sm max-w-none">
                            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        </div>
                        
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {message.attachments.map((file, index) => (
                              <div key={index} className="text-xs opacity-75 bg-white/20 rounded-lg px-2 py-1">
                                📎 {file.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 px-1">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>

                    {message.sender === 'user' && (
                      <div classNameflex-shrink-0 btn-secondary"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={language === "tamil" 
                    ? "எதைப் பற்றி கேட்க விரும்புகிறீர்கள்?"
                    : "Ask me anything..."
                  }
                  className="flex-1 input-elegant"
                  disabled={isLoading}
                />
                
                <Button
                  onClick={sendMessage}
                  disabled={isLoading || (!inputMessage.trim() && selectedFiles.length === 0)}
                  className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 flex-shrink-0 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ArivuChatbot;