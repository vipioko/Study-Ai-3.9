import { Timestamp } from "firebase/firestore";
import { Question } from "@/components/StudyAssistant";

export interface Category {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  creationDate: Timestamp;
  isActive: boolean;
}

export interface QuestionBank {
  id: string;
  categoryId: string;
  year: number;
  title: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileHash: string;
  fileSize: number;
  fileType: 'pdf' | 'image';
  uploadedBy: string;
  uploadDate: Timestamp;
  isActive: boolean;
  totalPages?: number;
  analysisData?: {
    keyPoints: string[];
    summary: string;
    tnpscRelevance: string;
    studyPoints: any[];
    tnpscCategories: string[];
  };
}

export interface Quiz {
  id: string;
  questionBankId: string;
  categoryId: string;
  title: string;
  description?: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'very-hard';
  language: 'english' | 'tamil';
  questions: Question[];
  totalQuestions: number;
  createdBy: string;
  creationDate: Timestamp;
  lastUpdated: Timestamp;
  isActive: boolean;
  tags?: string[];
}

export interface AdminUser {
  uid: string;
  email?: string;
  phoneNumber?: string;
  isAdmin: boolean;
  permissions: string[];
}