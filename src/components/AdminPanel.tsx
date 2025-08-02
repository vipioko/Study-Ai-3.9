import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, BookOpen, Brain, Settings } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/config/firebase";
import CategoryManagement from "./admin/CategoryManagement";
import QuestionBankManagement from "./admin/QuestionBankManagement";
import QuizManagement from "./admin/QuizManagement";

const AdminPanel = () => {
  const [user, loading] = useAuthState(auth);
  const [activeTab, setActiveTab] = useState("categories");

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <Card className="glass-card p-8 max-w-md mx-auto text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Access Denied</h3>
          <p className="text-gray-600">Please login to access the admin panel.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="container mx-auto px-4 py-6 relative z-10">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <Card className="glass-card p-6 animate-fadeInUp">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold gradient-text">Admin Panel</h1>
                <p className="text-gray-600">Manage question banks, categories, and quizzes</p>
              </div>
            </div>
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white shadow-lg">
                <Users className="h-6 w-6 mx-auto mb-2" />
                <div className="text-sm font-medium">Admin User</div>
                <div className="text-xs opacity-90">{user.phoneNumber || user.email}</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-xl text-white shadow-lg">
                <BookOpen className="h-6 w-6 mx-auto mb-2" />
                <div className="text-sm font-medium">Question Banks</div>
                <div className="text-xs opacity-90">Manage Content</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl text-white shadow-lg">
                <Brain className="h-6 w-6 mx-auto mb-2" />
                <div className="text-sm font-medium">AI Quizzes</div>
                <div className="text-xs opacity-90">Generate & Edit</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl text-white shadow-lg">
                <Settings className="h-6 w-6 mx-auto mb-2" />
                <div className="text-sm font-medium">Categories</div>
                <div className="text-xs opacity-90">Organize Content</div>
              </div>
            </div>
          </Card>

          {/* Admin Tabs */}
          <Card className="glass-card p-6 animate-fadeInUp" style={{animationDelay: '0.2s'}}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="categories" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Categories
                </TabsTrigger>
                <TabsTrigger value="question-banks" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Question Banks
                </TabsTrigger>
                <TabsTrigger value="quizzes" className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Quizzes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="categories" className="space-y-6">
                <CategoryManagement />
              </TabsContent>

              <TabsContent value="question-banks" className="space-y-6">
                <QuestionBankManagement />
              </TabsContent>

              <TabsContent value="quizzes" className="space-y-6">
                <QuizManagement />
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;