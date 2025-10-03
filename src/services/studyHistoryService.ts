import { collection, addDoc, query, where, orderBy, getDocs, deleteDoc, doc, Timestamp } from "firebase/firestore";
import { updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "@/config/firebase";
import { AnalysisResult, QuestionResult } from "@/components/StudyAssistant";

export interface StudyHistoryRecord {
  id?: string;
  userId: string;
  timestamp: Timestamp;
  type: "analysis" | "quiz" | "study-session";
  fileName?: string;
  fileHash?: string; // Added for better file recognition
  fileSize?: number; // Added for better file recognition
  difficulty: string;
  language: string;
  score?: number;
  totalQuestions?: number;
  percentage?: number;
  data: any;
  fileUrls?: string[];
  pageAnalysesMap?: Record<string, any>; // Store page analyses for PDF files
  totalAnalyzedPages?: number; // Track total pages analyzed
  notes?: string; // Optional notes from user
  analysisData?: {
    keyPoints: string[];
    studyPoints: any[];
    summary: string;
    mainTopic: string;
    tnpscCategories: string[];
  };
  quizData?: {
    questions: any[];
    answers: any[];
    score: number;
    totalQuestions: number;
    percentage: number;
    difficulty: string;
  };
}

// Helper function to generate file hash for better file recognition
const generateFileHash = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hash));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const saveStudyHistory = async (
  userId: string,
  type: "analysis" | "quiz" | "study-session",
  data: AnalysisResult[] | QuestionResult | any,
  options: {
    fileName?: string;
    difficulty: string;
    language: string;
    score?: number;
    totalQuestions?: number;
    percentage?: number;
    files?: File[];
    quizAnswers?: any[];
    pageAnalysesMap?: Record<string, any>;
    quizData?: any;
    fileHash?: string;
    fileSize?: number;
    notes?: string;
  }
): Promise<string> => {
  try {
    let fileUrls: string[] = [];
    let fileHash: string | undefined;
    let fileSize: number | undefined;
    
    // Upload files to Firebase Storage if provided and generate hash
    if (options.files && options.files.length > 0) {
      for (const file of options.files) {
        // Generate file hash for recognition
        if (!fileHash) {
          fileHash = await generateFileHash(file);
          fileSize = file.size;
        }
        
        const timestamp = Date.now();
        const fileName = `${userId}/${timestamp}_${file.name}`;
        const storageRef = ref(storage, `study-files/${fileName}`);
        
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        fileUrls.push(downloadURL);
      }
    }

    let analysisData = null;
    let quizData = null;

    if (type === "analysis" && Array.isArray(data)) {
      // Store analysis data in a structured format
      const analysis = data[0]; // Take first analysis result
      analysisData = {
        keyPoints: analysis.keyPoints || [],
        studyPoints: analysis.studyPoints || [],
        summary: analysis.summary || '',
        mainTopic: analysis.mainTopic || options.fileName || 'Study Material',
        tnpscCategories: analysis.tnpscCategories || []
      };
    } else if (type === "quiz") {
      // Store quiz data with answers
      quizData = {
        questions: data.questions || [],
        answers: options.quizAnswers || [],
        score: options.score || 0,
        totalQuestions: options.totalQuestions || 0,
        percentage: options.percentage || 0,
        difficulty: options.difficulty
      };
    }

    const record: Omit<StudyHistoryRecord, 'id'> = {
      userId,
      timestamp: Timestamp.now(),
      type,
      fileName: options.fileName,
      difficulty: options.difficulty,
      language: options.language,
      data,
      fileUrls,
      analysisData,
      quizData
    };

    // Only add notes if it's defined
    if (options.notes !== undefined) {
      record.notes = options.notes;
    }

    // Only add fileHash and fileSize if they are defined
    const calculatedFileHash = fileHash || options.fileHash;
    const calculatedFileSize = fileSize || options.fileSize;
    
    if (calculatedFileHash !== undefined) {
      record.fileHash = calculatedFileHash;
    }
    
    if (calculatedFileSize !== undefined) {
      record.fileSize = calculatedFileSize;
    }

    // Only add totalAnalyzedPages if pageAnalysesMap exists
    if (options.pageAnalysesMap) {
      record.totalAnalyzedPages = Object.keys(options.pageAnalysesMap).length;
    }

    // Only include pageAnalysesMap if it's defined
    if (options.pageAnalysesMap !== undefined) {
      record.pageAnalysesMap = options.pageAnalysesMap;
    }

    // Only include score, totalQuestions, and percentage if they are defined
    if (options.score !== undefined) {
      record.score = options.score;
    }
    if (options.totalQuestions !== undefined) {
      record.totalQuestions = options.totalQuestions;
    }
    if (options.percentage !== undefined) {
      record.percentage = options.percentage;
    }

    const docRef = await addDoc(collection(db, "studyHistory"), record);
    console.log("Study history saved successfully:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error saving study history:", error);
    throw error;
  }
};

