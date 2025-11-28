import React, { useState, useRef } from 'react';
import { analyzeMedia } from '../services/geminiService';
import { Loader2, Upload, ScanEye, MessageSquare } from 'lucide-react';

export const Analyzer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
      
      setAnalysis(''); // clear previous analysis
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onload = async () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        
        const response = await analyzeMedia(base64, selectedFile.type, prompt);
        setAnalysis(response);
        setLoading(false);
      };
    } catch (e) {
      console.error(e);
      setAnalysis("Error analyzing media.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto p-6 space-y-8">
       <div className="flex flex-col md:flex-row gap-8 h-full">
         <div className="w-full md:w-1/3 flex flex-col gap-6">
           <div>
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <ScanEye className="text-cyan-400" /> Media Analysis
            </h2>
            <p className="text-gray-400 text-sm">Upload images or videos for AI insight.</p>
          </div>

          <div className="space-y-4">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-700 hover:border-cyan-500 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition bg-gray-800/50"
            >
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-300">
                {selectedFile ? selectedFile.name : "Upload Media (Image/Video)"}
              </span>
              <input 
                ref={fileInputRef} 
                type="file" 
                accept="image/*,video/*" 
                onChange={handleFileChange} 
                className="hidden" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Question (Optional)</label>
              <textarea
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none min-h-[100px]"
                placeholder="What is happening in this image? Describe the lighting..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <button
              onClick={handleAnalyze}
              disabled={loading || !selectedFile}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform transition hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : <MessageSquare />}
              Analyze
            </button>
          </div>
         </div>

         <div className="w-full md:w-2/3 flex flex-col gap-6">
            {/* Preview Panel */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 min-h-[200px] flex items-center justify-center">
              {preview ? (
                selectedFile?.type.startsWith('video') ? (
                   <video src={preview} controls className="max-h-[300px] rounded" />
                ) : (
                   <img src={preview} alt="Preview" className="max-h-[300px] rounded" />
                )
              ) : (
                <p className="text-gray-600">No media selected</p>
              )}
            </div>

            {/* Analysis Result */}
            <div className="flex-1 bg-gray-800 rounded-xl p-6 border border-gray-700 overflow-y-auto max-h-[400px]">
               <h3 className="text-lg font-semibold text-white mb-4">AI Analysis Results</h3>
               {loading ? (
                 <div className="flex items-center gap-2 text-cyan-400">
                   <Loader2 className="animate-spin" /> Analyzing...
                 </div>
               ) : analysis ? (
                 <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap">
                   {analysis}
                 </div>
               ) : (
                 <p className="text-gray-500 italic">Results will appear here...</p>
               )}
            </div>
         </div>
       </div>
    </div>
  );
};
