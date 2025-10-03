// src/components/admin/QuestionBankManagement.tsx
// VERSION: Final - Correctly uses the createQuestionBankWithOcr service function

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Image, Edit, Trash2, Save, X, Brain } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/config/firebase";
import { Category, QuestionBank } from "@/types/admin";
import { 
  getCategories, 
  getQuestionBanks, 
  updateQuestionBank, 
  deleteQuestionBank,
  createQuestionBankWithOcr, // THIS IS THE IMPORTANT NEW FUNCTION
  createQuestionBankFromJson // NEW IMPORT
} from "@/services/adminService";
// Note: We no longer need to import analyzePdfContent or analyzeImage here directly
import { toast } from "sonner";

const QuestionBankManagement = () => {
  const [user] = useAuthState(auth);
  const [categories, setCategories] = useState<Category[]>([]);
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedJsonFile, setSelectedJsonFile] = useState<File | null>(null); // NEW STATE
  const [uploadType, setUploadType] = useState<'file' | 'json'>('file'); // NEW STATE
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    categoryId: "",
    year: new Date().getFullYear()
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [categoriesData, questionBanksData] = await Promise.all([
        getCategories(),
        getQuestionBanks()
      ]);
      setCategories(categoriesData);
      setQuestionBanks(questionBanksData);
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/json') {
      setSelectedJsonFile(file);
      setSelectedFile(null);
      setUploadType('json');
    } else if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      setSelectedFile(file);
      setSelectedJsonFile(null);
      setUploadType('file');
    } else {
      toast.error("Only image files, PDF files, and JSON files are supported");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    if (!formData.title) {
      setFormData(prev => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, "") }));
    }
  };

  // ========================================================================
  //  THIS IS THE MAIN CORRECTED FUNCTION
  // ========================================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be logged in to upload.");
      return;
    }
    if (!formData.title.trim() || !formData.categoryId || !formData.year) {
      toast.error("Please fill in all required fields (Title, Year, Category).");
      return;
    }

    // When creating a new bank, a file or JSON is required.
    if (!editingId && !selectedFile && !selectedJsonFile) {
      toast.error("Please select a file to upload for the new question bank.");
      return;
    }

    setIsUploading(true);

    try {
      if (editingId) {
        // --- UPDATE LOGIC (No file change, just metadata) ---
        const updates: Partial<QuestionBank> = {
          title: formData.title.trim(),
          description: formData.description.trim(),
          categoryId: formData.categoryId,
          year: formData.year
        };
        await updateQuestionBank(editingId, updates);
        toast.success("Question bank updated successfully!");
      } else {
        // --- ADD NEW LOGIC (Using the new coordinator functions) ---
        const questionBankData = {
            title: formData.title.trim(),
            description: formData.description.trim(),
            categoryId: formData.categoryId,
            year: formData.year,
        };
        
        if (selectedJsonFile) {
          // Use the new JSON upload function
          await createQuestionBankFromJson(selectedJsonFile, user.uid, questionBankData);
          toast.success("Question bank created from JSON successfully!");
        } else if (selectedFile) {
          // Use the existing file upload function for images/PDFs
          await createQuestionBankWithOcr(selectedFile, user.uid, questionBankData);
          toast.success("Question bank uploaded and processed successfully!");
        }
      }

      resetForm();
      fetchData(); // Refresh the list of question banks
    } catch (error) {
      console.error("Error saving question bank:", error);
      toast.error(`Failed to save question bank: ${(error as Error).message}`);
    } finally {
      setIsUploading(false);
    }
  };


  const handleEdit = (bank: QuestionBank) => {
    setEditingId(bank.id);
    setFormData({
      title: bank.title,
      description: bank.description || "",
      categoryId: bank.categoryId,
      year: bank.year
    });
    setSelectedFile(null); // Clear file selection when editing metadata
    setSelectedJsonFile(null); // Clear JSON file selection
    setUploadType('file'); // Reset upload type
    setIsAdding(true);
  };

  const handleDelete = async (bank: QuestionBank) => {
    if (!confirm(`Are you sure you want to delete "${bank.title}"?`)) return;

    try {
      await deleteQuestionBank(bank.id, bank.fileUrl);
      toast.success("Question bank deleted successfully!");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete question bank");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      categoryId: "",
      year: new Date().getFullYear()
    });
    setSelectedFile(null);
    setSelectedJsonFile(null); // NEW: Clear selected JSON file
    setUploadType('file'); // NEW: Reset upload type to default
    setIsAdding(false);
    setEditingId(null);
  };

  const getCategoryName = (categoryId: string) => categories.find(c => c.id === categoryId)?.name || "Unknown";

  if (isLoading) {
    return <div className="text-center py-8">Loading question banks...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold gradient-text">Question Bank Management</h3>
          {!isAdding && <Button onClick={() => setIsAdding(true)} className="btn-primary"><Upload className="h-4 w-4 mr-2" />Upload New</Button>}
        </div>
        {isAdding && (
          <form onSubmit={handleSubmit} className="space-y-6 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border">
            {/* NEW: Upload Type Selection */}
            {!editingId && (
              <div className="space-y-4">
                <Label>Upload Type</Label>
                <div className="flex gap-4 mb-4">
                  <Button
                    type="button"
                    variant={uploadType === 'file' ? 'default' : 'outline'}
                    onClick={() => setUploadType('file')}
                    className="flex-1"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Image/PDF File
                  </Button>
                  <Button
                    type="button"
                    variant={uploadType === 'json' ? 'default' : 'outline'}
                    onClick={() => setUploadType('json')}
                    className="flex-1"
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    JSON File
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label>
                    {uploadType === 'json' ? 'Upload JSON File *' : 'Upload File *'}
                  </Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <input 
                      type="file" 
                      accept={uploadType === 'json' ? '.json' : 'image/*,application/pdf'} 
                      onChange={handleFileSelect} 
                      className="hidden" 
                      id="file-upload" 
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p>
                        {(selectedFile || selectedJsonFile) 
                          ? (selectedFile?.name || selectedJsonFile?.name) 
                          : "Click to upload or drag and drop"
                        }
                      </p>
                      <p className="text-sm text-gray-500">
                        {uploadType === 'json' 
                          ? 'JSON files with OCR text' 
                          : 'PDF, PNG, JPG up to 10MB'
                        }
                      </p>
                    </label>
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="title">Title *</Label><Input id="title" value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} required /></div>
              <div className="space-y-2"><Label htmlFor="year">Year *</Label><Input id="year" type="number" value={formData.year} onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))} required /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="category">Category *</Label><Select value={formData.categoryId} onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger><SelectContent>{categories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} /></div>
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={isUploading} className="btn-primary">
                {isUploading ? "Processing..." : <><Save className="h-4 w-4 mr-2" />{editingId ? "Update" : "Upload & Process"}</>}
              </Button>
              <Button type="button" onClick={resetForm} variant="outline" disabled={isUploading}><X className="h-4 w-4 mr-2" />Cancel</Button>
            </div>
          </form>
        )}
      </Card>

      <Card className="glass-card p-6">
        <h3 className="text-lg font-semibold gradient-text mb-4">Uploaded Question Banks ({questionBanks.length})</h3>
        {questionBanks.length === 0 ? <div className="text-center py-8"><FileText className="h-12 w-12 text-gray-400 mx-auto" /><p>No question banks found.</p></div> : (
          <div className="space-y-4">
            {questionBanks.map((bank) => (
              <Card key={bank.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold">{bank.title}</h4>
                    <p className="text-sm text-gray-600">{bank.description}</p>
                    <div className="text-xs text-gray-500"><span>Category: {getCategoryName(bank.categoryId)}</span> • <span>Uploaded: {bank.uploadDate.toDate().toLocaleDateString()}</span></div>
                    {bank.fullOcrText ? <Badge className="mt-2 bg-green-100 text-green-800">OCR Processed</Badge> : <Badge className="mt-2 bg-yellow-100 text-yellow-800" variant="outline">OCR Pending</Badge>}
                    {bank.fileType === 'json' && <Badge className="mt-2 ml-2 bg-purple-100 text-purple-800">JSON Upload</Badge>}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleEdit(bank)} variant="outline" size="sm"><Edit className="h-3 w-3" /> Edit</Button>
                    <Button onClick={() => handleDelete(bank)} variant="outline" size="sm" className="text-red-600"><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default QuestionBankManagement;
