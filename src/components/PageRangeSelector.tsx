import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Brain, Target, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface PageRangeSelectorProps {
  totalPages: number;
  onConfirm: (startPage: number, endPage: number) => void;
  onBack: () => void;
  title: string;
  description: string;
  isProcessing?: boolean;
}

const PageRangeSelector = ({ 
  totalPages, 
  onConfirm, 
  onBack, 
  title, 
  description,
  isProcessing = false
}: PageRangeSelectorProps) => {
  const [startPage, setStartPage] = useState<number | string>(1);
  const [endPage, setEndPage] = useState<number | string>(Math.min(5, totalPages));

  const handleConfirm = () => {
    const startPageNum = typeof startPage === 'string' ? 1 : startPage;
    const endPageNum = typeof endPage === 'string' ? totalPages : endPage;
    
    if (startPageNum < 1 || endPageNum > totalPages) {
      toast.error(`Page range must be between 1 and ${totalPages}`);
      return;
    }
    
    if (startPageNum > endPageNum) {
      toast.error("Start page cannot be greater than end page");
      return;
    }

    if (endPageNum - startPageNum + 1 > 20) {
      toast.error("Please select a maximum of 20 pages at a time for optimal performance");
      return;
    }

    onConfirm(startPageNum, endPageNum);
  };

  const startPageNum = typeof startPage === 'string' ? 1 : startPage;
  const endPageNum = typeof endPage === 'string' ? totalPages : endPage;
  const selectedPages = endPageNum - startPageNum + 1;
  const isValidRange = startPageNum >= 1 && endPageNum <= totalPages && startPageNum <= endPageNum;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="container mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <Card className="glass-card p-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              onClick={onBack}
              variant="ghost"
              className="p-2 hover:bg-blue-50"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-md">
              <Target className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text">{title}</h1>
              <p className="text-gray-600">{description}</p>
            </div>
          </div>
        </Card>

        {/* Page Range Selection */}
        <Card className="glass-card p-8">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-800 mb-2">Select Page Range</h2>
              <p className="text-gray-600">Choose which pages to include in your session</p>
            </div>

            {/* PDF Info */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{totalPages}</div>
                  <div className="text-sm text-blue-700">Total Pages</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{selectedPages}</div>
                  <div className="text-sm text-purple-700">Selected Pages</div>
                </div>
              </div>
            </div>

            {/* Range Inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Start Page
                </label>
                <Input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={startPage}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setStartPage('');
                    } else {
                      setStartPage(Math.max(1, parseInt(value) || 1));
                    }
                  }}
                  className="input-elegant h-12 text-center text-lg font-semibold"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  End Page
                </label>
                <Input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={endPage}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setEndPage('');
                    } else {
                      setEndPage(Math.min(totalPages, parseInt(value) || 1));
                    }
                  }}
                  className="input-elegant h-12 text-center text-lg font-semibold"
                />
              </div>
            </div>

            {/* Quick Selection Buttons */}
            <div className="space-y-3">
              <div className="text-sm font-semibold text-gray-700">Quick Select:</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStartPage(1);
                    setEndPage(Math.min(5, totalPages));
                  }}
                  className="btn-secondary"
                >
                  First 5 Pages
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStartPage(1);
                    setEndPage(Math.min(10, totalPages));
                  }}
                  className="btn-secondary"
                >
                  First 10 Pages
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStartPage(Math.max(1, totalPages - 9));
                    setEndPage(totalPages);
                  }}
                  className="btn-secondary"
                >
                  Last 10 Pages
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStartPage(1);
                    setEndPage(totalPages);
                  }}
                  className="btn-secondary"
                >
                  All Pages
                </Button>
              </div>
            </div>

            {/* Validation Status */}
            <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-gray-50">
              {isValidRange ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-700 font-medium">
                    Valid range: {selectedPages} page{selectedPages !== 1 ? 's' : ''} selected
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <span className="text-orange-700 font-medium">
                    Please check your page range
                  </span>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                onClick={onBack}
                variant="outline"
                className="flex-1 btn-secondary"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!isValidRange || isProcessing}
                className="flex-1 btn-primary"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Starting Analysis...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Continue
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PageRangeSelector;