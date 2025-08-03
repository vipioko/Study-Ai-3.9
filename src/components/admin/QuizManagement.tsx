// src/components/admin/QuizManagement.tsx
// VERSION: Corrected with self-healing OCR logic

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Brain, Edit, Trash2, Save, X, Zap, Download } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/config/firebase";
import { Category, QuestionBank, Quiz, Question } from "@/types/admin";
import { 
  getCategories, 
  getQuestionBanks, 
  getQuizzes, 
  addQuiz, 
  updateQuiz, 
  deleteQuiz,
  getQuestionBankById,
  updateQuestionBank // IMPORTANT: You need a function to update a question bank
} from "@/services/adminService";
import { generateQuestions } from "@/services/geminiService";
import { toast } from "sonner";

// ========================================================================
// IMPORTANT: You must add an `updateQuestionBank` function to your adminService.ts
// It should look like this:
//
// import { doc, updateDoc } from "firebase/firestore";
// import { db } from "@/config/firebase";
//
// export const updateQuestionBank = async (id: string, data: Partial<QuestionBank>): Promise<void> => {
//   const bankRef = doc(db, "questionBanks", id);
//   await updateDoc(bankRef, data);
// };
// ========================================================================


const QuizManagement = () => {
  const [user] = useAuthState(auth);
  const [categories, setCategories] = useState<Category[]>([]);
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [lastOcrText, setLastOcrText] = useState<string>("");
  
  const [quizForm, setQuizForm] = useState({
    title: "",
    description: "",
    questionBankId: "",
    difficulty: "medium"
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [categoriesData, questionBanksData, quizzesData] = await Promise.all([
        getCategories(),
        getQuestionBanks(),
        getQuizzes()
      ]);
      setCategories(categoriesData);
      setQuestionBanks(questionBanksData);
      setQuizzes(quizzesData);
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  };
  
  // ========================================================================
  // THIS IS THE MAIN CORRECTED FUNCTION
  // ========================================================================
  const handleGenerateQuiz = async (questionBankId: string) => {
    if (!user || !questionBankId) {
        toast.error("Please select a Question Bank first.");
        return;
    }

    setIsGenerating(true);
    let ocrTextToProcess = "";

    try {
      let questionBank = await getQuestionBankById(questionBankId);
      
      if (!questionBank) {
        toast.error("Selected Question Bank could not be found.");
        return;
      }

      // --- SELF-HEALING LOGIC ---
      // If OCR text is missing, run the OCR process now.
      if (!questionBank.fullOcrText) {
        toast.info("OCR text is missing. Running OCR process now, this may take a moment...");

        // 1. Get the public URL of the file from the question bank document
        const fileUrl = questionBank.fileUrl;
        if (!fileUrl) {
            throw new Error("File URL is missing from this Question Bank. Cannot process OCR.");
        }

        // 2. Call your Cloud Run service to perform OCR
        const ocrServiceUrl = "https://ocr-image-processor-747684597937.us-central1.run.app"; // Your live URL
        const ocrResponse = await fetch(ocrServiceUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileUrl: fileUrl })
        });

        if (!ocrResponse.ok) {
            throw new Error(`The OCR service failed with status: ${ocrResponse.status}`);
        }

        const ocrResult = await ocrResponse.json();
        const extractedText = ocrResult.fullText;

        // 3. Save the extracted text back to the Firestore document for future use
        await updateQuestionBank(questionBankId, { fullOcrText: extractedText });
        
        ocrTextToProcess = extractedText;
        toast.success("OCR process complete and text saved!");
      } else {
        // If OCR text already exists, just use it.
        ocrTextToProcess = questionBank.fullOcrText;
      }
      
      // Store the OCR text for debugging download
      setLastOcrText(ocrTextToProcess);
      
      // --- PROCEED WITH QUIZ GENERATION ---
      const result = await generateQuestions([], "medium", "english", ocrTextToProcess);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setGeneratedQuestions(result.questions || []);
      toast.success(`Successfully generated ${result.questions?.length || 0} questions!`);
      
      setQuizForm(prev => ({
        ...prev,
        questionBankId,
        title: `${questionBank.title} - Quiz`
      }));
      
    } catch (error) {
      console.error("Error generating quiz:", error);
      toast.error(`Failed to generate quiz: ${(error as Error).message}`);
       setLastOcrText(""); // Clear OCR text on error
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveQuiz = async () => {
    if (!user || !quizForm.title.trim() || !quizForm.questionBankId || generatedQuestions.length === 0) {
      toast.error("Please fill in all required fields and generate questions");
      return;
    }

    try {
      const questionBank = questionBanks.find(qb => qb.id === quizForm.questionBankId);
      if (!questionBank) {
        toast.error("Question bank not found");
        return;
      }

      const quizData = {
        title: quizForm.title.trim(),
        description: quizForm.description.trim(),
        questionBankId: quizForm.questionBankId,
        categoryId: questionBank.categoryId,
        difficulty: quizForm.difficulty as "easy" | "medium" | "hard" | "very-hard",
        language: "english" as "english" | "tamil",
        questions: generatedQuestions,
        totalQuestions: generatedQuestions.length,
        createdBy: user.uid,
        isActive: true,
      };

      if (editingQuiz) {
        await updateQuiz(editingQuiz.id, {
          title: quizData.title,
          description: quizData.description,
          questions: generatedQuestions,
          totalQuestions: generatedQuestions.length
        });
        toast.success("Quiz updated successfully!");
      } else {
        await addQuiz(quizData);
        toast.success("Quiz saved successfully!");
      }

      resetQuizForm();
      fetchData(); // Refetch all data to update the lists
    } catch (error) {
      console.error("Error saving quiz:", error);
      toast.error("Failed to save quiz");
    }
  };

  const handleEditQuiz = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setQuizForm({
      title: quiz.title,
      description: quiz.description || "",
      questionBankId: quiz.questionBankId,
      difficulty: quiz.difficulty
    });
    setGeneratedQuestions(quiz.questions || []);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteQuiz = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await deleteQuiz(id);
      toast.success("Quiz deleted successfully!");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete quiz");
    }
  };

  const resetQuizForm = () => {
    setQuizForm({ title: "", description: "", questionBankId: "", difficulty: "medium" });
    setGeneratedQuestions([]);
     setLastOcrText(""); // Clear OCR text when resetting
    setIsEditing(false);
    setEditingQuiz(null);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    setGeneratedQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
  };

  const updateQuestionOption = (questionIndex: number, optionIndex: number, value: string) => {
    setGeneratedQuestions(prev => prev.map((q, i) => 
      i === questionIndex ? { ...q, options: q.options?.map((opt, oi) => oi === optionIndex ? value : opt) || [] } : q
    ));
  };

  const getCategoryName = (categoryId: string) => categories.find(c => c.id === categoryId)?.name || "Unknown";
  const getQuestionBankName = (questionBankId: string) => questionBanks.find(qb => qb.id === questionBankId)?.title || "Unknown";

   const handleDownloadOcrText = () => {
     if (!lastOcrText) {
       toast.error("No OCR text available to download");
       return;
     }
 
     try {
       const ocrData = {
         timestamp: new Date().toISOString(),
         questionBankId: quizForm.questionBankId,
         questionBankTitle: getQuestionBankName(quizForm.questionBankId),
         ocrTextLength: lastOcrText.length,
         fullOcrText: lastOcrText
       };
 
       const blob = new Blob([JSON.stringify(ocrData, null, 2)], { type: 'application/json' });
       const url = URL.createObjectURL(blob);
       const a = document.createElement('a');
       a.href = url;
       a.download = `ocr-debug-${getQuestionBankName(quizForm.questionBankId)}-${Date.now()}.json`;
       document.body.appendChild(a);
       a.click();
       document.body.removeChild(a);
       URL.revokeObjectURL(url);
 
       toast.success("OCR text downloaded successfully!");
     } catch (error) {
       console.error("Error downloading OCR text:", error);
       toast.error("Failed to download OCR text");
     }
   };
 
  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  // --- JSX RENDER ---
  // (Your existing JSX is fine, no changes needed here. This is a placeholder for brevity.)
  return (
    <div className="space-y-6">
      {/* Quiz Generation Card */}
      <Card className="glass-card p-6">
        <h3 className="text-lg font-semibold gradient-text mb-4">{isEditing ? 'Edit Quiz' : 'Generate New Quiz'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <Label>Question Bank</Label>
            <Select 
              value={quizForm.questionBankId} 
              onValueChange={(value) => setQuizForm(prev => ({ ...prev, questionBankId: value }))}
              disabled={isEditing}
            >
              <SelectTrigger className="input-elegant"><SelectValue placeholder="Select question bank" /></SelectTrigger>
              <SelectContent>
                {questionBanks.map((bank) => (
                  <SelectItem key={bank.id} value={bank.id}>{bank.title} ({bank.year})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={() => handleGenerateQuiz(quizForm.questionBankId)} disabled={!quizForm.questionBankId || isGenerating || isEditing} className="btn-primary w-full">
              {isGenerating ? "Generating..." : <><Zap className="h-4 w-4 mr-2" />Generate Quiz</>}
            </Button>
             {lastOcrText && (
               <Button onClick={handleDownloadOcrText} variant="outline" className="ml-2 whitespace-nowrap">
                 <Download className="h-4 w-4 mr-2" />
                 Download OCR
               </Button>
             )}
          </div>
        </div>
        
        {/* Generated Questions Editor */}
        {generatedQuestions.length > 0 && (
          <div className="space-y-6 mt-6 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border">
            {/* Header and Save/Cancel buttons */}
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-800">Generated Questions ({generatedQuestions.length})</h4>
              <div className="flex gap-3">
                <Button onClick={handleSaveQuiz} className="btn-primary"><Save className="h-4 w-4 mr-2" />Save Quiz</Button>
                <Button onClick={resetQuizForm} variant="outline"><X className="h-4 w-4 mr-2" />Cancel</Button>
              </div>
            </div>

            {/* Quiz Details Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="quiz-title">Quiz Title *</Label>
                <Input id="quiz-title" value={quizForm.title} onChange={(e) => setQuizForm(prev => ({ ...prev, title: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quiz-description">Description</Label>
                <Textarea id="quiz-description" value={quizForm.description} onChange={(e) => setQuizForm(prev => ({ ...prev, description: e.target.value }))} />
              </div>
            </div>

            {/* Questions Editor List */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto p-2">
              {generatedQuestions.filter(q => q != null).map((question, index) => (
                <Card key={index} className="p-4 bg-white">
                  {/* ... Your detailed question editor JSX ... */}
                  {/* (This part is long, but your existing code for it is fine) */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-blue-100 text-blue-700">Q{index + 1}</Badge>
                      <Badge>{question.difficulty.toUpperCase()}</Badge>
                    </div>
                    <div className="space-y-2"><Label>Question</Label><Textarea value={question.question || ''} onChange={(e) => updateQuestion(index, 'question', e.target.value)} /></div>
                    {question.tamilQuestion && <div className="space-y-2"><Label>Tamil Question</Label><Textarea value={question.tamilQuestion || ''} onChange={(e) => updateQuestion(index, 'tamilQuestion', e.target.value)} /></div>}
                    {question.options && <div className="space-y-2"><Label>Options</Label><div className="space-y-2">{question.options.map((option, optIndex) => (<div key={optIndex} className="flex items-center gap-2"><Badge>{String.fromCharCode(65 + optIndex)}</Badge><Input value={option || ''} onChange={(e) => updateQuestionOption(index, optIndex, e.target.value)} /></div>))}</div></div>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Correct Answer</Label><Input value={question.answer || ''} onChange={(e) => updateQuestion(index, 'answer', e.target.value)} /></div>
                      <div className="space-y-2"><Label>TNPSC Group</Label><Input value={question.tnpscGroup || ''} onChange={(e) => updateQuestion(index, 'tnpscGroup', e.target.value)} /></div>
                    </div>
                    <div className="space-y-2"><Label>Explanation</Label><Textarea value={question.explanation || ''} onChange={(e) => updateQuestion(index, 'explanation', e.target.value)} /></div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Existing Quizzes List */}
      <Card className="glass-card p-6">
        <h3 className="text-lg font-semibold gradient-text mb-4">Existing Quizzes ({quizzes?.length || 0})</h3>
        {(quizzes?.length || 0) === 0 ? <div className="text-center py-8"><Brain className="h-12 w-12 text-gray-400 mx-auto" /><p>No quizzes found.</p></div> : (
          <div className="space-y-4">
            {quizzes?.filter(q => q != null).map((quiz, index) => (
              <Card key={quiz.id} className="p-4">
                {/* ... Your detailed quiz display JSX ... */}
                {/* (This part is long, but your existing code for it is fine) */}
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold">{quiz.title}</h4>
                    <p className="text-sm text-gray-600">{quiz.description || 'No description.'}</p>
                    <div className="text-xs text-gray-500"><span>Questions: {quiz.totalQuestions || 0}</span> • <span>Source: {getQuestionBankName(quiz.questionBankId)}</span></div>
                  </div>
                  <div className="flex gap-2"><Button onClick={() => handleEditQuiz(quiz)} variant="outline" size="sm"><Edit className="h-3 w-3" /> Edit</Button><Button onClick={() => handleDeleteQuiz(quiz.id, quiz.title)} variant="outline" size="sm" className="text-red-600"><Trash2 className="h-3 w-3" /></Button></div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default QuizManagement;