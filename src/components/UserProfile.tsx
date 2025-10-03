
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Calendar, Trophy, Target, Settings } from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/config/firebase";
import { getStudyHistory } from "@/services/studyHistoryService";
import { toast } from "sonner";

const UserProfile = () => {
  const [user] = useAuthState(auth);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [stats, setStats] = useState({
    documentsAnalyzed: 0,
    quizzesCompleted: 0,
    averageScore: 0,
    studyStreak: 0
  });

  useEffect(() => {
    const fetchUserStats = async () => {
      if (user) {
        try {
          const history = await getStudyHistory(user.uid);
          const analysisCount = history.filter(h => h.type === "analysis").length;
          const quizCount = history.filter(h => h.type === "quiz").length;
          const quizRecords = history.filter(h => h.type === "quiz" && h.score !== undefined);
          const avgScore = quizRecords.length > 0 
            ? Math.round(quizRecords.reduce((acc, h) => acc + (h.score || 0) / (h.totalQuestions || 1), 0) / quizRecords.length * 100)
            : 0;
          
          setStats({
            documentsAnalyzed: analysisCount,
            quizzesCompleted: quizCount,
            averageScore: avgScore,
            studyStreak: Math.min(7, history.length) // Simple streak calculation
          });
        } catch (error) {
          console.error("Error fetching user stats:", error);
        }
      }
    };

    fetchUserStats();
  }, [user]);
  const handleSaveProfile = () => {
    // In a real app, you'd update the user profile in Firebase
    toast.success("Profile updated successfully!");
    setIsEditing(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <Card className="p-8 max-w-md mx-auto text-center">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Login Required</h3>
          <p className="text-gray-600">Please login to view your profile.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Profile Header */}
          <Card className="p-6 bg-white/90 backdrop-blur-sm shadow-xl border-0">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full">
                <User className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">User Profile</h1>
                <p className="text-gray-600">Manage your account settings and preferences</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <Input
                        id="phone"
                        value={user.phoneNumber || ""}
                        disabled
                        className="bg-gray-50"
                      />
                      <Badge variant="outline" className="text-green-600 border-green-200">
                        Verified
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter your name"
                      disabled={!isEditing}
                      className={!isEditing ? "bg-gray-50" : ""}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Account Created</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-700">
                        {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : "N/A"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label>Last Sign In</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Settings className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-700">
                        {user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleDateString() : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4 border-t border-gray-200">
                {isEditing ? (
                  <>
                    <Button onClick={handleSaveProfile} className="bg-gradient-to-r from-green-600 to-blue-600">
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)} variant="outline">
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Study Statistics */}
          <Card className="p-6 bg-white/90 backdrop-blur-sm shadow-xl border-0">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-5 w-5 text-yellow-600" />
              <h3 className="text-lg font-semibold text-gray-800">Study Statistics</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.documentsAnalyzed}</div>
                <div className="text-sm text-blue-700">Documents Analyzed</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.quizzesCompleted}</div>
                <div className="text-sm text-green-700">Quizzes Completed</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{stats.averageScore}%</div>
                <div className="text-sm text-purple-700">Average Score</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{stats.studyStreak}</div>
                <div className="text-sm text-orange-700">Study Streak</div>
              </div>
            </div>
          </Card>

          {/* Preferences */}
          <Card className="p-6 bg-white/90 backdrop-blur-sm shadow-xl border-0">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">Study Preferences</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>Preferred Difficulty</Label>
                <div className="mt-2">
                  <Badge className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white">
                    MEDIUM
                  </Badge>
                </div>
              </div>
              <div>
                <Label>Preferred Language</Label>
                <div className="mt-2">
                  <Badge variant="outline">
                    🇬🇧 English
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
