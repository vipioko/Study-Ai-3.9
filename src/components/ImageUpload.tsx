
import { useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Upload, X, FileText, Image } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  onFilesSelect: (files: File[]) => void;
  selectedFiles: File[];
}

const ImageUpload = ({ onFilesSelect, selectedFiles }: ImageUploadProps) => {
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') || file.type === 'application/pdf'
    );
    
    if (validFiles.length > 0) {
      const newFiles = [...selectedFiles, ...validFiles];
      onFilesSelect(newFiles);
    }
  }, [onFilesSelect, selectedFiles]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') || file.type === 'application/pdf'
    );
    
    if (validFiles.length > 0) {
      const newFiles = [...selectedFiles, ...validFiles];
      onFilesSelect(newFiles);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    onFilesSelect(newFiles);
  };

  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') {
      return <FileText className="h-8 w-8 text-red-500" />;
    }
    return <Image className="h-8 w-8 text-blue-500" />;
  };

  const getFilePreview = (file: File) => {
    if (file.type.startsWith('image/')) {
      return (
        <img
          src={URL.createObjectURL(file)}
          alt={file.name}
          className="w-full h-32 object-cover rounded-lg"
        />
      );
    }
    return (
      <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
        <FileText className="h-12 w-12 text-red-500" />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {selectedFiles.length === 0 ? (
        <Card
          className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors cursor-pointer bg-gray-50/50"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <label className="block p-12 text-center cursor-pointer">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <div className="text-lg font-medium text-gray-700 mb-2">
              Drop your files here or click to browse
            </div>
            <div className="text-sm text-gray-500">
              Supports Images (JPG, PNG, GIF) and PDFs up to 10MB each
            </div>
            <input
              type="file"
              accept="image/*,application/pdf"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="p-4 bg-white shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-800">
                Selected Files ({selectedFiles.length})
              </h3>
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Add More
                  </span>
                </Button>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedFiles.map((file, index) => (
                <div key={index} className="relative">
                  <Card className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getFileIcon(file)}
                        <span className="text-xs font-medium text-gray-600">
                          {file.type === 'application/pdf' ? 'PDF' : 'Image'}
                        </span>
                      </div>
                      <Button
                        onClick={() => removeFile(index)}
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {getFilePreview(file)}
                    
                    <div className="mt-2 text-xs text-gray-600">
                      <div className="truncate font-medium">{file.name}</div>
                      <div>({(file.size / 1024 / 1024).toFixed(2)} MB)</div>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
