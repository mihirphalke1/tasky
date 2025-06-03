import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import {
  Upload,
  Image as ImageIcon,
  X,
  Check,
  Trash2,
  Eye,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface BackgroundUploadProps {
  currentBackground?: string;
  onBackgroundChange: (backgroundUrl: string | null) => void;
  className?: string;
}

export function BackgroundUpload({
  currentBackground,
  onBackgroundChange,
  className,
}: BackgroundUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentBackground || null
  );
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    setIsUploading(true);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Store in localStorage for persistence
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        localStorage.setItem("focus-background", result);
        onBackgroundChange(result);
        toast.success("Background image uploaded!", {
          description: "Your focus background has been updated",
        });
      }
      setIsUploading(false);
    };

    reader.onerror = () => {
      toast.error("Failed to upload image");
      setIsUploading(false);
    };

    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleRemoveBackground = () => {
    setPreviewUrl(null);
    localStorage.removeItem("focus-background");
    onBackgroundChange(null);
    toast.success("Background removed");
  };

  const handlePreview = () => {
    if (previewUrl) {
      window.open(previewUrl, "_blank");
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  // Load saved background on mount
  React.useEffect(() => {
    const saved = localStorage.getItem("focus-background");
    if (saved && !currentBackground) {
      setPreviewUrl(saved);
      onBackgroundChange(saved);
    }
  }, []);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Focus Background
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Upload a serene image to personalize your focus environment
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-6 transition-all duration-200 cursor-pointer
            ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
            }
            ${isUploading ? "pointer-events-none opacity-50" : ""}
          `}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="text-center">
            {isUploading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-2"
              >
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </motion.div>
            ) : (
              <>
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">
                  {dragActive
                    ? "Drop your image here"
                    : "Choose or drag an image"}
                </p>
                <p className="text-sm text-muted-foreground">
                  PNG, JPG, WebP up to 5MB
                </p>
              </>
            )}
          </div>
        </div>

        {/* Current Background Preview */}
        <AnimatePresence>
          {previewUrl && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <Label className="text-sm font-medium">Current Background</Label>

              <div className="relative group rounded-lg overflow-hidden border">
                <img
                  src={previewUrl}
                  alt="Focus background"
                  className="w-full h-32 object-cover"
                />

                {/* Overlay with actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreview();
                    }}
                    className="bg-white/90 hover:bg-white text-black"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveBackground();
                    }}
                    className="bg-red-500/90 hover:bg-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>This background will be used during Focus Mode</span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePreview}
                    className="text-xs h-6 px-2"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Preview
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveBackground}
                    className="text-xs h-6 px-2 text-red-500 hover:text-red-700"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tips */}
        <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-1">
            💡 Tips for great focus backgrounds:
          </p>
          <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Choose calming, nature-inspired images</li>
            <li>• Avoid busy or distracting patterns</li>
            <li>• Landscapes, minimalist designs work best</li>
            <li>• Higher resolution images look better</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
