import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Image, Edit, Trash2, Save, X, Brain, Download } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/config/firebase";
import { Category, QuestionBank } from "@/types/admin";
import { 
  getCategories, 
  uploadQuestionBankFile, 
  addQuestionBank, 
  getQuestionBanks, 
  updateQuestionBank, 
  deleteQuestionBank 
} from "@/services/adminService";
import { analyzePdfContent, analyzeImage } from "@/services/geminiService";
import { extractAllPdfText } from "@/utils/pdfReader";
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

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error("Only image files and PDFs are supported");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setSelectedFile(file);
    if (!formData.title) {
      setFormData(prev => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, "") }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.title.trim() || !formData.categoryId) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!editingId && !selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(10);

      let fileData = null;
      let analysisData = null;

      if (selectedFile) {
        // Upload file
        setUploadProgress(30);
        fileData = await uploadQuestionBankFile(selectedFile, user.uid);
        
        // Analyze content with AI
        setUploadProgress(60);
        if (selectedFile.type === 'application/pdf') {
          const textContent = await extractAllPdfText(selectedFile);
          analysisData = await analyzePdfContent(textContent, 'english');
        } else {
          analysisData = await analyzeImage(selectedFile, 'english');
        }
        setUploadProgress(90);
      }

      if (editingId) {
        // Update existing question bank
        const updates: Partial<QuestionBank> = {
          title: formData.title.trim(),
          description: formData.description.trim(),
          categoryId: formData.categoryId,
          year: formData.year
        };

        if (fileData && analysisData) {
          updates.fileUrl = fileData.fileUrl;
          updates.fileName = selectedFile!.name;
          updates.fileHash = fileData.fileHash;
          updates.fileSize = fileData.fileSize;
          updates.fileType = selectedFile!.type === 'application/pdf' ? 'pdf' : 'image';
          updates.analysisData = analysisData;
        }

        await updateQuestionBank(editingId, updates);
        toast.success("Question bank updated successfully!");
      } else {
        // Add new question bank
        await addQuestionBank({
          title: formData.title.trim(),
          description: formData.description.trim(),
          categoryId: formData.categoryId,
          year: formData.year,
          fileUrl: fileData!.fileUrl,
          fileName: selectedFile!.name,
          fileHash: fileData!.fileHash,
          fileSize: fileData!.fileSize,
          fileType: selectedFile!.type === 'application/pdf' ? 'pdf' : 'image',
          uploadedBy: user.uid,
          isActive: true,
          analysisData
        });
        toast.success("Question bank added successfully!");
      }

      setUploadProgress(100);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving question bank:", error);
      toast.error("Failed to save question bank");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
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
    setIsAdding(false);
    setEditingId(null);
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || "Unknown Category";
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading question banks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Form */}
      <Card className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold gradient-text">Question Bank Management</h3>
          {!isAdding && (
            <Button
              onClick={() => setIsAdding(true)}
              className="btn-primary"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Question Bank
            </Button>
          )}
        </div>

        {isAdding && (
          <form onSubmit={handleSubmit} className="space-y-6 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
            {/* File Upload */}
            {!editingId && (
              <div className="space-y-2">
                <Label>Upload File *</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">Click to upload or drag and drop</p>
                    <p className="text-sm text-gray-500">PDF, PNG, JPG up to 10MB</p>
                  </label>
                </div>
                {selectedFile && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    {selectedFile.type === 'application/pdf' ? (
                      <FileText className="h-5 w-5 text-red-600" />
                    ) : (
                      <Image className="h-5 w-5 text-blue-600" />
                    )}
                    <span className="text-sm font-medium">{selectedFile.name}</span>
                    <Badge variant="outline">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</Badge>
                  </div>
                )}
              </div>
            )}

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., TNPSC Group 1 - 2023"
                  className="input-elegant"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="year">Year *</Label>
                <Input
                  id="year"
                  type="number"
                  min="2000"
                  max="2030"
                  value={formData.year}
                  onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                  className="input-elegant"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.categoryId} onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}>
                  <SelectTrigger className="input-elegant">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this question bank"
                  className="input-elegant min-h-[80px]"
                />
              </div>
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading and analyzing...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}
            
            <div className="flex gap-3">
              <Button 
                type="submit" 
                disabled={isUploading}
                className="btn-primary"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {editingId ? "Update Question Bank" : "Upload Question Bank"}
                  </>
                )}
              </Button>
              <Button type="button" onClick={resetForm} variant="outline" disabled={isUploading}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Card>

      {/* Question Banks List */}
      <Card className="glass-card p-6">
        <h3 className="text-lg font-semibold gradient-text mb-4">
          Question Banks ({questionBanks.length})
        </h3>
        
        {questionBanks.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No question banks found. Upload your first question bank to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {questionBanks.map((bank, index) => (
              <Card key={bank.id} className="p-4 hover-lift animate-fadeInUp" style={{animationDelay: `${index * 0.1}s`}}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {bank.fileType === 'pdf' ? (
                        <FileText className="h-5 w-5 text-red-600" />
                      ) : (
                        <Image className="h-5 w-5 text-blue-600" />
                      )}
                      <h4 className="font-semibold text-gray-800">{bank.title}</h4>
                      <Badge className="bg-blue-100 text-blue-700">
                        {bank.year}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">{bank.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Category: {getCategoryName(bank.categoryId)}</span>
                        <span>•</span>
                        <span>Uploaded: {bank.uploadDate.toDate().toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Size: {(bank.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                      
                      {bank.analysisData && (
                        <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Brain className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-800">AI Analysis Complete</span>
                          </div>
                          <p className="text-xs text-green-700">
                            {bank.analysisData.keyPoints?.length || 0} key points identified
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button
                      onClick={() => handleEdit(bank)}
                      variant="outline"
                      size="sm"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDelete(bank)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
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