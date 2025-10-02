// src/services/adminService.ts
// VERSION: Final - Using GeminiService.ts for direct OCR processing

import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  getDoc 
} from "firebase/firestore";
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from "firebase/storage";
import { db, storage } from "@/config/firebase";
import { Category, QuestionBank, Quiz } from "@/types/admin";

// ** NEW IMPORTS FOR DIRECT GEMINI/OCR PROCESSING **
import { extractRawTextFromImage } from "./geminiService";
import { extractAllPdfText } from "@/utils/pdfReader"; 
// Note: We don't need parseQuestionPaperOcr here; the frontend component will manage Q&A logic.

// Helper function to generate file hash (Unchanged)
const generateFileHash = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hash));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// ** REMOVED: fetchOcrTextFromVision is no longer needed **


// ========================================================================
//  UPDATED COORDINATOR FUNCTION - NOW USES GEMINI SERVICE FOR OCR
// ========================================================================
/**
 * Handles the complete process: uploads a file, performs OCR/Text Extraction 
 * using GeminiService (or local utility), and saves the Question Bank to Firestore.
 */
export const createQuestionBankWithOcr = async (
  file: File,
  userId: string,
  bankData: Omit<QuestionBank, 'id' | 'uploadDate' | 'fileUrl' | 'fileName' | 'fileHash' | 'fileSize' | 'fileType' | 'uploadedBy' | 'fullOcrText' | 'isActive' | 'totalQuestions'>
): Promise<string> => {
  try {
    // Step 1: Upload the file to Firebase Storage (MUST HAPPEN FIRST to handle file size/errors)
    console.log("Step 1: Uploading file...");
    const fileHash = await generateFileHash(file);
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}_${file.name}`;
    const storageRef = ref(storage, `question-banks/${userId}/${uniqueFileName}`);
    
    await uploadBytes(storageRef, file);
    const fileUrl = await getDownloadURL(storageRef);
    console.log("File uploaded successfully:", fileUrl);

    // Step 2: Perform OCR/Text Extraction using local/Gemini service
    let ocrText = "";
    try {
      console.log("Step 2: Performing OCR/Text Extraction...");
      if (file.type === 'application/pdf') {
          // For PDFs, try local extraction first (faster/cheaper)
          ocrText = await extractAllPdfText(file);
          if (!ocrText || ocrText.trim().length < 50) {
              console.warn("Local PDF text extraction failed or was too short. Falling back to Gemini OCR.");
              // Fallback to Gemini for image-based OCR on PDF
              ocrText = await extractRawTextFromImage(file);
          }
      } else if (file.type.startsWith('image/')) {
          // For images, use the Gemini OCR function
          ocrText = await extractRawTextFromImage(file);
      } else {
          throw new Error("Unsupported file type for OCR processing.");
      }

      if (!ocrText || ocrText.trim().length < 50) {
          throw new Error("OCR failed to extract sufficient text from the file.");
      }
      console.log("OCR text received, length:", ocrText.length);

    } catch (error) {
        console.error("OCR/Extraction Failed:", error);
        throw new Error(`OCR/Extraction failed: ${(error as Error).message}`);
    }

    // Step 3: Prepare the complete data object for Firestore
    const fullBankData: Omit<QuestionBank, 'id' | 'totalQuestions'> = {
      ...bankData,
      fileUrl,
      fileName: uniqueFileName,
      fileHash,
      fileSize: file.size,
      fileType: file.type.startsWith('image') ? 'image' : 'pdf',
      uploadedBy: userId,
      uploadDate: Timestamp.now(),
      isActive: true,
      fullOcrText: ocrText || "", // CRITICAL: Save the OCR text here
      totalQuestions: 0, // Set to 0 initially, or run a quick count utility here
    };

    // Step 4: Add the complete Question Bank document to Firestore
    console.log("Step 4: Saving Question Bank to Firestore...");
    const docRef = await addDoc(collection(db, "questionBanks"), fullBankData);
    console.log("Question Bank saved successfully with ID:", docRef.id);

    return docRef.id;
  } catch (error) {
    console.error("Error in createQuestionBankWithOcr process:", error);
    throw error; // Rethrow to be caught by the UI component
  }
};

// NEW FUNCTION: Create Question Bank from JSON file (Unchanged)
export const createQuestionBankFromJson = async (
  jsonFile: File,
  userId: string,
  bankData: Omit<QuestionBank, 'id' | 'uploadDate' | 'fileUrl' | 'fileName' | 'fileHash' | 'fileSize' | 'fileType' | 'uploadedBy' | 'fullOcrText' | 'isActive' | 'totalQuestions'>
): Promise<string> => {
  try {
    // Step 1: Read the JSON file
    console.log("Step 1: Reading JSON file...");
    const jsonText = await jsonFile.text();
    const jsonData = JSON.parse(jsonText);
    
    // Extract OCR text from JSON (adjust this based on your JSON structure)
    const ocrText = jsonData.fullText || jsonData.ocrText || jsonData.text || "";
    
    if (!ocrText) {
      throw new Error("No OCR text found in JSON file. Expected 'fullText', 'ocrText', or 'text' field.");
    }

    console.log("OCR text extracted from JSON, length:", ocrText.length);

    // Step 2: Generate file hash for the JSON file
    const fileHash = await generateFileHash(jsonFile);

    // Step 3: Prepare the complete data object for Firestore
    const fullBankData: Omit<QuestionBank, 'id' | 'totalQuestions'> = {
      ...bankData,
      fileUrl: "", // No file URL for JSON uploads
      fileName: jsonFile.name,
      fileHash,
      fileSize: jsonFile.size,
      fileType: 'json', // Explicitly set fileType to 'json'
      uploadedBy: userId,
      uploadDate: Timestamp.now(),
      isActive: true,
      fullOcrText: ocrText,
      totalQuestions: 0, // Can be updated later after question parsing
    };

    // Step 4: Add the complete Question Bank document to Firestore
    console.log("Step 4: Saving Question Bank to Firestore...");
    const docRef = await addDoc(collection(db, "questionBanks"), fullBankData);
    console.log("Question Bank saved successfully with ID:", docRef.id);

    return docRef.id;
  } catch (error) {
    console.error("Error in createQuestionBankFromJson process:", error);
    throw error;
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
    // Only attempt to delete from storage if fileUrl is not empty (i.e., not a JSON upload)
    if (fileUrl) {
      await deleteObject(ref(storage, fileUrl));
    }
  } catch (error) {
    console.warn("Error deleting file from storage:", error);
  }
};
export const getQuestionBankById = async (id: string): Promise<QuestionBank | null> => {
  const docSnap = await getDoc(doc(db, "questionBanks", id));
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as QuestionBank : null;
};

// Quiz Management
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