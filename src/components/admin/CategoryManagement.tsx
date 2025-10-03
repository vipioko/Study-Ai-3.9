import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Save, X, FolderPlus } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/config/firebase";
import { Category } from "@/types/admin";
import { addCategory, getCategories, updateCategory, deleteCategory } from "@/services/adminService";
import { toast } from "sonner";

const CategoryManagement = () => {
  const [user] = useAuthState(auth);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: ""
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      toast.error("Failed to fetch categories");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.name.trim()) return;

    try {
      if (editingId) {
        await updateCategory(editingId, {
          name: formData.name.trim(),
          description: formData.description.trim()
        });
        toast.success("Category updated successfully!");
      } else {
        await addCategory({
          name: formData.name.trim(),
          description: formData.description.trim(),
          createdBy: user.uid,
          isActive: true
        });
        toast.success("Category added successfully!");
      }
      
      resetForm();
      fetchCategories();
    } catch (error) {
      toast.error("Failed to save category");
    }
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      description: category.description
    });
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      await deleteCategory(id);
      toast.success("Category deleted successfully!");
      fetchCategories();
    } catch (error) {
      toast.error("Failed to delete category");
    }
  };

  const resetForm = () => {
    setFormData({ name: "", description: "" });
    setIsAdding(false);
    setEditingId(null);
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading categories...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Category Form */}
      <Card className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold gradient-text">Category Management</h3>
          {!isAdding && (
            <Button
              onClick={() => setIsAdding(true)}
              className="btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          )}
        </div>

        {isAdding && (
          <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Category Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Tamil Nadu History"
                  className="input-elegant"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this category"
                  className="input-elegant min-h-[80px]"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button type="submit" className="btn-primary">
                <Save className="h-4 w-4 mr-2" />
                {editingId ? "Update Category" : "Add Category"}
              </Button>
              <Button type="button" onClick={resetForm} variant="outline">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Card>

      {/* Categories List */}
      <Card className="glass-card p-6">
        <h3 className="text-lg font-semibold gradient-text mb-4">
          Existing Categories ({categories.length})
        </h3>
        
        {categories.length === 0 ? (
          <div className="text-center py-8">
            <FolderPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No categories found. Add your first category to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category, index) => (
              <Card key={category.id} className="p-4 hover-lift animate-fadeInUp" style={{animationDelay: `${index * 0.1}s`}}>
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{category.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                    </div>
                    <Badge className="bg-green-100 text-green-700 ml-2">
                      Active
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    Created: {category.creationDate.toDate().toLocaleDateString()}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEdit(category)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDelete(category.id)}
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

export default CategoryManagement;