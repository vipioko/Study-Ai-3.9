import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Search, Filter, Play, Calendar, FileText, Brain, Target, Zap } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/config/firebase";
import { Category, QuestionBank, Quiz } from "@/types/admin";
import { getCategories, getQuestionBanks, getQuizzes } from "@/services/adminService";
import { useAppContext } from "@/contexts/AppContext";
import { toast } from "sonner";

const Library = () => {
  const [user] = useAuthState(auth);
  const { setQuestionResult, setDifficulty, setOutputLanguage } = useAppContext();
  const [categories, setCategories] = useState<Category[]>([]);
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [quizzes, searchTerm, selectedCategory, selectedDifficulty, selectedLanguage, selectedYear]);

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
      toast.error("Failed to fetch library data");
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...quizzes];

    // Search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(quiz =>
        quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quiz.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(quiz => quiz.categoryId === selectedCategory);
    }

    // Difficulty filter
    if (selectedDifficulty !== "all") {
      filtered = filtered.filter(quiz => quiz.difficulty === selectedDifficulty);
    }

    // Language filter
    if (selectedLanguage !== "all") {
      filtered = filtered.filter(quiz => quiz.language === selectedLanguage);
    }

    // Year filter
    if (selectedYear !== "all") {
      const questionBanksInYear = questionBanks.filter(qb => qb.year.toString() === selectedYear);
      const questionBankIds = questionBanksInYear.map(qb => qb.id);
      filtered = filtered.filter(quiz => questionBankIds.includes(quiz.questionBankId));
    }

    setFilteredQuizzes(filtered);
  };

  const handleStartQuiz = (quiz: Quiz) => {
    if (!user) {
      toast.error("Please login to start quiz");
      return;
    }

    // Set the quiz data in app context
    setQuestionResult({
      questions: quiz.questions,
      summary: quiz.description || "",
      keyPoints: [],
      difficulty: quiz.difficulty,
      totalQuestions: quiz.totalQuestions
    });
    setDifficulty(quiz.difficulty);
    setOutputLanguage(quiz.language);

    toast.success(`Starting ${quiz.title}...`);
    // The parent component will handle navigation to quiz mode
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || "Unknown Category";
  };

  const getQuestionBankInfo = (questionBankId: string) => {
    const bank = questionBanks.find(qb => qb.id === questionBankId);
    return bank ? { title: bank.title, year: bank.year } : { title: "Unknown", year: 0 };
  };

  const getUniqueYears = () => {
    const years = questionBanks.map(qb => qb.year);
    return [...new Set(years)].sort((a, b) => b - a);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedDifficulty("all");
    setSelectedLanguage("all");
    setSelectedYear("all");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <Card className="glass-card p-8 max-w-md mx-auto text-center">
          <BookOpen className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Login Required</h3>
          <p className="text-gray-600">Please login to access the quiz library.</p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-green-400/20 to-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="container mx-auto px-4 py-6 relative z-10">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <Card className="glass-card p-6 animate-fadeInUp">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-gradient-to-r from-green-600 to-blue-600 rounded-full shadow-lg">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold gradient-text">Quiz Library</h1>
                <p className="text-gray-600">Access curated TNPSC question banks and practice quizzes</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white shadow-lg">
                <div className="text-2xl font-bold">{categories.length}</div>
                <div className="text-sm opacity-90">Categories</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-xl text-white shadow-lg">
                <div className="text-2xl font-bold">{questionBanks.length}</div>
                <div className="text-sm opacity-90">Question Banks</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl text-white shadow-lg">
                <div className="text-2xl font-bold">{quizzes.length}</div>
                <div className="text-sm opacity-90">Available Quizzes</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl text-white shadow-lg">
                <div className="text-2xl font-bold">{getUniqueYears().length}</div>
                <div className="text-sm opacity-90">Years Covered</div>
              </div>
            </div>
          </Card>

          {/* Filters */}
          <Card className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <Filter className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold gradient-text">Filter & Search</h3>
              <Button onClick={clearFilters} variant="outline" size="sm" className="ml-auto">
                Clear Filters
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search quizzes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-elegant pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="input-elegant">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                  <SelectTrigger className="input-elegant">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="easy">🟢 Easy</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="hard">🔴 Hard</SelectItem>
                    <SelectItem value="very-hard">⚫ Very Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger className="input-elegant">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Languages</SelectItem>
                    <SelectItem value="english">🇬🇧 English</SelectItem>
                    <SelectItem value="tamil">🇮🇳 தமிழ்</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="input-elegant">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {getUniqueYears().map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <div className="text-sm text-gray-600 p-3 bg-blue-50 rounded-lg w-full text-center">
                  <span className="font-medium text-blue-700">{filteredQuizzes.length}</span> quizzes found
                </div>
              </div>
            </div>
          </Card>

          {/* Quiz Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuizzes.length === 0 ? (
              <div className="col-span-full">
                <Card className="glass-card p-8 text-center">
                  <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">No Quizzes Found</h3>
                  <p className="text-gray-600">
                    {quizzes.length === 0 
                      ? "No quizzes are available yet. Check back later!"
                      : "No quizzes match your current filters. Try adjusting your search criteria."
                    }
                  </p>
                  {quizzes.length > 0 && (
                    <Button onClick={clearFilters} className="mt-4">
                      Clear All Filters
                    </Button>
                  )}
                </Card>
              </div>
            ) : (
              filteredQuizzes.map((quiz, index) => {
                const bankInfo = getQuestionBankInfo(quiz.questionBankId);
                return (
                  <Card key={quiz.id} className="glass-card p-6 hover-lift animate-fadeInUp" style={{animationDelay: `${index * 0.1}s`}}>
                    <div className="space-y-4">
                      {/* Quiz Header */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Brain className="h-5 w-5 text-purple-600" />
                          <Badge className="bg-purple-100 text-purple-700">
                            Quiz
                          </Badge>
                          <Badge className={`${
                            quiz.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                            quiz.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            quiz.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {quiz.difficulty.toUpperCase()}
                          </Badge>
                        </div>
                        <h3 className="font-bold text-gray-800 text-lg leading-tight">{quiz.title}</h3>
                        {quiz.description && (
                          <p className="text-sm text-gray-600">{quiz.description}</p>
                        )}
                      </div>

                      {/* Quiz Info */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FileText className="h-4 w-4" />
                          <span>{getCategoryName(quiz.categoryId)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>{bankInfo.title} ({bankInfo.year})</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-700">
                              {quiz.totalQuestions} Questions
                            </span>
                          </div>
                          <Badge className="bg-blue-100 text-blue-700">
                            {quiz.language === 'tamil' ? 'தமிழ்' : 'English'}
                          </Badge>
                        </div>
                      </div>

                      {/* Action Button */}
                      <Button
                        onClick={() => handleStartQuiz(quiz)}
                        className="w-full btn-primary"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Start Quiz
                      </Button>

                      {/* Quiz Metadata */}
                      <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                        Created: {quiz.creationDate.toDate().toLocaleDateString()}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          {/* Categories Overview */}
          {categories.length > 0 && (
            <Card className="glass-card p-6 animate-fadeInUp" style={{animationDelay: '0.4s'}}>
              <h3 className="text-lg font-semibold gradient-text mb-4">Browse by Category</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category, index) => {
                  const categoryQuizzes = quizzes.filter(q => q.categoryId === category.id);
                  return (
                    <Card key={category.id} className="p-4 hover-lift cursor-pointer" onClick={() => setSelectedCategory(category.id)}>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-gray-800">{category.name}</h4>
                          <Badge className="bg-blue-100 text-blue-700">
                            {categoryQuizzes.length} quizzes
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{category.description}</p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Library;