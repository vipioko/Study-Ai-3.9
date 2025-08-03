// src/services/adminService.ts
// VERSION: Corrected with a new coordinator function

import { 
  collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, Timestamp, getDoc 
} from "firebase/firestore";
import { 
  ref, uploadBytes, getDownloadURL, deleteObject 
} from "firebase/storage";
import { db, storage } from "@/config/firebase";
import { Category, QuestionBank, Quiz } from "@/types/admin";

// Helper function to generate file hash (Unchanged)
const generateFileHash = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hash));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Your existing function to call the Cloud Run OCR service (Unchanged)
export const fetchOcrTextFromVision = async (fileUrl: string): Promise<string> => {
  try {
    const response = await fetch('https://ocr-image-processor-747684597937.us-central1.run.app', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileUrl }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Cloud Function error: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    return data.fullText || '';
  } catch (error) {
    console.error('Error fetching OCR text from Cloud Function:', error);
    throw error;
  }
};


// ========================================================================
//  NEW COORDINATOR FUNCTION - THE MAIN FIX
// ========================================================================
/**
 * Handles the complete process: uploads a file, triggers OCR, and saves the 
 * Question Bank with the OCR text to Firestore.
 * This is the function your file upload form should call.
 */
export const createQuestionBankWithOcr = async (
  file: File,
  userId: string,
  bankData: Omit<QuestionBank, 'id' | 'uploadDate' | 'fileUrl' | 'fileName' | 'fileHash' | 'fileSize' | 'fileType' | 'uploadedBy' | 'fullOcrText'>
): Promise<string> => {
  try {
    // Step 1: Upload the file to Firebase Storage
    console.log("Step 1: Uploading file...");
    const fileHash = await generateFileHash(file);
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const storageRef = ref(storage, `question-banks/${userId}/${fileName}`);
    
    await uploadBytes(storageRef, file);
    const fileUrl = await getDownloadURL(storageRef);
    console.log("File uploaded successfully:", fileUrl);

    // Step 2: Call the Cloud Run service to get the OCR text
    console.log("Step 2: Fetching OCR text...");
    const ocrText = await fetchOcrTextFromVision(fileUrl);
    console.log("OCR text received.");

    // Step 3: Add the complete Question Bank document to Firestore
    console.log("Step 3: Saving Question Bank to Firestore...");
    const fullBankData: Omit<QuestionBank, 'id'> = {
      ...bankData,
      fileUrl,
      fileName,
      fileHash,
      fileSize: file.size,
      fileType: file.type.startsWith('image') ? 'image' : 'pdf',
      uploadedBy: userId,
      uploadDate: Timestamp.now(),
      isActive: true,
      fullOcrText: ocrText || "", // CRITICAL: Save the OCR text here
    };

    const docRef = await addDoc(collection(db, "questionBanks"), fullBankData);
    console.log("Question Bank saved successfully with ID:", docRef.id);

    return docRef.id;
  } catch (error) {
    console.error("Error in createQuestionBankWithOcr process:", error);
    throw error; // Rethrow to be caught by the component
  }
};

// --- ALL YOUR OTHER FUNCTIONS REMAIN UNCHANGED ---

// Category Management
export const addCategory = async (category: Omit<Category, 'id' | 'creationDate'>): Promise<string> => {
    const docRef = await addDoc(collection(db, "categories"), { ...category, creationDate: Timestamp.now() });
    return docRef.id;
};
export const getCategories = async (): Promise<Category[]> => {
    const q = query(collection(db, "categories"), where("isActive", "==", true), orderBy("name", "asc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
};
export const updateCategory = async (id: string, updates: Partial<Category>): Promise<void> => {
    await updateDoc(doc(db, "categories", id), updates);
};
export const deleteCategory = async (id: string): Promise<void> => {
    await updateDoc(doc(db, "categories", id), { isActive: false });
};

// Question Bank Management
export const addQuestionBank = async (bank: Omit<QuestionBank, 'id' | 'uploadDate'>): Promise<string> => {
    const docRef = await addDoc(collection(db, "questionBanks"), { ...bank, uploadDate: Timestamp.now() });
    return docRef.id;
};
export const getQuestionBanks = async (categoryId?: string): Promise<QuestionBank[]> => {
    let q;
    if (categoryId) {
      q = query(collection(db, "questionBanks"), where("categoryId", "==", categoryId), where("isActive", "==", true), orderBy("year", "desc"));
    } else {
      q = query(collection(db, "questionBanks"), where("isActive", "==", true), orderBy("year", "desc"));
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestionBank));
};
export const updateQuestionBank = async (id: string, updates: Partial<QuestionBank>): Promise<void> => {
    await updateDoc(doc(db, "questionBanks", id), updates);
};
export const deleteQuestionBank = async (id: string, fileUrl: string): Promise<void> => {
    await updateDoc(doc(db, "questionBanks", id), { isActive: false });
    try {
      await deleteObject(ref(storage, fileUrl));
    } catch (error) {
      console.warn("Error deleting file from storage (it may have already been deleted):", error);
    }
};
export const getQuestionBankById = async (id: string): Promise<QuestionBank | null> => {
    const docSnap = await getDoc(doc(db, "questionBanks", id));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as QuestionBank : null;
};

// Quiz Management (all unchanged)
export const addQuiz = async (quiz: Omit<Quiz, 'id' | 'creationDate' | 'lastUpdated'>): Promise<string> => {
    const docRef = await addDoc(collection(db, "quizzes"), { ...quiz, creationDate: Timestamp.now(), lastUpdated: Timestamp.now() });
    return docRef.id;
};
export const getQuizzes = async (questionBankId?: string, categoryId?: string): Promise<Quiz[]> => {
    let q;
    if (questionBankId) { q = query(collection(db, "quizzes"), where("questionBankId", "==", questionBankId), where("isActive", "==", true), orderBy("creationDate", "desc")); }
    else if (categoryId) { q = query(collection(db, "quizzes"), where("categoryId", "==", categoryId), where("isActive", "==", true), orderBy("creationDate", "desc")); }
    else { q = query(collection(db, "quizzes"), where("isActive", "==", true), orderBy("creationDate", "desc")); }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quiz));
};
export const getQuizById = async (id: string): Promise<Quiz | null> => {
    const docSnap = await getDoc(doc(db, "quizzes", id));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Quiz : null;
};
export const updateQuiz = async (id: string, updates: Partial<Quiz>): Promise<void> => {
    await updateDoc(doc(db, "quizzes", id), { ...updates, lastUpdated: Timestamp.now() });
};
export const deleteQuiz = async (id: string): Promise<void> => {
    await updateDoc(doc(db, "quizzes", id), { isActive: false });
};