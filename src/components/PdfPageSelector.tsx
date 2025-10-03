
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

interface PdfPageSelectorProps {
  fileName: string;
  totalPages: number;
  onPageRangeSelect: (startPage: number, endPage: number) => void;
  isAnalyzing: boolean;
}

const PdfPageSelector = ({ 
  fileName, 
  totalPages, 
  onPageRangeSelect, 
  isAnalyzing 
}: PdfPageSelectorProps) => {
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(Math.min(10, totalPages));

  const handleRangeAnalysis = () => {
    onPageRangeSelect(startPage, endPage);
  };

  return (
    <Card className="glass-card p-8 animate-fadeInScale hover-lift">{" "}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-red-600" />
          <div>
            <h3 className="font-semibold text-gray-800">{fileName}</h3>
            <Badge className="bg-blue-100 text-blue-700">
              {totalPages} pages detected
            </Badge>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl border border-border">
            <h4 className="font-semibold text-foreground mb-4 text-lg">Custom Page Range</h4>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  From Page
                </label>
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={startPage}
                  onChange={(e) => setStartPage(Math.max(1, Math.min(parseInt(e.target.value) || 1, totalPages)))}
                  className="input-elegant"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  To Page
                </label>
                <input
                  type="number"
                  min={startPage}
                  max={totalPages}
                  value={endPage}
                  onChange={(e) => setEndPage(Math.max(startPage, Math.min(parseInt(e.target.value) || startPage, totalPages)))}
                  className="input-elegant"
                />
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground mb-6 p-3 bg-secondary/30 rounded-lg">
              <strong>Selected:</strong> {endPage - startPage + 1} pages (Page {startPage} to {endPage})
            </div>

            <Button
              onClick={handleRangeAnalysis}
              disabled={isAnalyzing}
              className="w-full btn-primary py-4 text-lg font-semibold"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Starting Analysis...
                </>
              ) : (
                `Start Analysis (${endPage - startPage + 1} pages)`
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PdfPageSelector;