export const updateStudyHistory = async (
  recordId: string,
  analysisData: {
    keyPoints: string[];
    studyPoints: any[];
    summary: string;
    tnpscRelevance: string;
    tnpscCategories: string[];
    mainTopic: string;
  },
  pageAnalysesMap?: Record<string, any>
): Promise<void> => {
  try {
    const docRef = doc(db, "studyHistory", recordId);
    const updateData: any = {
      analysisData,
      data: [analysisData],
      timestamp: Timestamp.now() // Update timestamp to reflect latest changes
    };
    
    if (pageAnalysesMap) {
      updateData.pageAnalysesMap = pageAnalysesMap;
      updateData.totalAnalyzedPages = Object.keys(pageAnalysesMap).length;
    }
    
    await updateDoc(docRef, updateData);
    console.log("Study history updated successfully:", recordId);
  } catch (error) {
    console.error("Error updating study history:", error);
    throw error;
  }
};

export const getStudyHistory = async (userId: string): Promise<StudyHistoryRecord[]> => {
  try {
    const q = query(
      collection(db, "studyHistory"),
      where("userId", "==", userId),
      orderBy("timestamp", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    const history: StudyHistoryRecord[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      history.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp // Keep as Firestore Timestamp for now
      } as StudyHistoryRecord);
    });
    
    return history;
  } catch (error) {
    console.error("Error fetching study history:", error);
    throw error;
  }
};

export const getStudyHistoryForFile = async (userId: string, fileName: string, fileHash?: string, fileSize?: number): Promise<StudyHistoryRecord | null> => {
  try {
    let q;
    
    // If we have file hash and size, use them for more accurate matching
    if (fileHash && fileSize) {
      q = query(
        collection(db, "studyHistory"),
        where("userId", "==", userId),
        where("fileHash", "==", fileHash),
        where("fileSize", "==", fileSize),
        where("type", "==", "analysis"),
        orderBy("timestamp", "desc")
      );
    } else {
      // Fallback to filename matching
      q = query(
        collection(db, "studyHistory"),
        where("userId", "==", userId),
        where("fileName", "==", fileName),
        where("type", "==", "analysis"),
        orderBy("timestamp", "desc")
      );
    }
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const docSnapshot = querySnapshot.docs[0];
    const data = docSnapshot.data();
    
    return {
      id: docSnapshot.id,
      ...(data as Omit<StudyHistoryRecord, 'id'>)
    } as StudyHistoryRecord;
  } catch (error) {
    console.error("Error fetching study history for file:", error);
    return null;
  }
};

export const deleteStudyHistory = async (recordId: string, fileUrls?: string[]): Promise<void> => {
  try {
    // Delete the document from Firestore
    await deleteDoc(doc(db, "studyHistory", recordId));
    
    // Delete associated files from Storage
    if (fileUrls && fileUrls.length > 0) {
      for (const url of fileUrls) {
        try {
          const fileRef = ref(storage, url);
          await deleteObject(fileRef);
        } catch (error) {
          console.warn("Error deleting file from storage:", error);
        }
      }
    }
  } catch (error) {
    console.error("Error deleting study history:", error);
    throw error;
  }
};