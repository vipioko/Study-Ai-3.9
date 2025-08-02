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

// Helper function to generate file hash
const generateFileHash = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hash));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Category Management
export const addCategory = async (category: Omit<Category, 'id' | 'creationDate'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, "categories"), {
      ...category,
      creationDate: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding category:", error);
    throw error;
  }
};

export const getCategories = async (): Promise<Category[]> => {
  try {
    const q = query(
      collection(db, "categories"),
      where("isActive", "==", true),
      orderBy("name", "asc")
    );
    const querySnapshot = await getDocs(q);
    const categories: Category[] = [];
    
    querySnapshot.forEach((doc) => {
      categories.push({
        id: doc.id,
        ...doc.data()
      } as Category);
    });
    
    return categories;
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }
};

export const updateCategory = async (id: string, updates: Partial<Category>): Promise<void> => {
  try {
    const docRef = doc(db, "categories", id);
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error("Error updating category:", error);
    throw error;
  }
};

export const deleteCategory = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, "categories", id);
    await updateDoc(docRef, { isActive: false });
  } catch (error) {
    console.error("Error deleting category:", error);
    throw error;
  }
};

// Question Bank Management
export const uploadQuestionBankFile = async (
  file: File, 
  userId: string
): Promise<{ fileUrl: string; fileHash: string; fileSize: number }> => {
  try {
    const fileHash = await generateFileHash(file);
    const timestamp = Date.now();
    const fileName = `question-banks/${userId}/${timestamp}_${file.name}`;
    const storageRef = ref(storage, fileName);
    
    await uploadBytes(storageRef, file);
    const fileUrl = await getDownloadURL(storageRef);
    
    return {
      fileUrl,
      fileHash,
      fileSize: file.size
    };
  } catch (error) {
    console.error("Error uploading question bank file:", error);
    throw error;
  }
};

export const addQuestionBank = async (bank: Omit<QuestionBank, 'id' | 'uploadDate'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, "questionBanks"), {
      ...bank,
      uploadDate: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding question bank:", error);
    throw error;
  }
};

export const getQuestionBanks = async (categoryId?: string): Promise<QuestionBank[]> => {
  try {
    let q;
    if (categoryId) {
      q = query(
        collection(db, "questionBanks"),
        where("categoryId", "==", categoryId),
        where("isActive", "==", true),
        orderBy("year", "desc")
      );
    } else {
      q = query(
        collection(db, "questionBanks"),
        where("isActive", "==", true),
        orderBy("year", "desc")
      );
    }
    
    const querySnapshot = await getDocs(q);
    const questionBanks: QuestionBank[] = [];
    
    querySnapshot.forEach((doc) => {
      questionBanks.push({
        id: doc.id,
        ...doc.data()
      } as QuestionBank);
    });
    
    return questionBanks;
  } catch (error) {
    console.error("Error fetching question banks:", error);
    throw error;
  }
};

export const updateQuestionBank = async (id: string, updates: Partial<QuestionBank>): Promise<void> => {
  try {
    const docRef = doc(db, "questionBanks", id);
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error("Error updating question bank:", error);
    throw error;
  }
};

export const deleteQuestionBank = async (id: string, fileUrl: string): Promise<void> => {
  try {
    // Soft delete the record
    const docRef = doc(db, "questionBanks", id);
    await updateDoc(docRef, { isActive: false });
    
    // Optionally delete the file from storage
    try {
      const fileRef = ref(storage, fileUrl);
      await deleteObject(fileRef);
    } catch (error) {
      console.warn("Error deleting file from storage:", error);
    }
  } catch (error) {
    console.error("Error deleting question bank:", error);
    throw error;
  }
};

// Quiz Management
export const addQuiz = async (quiz: Omit<Quiz, 'id' | 'creationDate' | 'lastUpdated'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, "quizzes"), {
      ...quiz,
      creationDate: Timestamp.now(),
      lastUpdated: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding quiz:", error);
    throw error;
  }
};

export const getQuizzes = async (questionBankId?: string, categoryId?: string): Promise<Quiz[]> => {
  try {
    let q;
    if (questionBankId) {
      q = query(
        collection(db, "quizzes"),
        where("questionBankId", "==", questionBankId),
        where("isActive", "==", true),
        orderBy("creationDate", "desc")
      );
    } else if (categoryId) {
      q = query(
        collection(db, "quizzes"),
        where("categoryId", "==", categoryId),
        where("isActive", "==", true),
        orderBy("creationDate", "desc")
      );
    } else {
      q = query(
        collection(db, "quizzes"),
        where("isActive", "==", true),
        orderBy("creationDate", "desc")
      );
    }
    
    const querySnapshot = await getDocs(q);
    const quizzes: Quiz[] = [];
    
    querySnapshot.forEach((doc) => {
      quizzes.push({
        id: doc.id,
        ...doc.data()
      } as Quiz);
    });
    
    return quizzes;
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    throw error;
  }
};

export const getQuizById = async (id: string): Promise<Quiz | null> => {
  try {
    const docRef = doc(db, "quizzes", id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Quiz;
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching quiz:", error);
    throw error;
  }
};

export const updateQuiz = async (id: string, updates: Partial<Quiz>): Promise<void> => {
  try {
    const docRef = doc(db, "quizzes", id);
    await updateDoc(docRef, {
      ...updates,
      lastUpdated: Timestamp.now()
    });
  } catch (error) {
    console.error("Error updating quiz:", error);
    throw error;
  }
};

export const deleteQuiz = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, "quizzes", id);
    await updateDoc(docRef, { isActive: false });
  } catch (error) {
    console.error("Error deleting quiz:", error);
    throw error;
  }
};

// Get question bank by ID
export const getQuestionBankById = async (id: string): Promise<QuestionBank | null> => {
  try {
    const docRef = doc(db, "questionBanks", id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as QuestionBank;
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching question bank:", error);
    throw error;
  }
};