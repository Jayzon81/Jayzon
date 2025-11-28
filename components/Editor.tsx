import React, { useState, useRef } from 'react';
import { editImage } from '../services/geminiService';
import { ImageAspectRatio } from '../types';
import { Loader2, Upload, Eraser, Sparkles, RefreshCcw, Download } from 'lucide-react';

export const Editor: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [mode, setMode] = useState<'edit' | 'remaster'>('edit');
  const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>(ImageAspectRatio.SQUARE);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
      setResult(null); // Reset result on new upload
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix for API
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleProcess = async () => {
    if (!prompt && mode === 'edit') return;
    if (!selectedFile) return;
    
    setLoading(true);
    setResult(null);
    try {
      const base64 = await convertToBase64(selectedFile);
      const isRemaster = mode === 'remaster';
      
      const instructions = isRemaster 
        ? (prompt || "High resolution, detailed, photorealistic version of this image, 4k, masterpiece, highly detailed texture") 
        : prompt;

      const img = await editImage(
        base64, 
        instructions, 
        selectedFile.type,
        isRemaster, // High Quality flag
        aspectRatio
      );
      setResult(img);

    } catch (error) {
      console.error(error);
      alert('Failed to process image. If you hit a quota limit, please try again in a few moments.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto p-6 space-y-8">
       <div className="flex flex-col md:flex-row gap-8 h-full">
        {/* Controls */}
        <div className="w-full md:w-1/3 flex flex-col gap-6">
           <div>
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <Eraser className="text-green-400" /> Edit & Enhance
            </h2>
            <p className="text-gray-400 text-sm">Modify images or upscale quality.</p>
          </div>

          <div className="flex gap-2 bg-gray-800 p-1 rounded-lg">
             <button 
               onClick={() => setMode('edit')}
               className={`flex-1 py-2 text-sm font-medium rounded-md transition ${mode === 'edit' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
             >
               Edit
             </button>
             <button 
               onClick={() => setMode('remaster')}
               className={`flex-1 py-2 text-sm font-medium rounded-md transition ${mode === 'remaster' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
             >
               Upscale/Remaster
             </button>
          </div>

          <div className="space-y-4">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-700 hover:border-green-500 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition bg-gray-800/50"
            >
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-300">
                {selectedFile ? selectedFile.name : "Click to upload image"}
              </span>
              <input 
                ref={fileInputRef} 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                className="hidden" 
              />
            </div>

            {/* Aspect Ratio for Output */}
             <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Output Aspect Ratio</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as ImageAspectRatio)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-green-500 outline-none"
              >
                {Object.values(ImageAspectRatio).map((ratio) => (
                  <option key={ratio} value={ratio}>{ratio}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Note: Ensure the output ratio matches your intent.
              </p>
            </div>

            {mode === 'edit' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Edit Instructions</label>
                <textarea
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-green-500 focus:outline-none min-h-[100px]"
                  placeholder="Make the sky blue, add a cat in the foreground..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>
            )}
             {mode === 'remaster' && (
               <div>
                 <p className="text-xs text-gray-400 mb-2">
                   Automatic enhancement instructions will be applied. You can add specific details below.
                 </p>
                 <input
                  type="text"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                  placeholder="Optional: e.g. 'Cyberpunk style', 'Oil painting'"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
               </div>
            )}

            <button
              onClick={handleProcess}
              disabled={loading || !selectedFile}
              className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform transition hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : mode === 'edit' ? <Sparkles /> : <RefreshCcw />}
              {mode === 'edit' ? 'Apply Edits' : 'Upscale & Enhance'}
            </button>
          </div>
        </div>

         {/* Preview Area */}
         <div className="w-full md:w-2/3 flex flex-col gap-4">
            <div className="flex-1 bg-gray-900 rounded-2xl border border-gray-800 p-4 flex items-center justify-center relative min-h-[300px]">
               {/* Show Original if no result, or side-by-side if result? Let's show result if exists, else preview */}
               {!result && !preview && (
                  <p className="text-gray-600">Upload an image to start</p>
               )}
               {preview && !result && !loading && (
                 <img src={preview} alt="Preview" className="max-h-full max-w-full rounded" />
               )}
               {loading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 z-10 rounded-2xl">
                     <Loader2 className="w-10 h-10 text-green-500 animate-spin mb-4" />
                     <p className="text-green-400">Processing...</p>
                     <p className="text-gray-500 text-xs mt-2">This might take a moment (2K upscale)</p>
                  </div>
               )}
               {result && (
                  <div className="relative group w-full h-full flex items-center justify-center">
                    <img src={result} alt="Edited" className="max-h-full max-w-full rounded shadow-lg" />
                     <div className="absolute bottom-4 right-4 flex gap-2">
                        <a
                          href={result}
                          download="edited-image.png"
                          className="bg-black/70 hover:bg-black text-white p-2 rounded-full backdrop-blur-md"
                        >
                          <Download className="w-5 h-5" />
                        </a>
                     </div>
                  </div>
               )}
            </div>
         </div>
       </div>
    </div>
  );
};