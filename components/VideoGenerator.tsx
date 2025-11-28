
import React, { useState, useEffect, useRef } from 'react';
import { generateVideo } from '../services/geminiService';
import { getAllModels } from '../services/storageService';
import { VideoResolution, CustomModel, GeneratedMedia } from '../types';
import { Loader2, Download, Video, Film, User, Info, Clock, Upload, X } from 'lucide-react';

export const VideoGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState<VideoResolution>(VideoResolution.HD);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Image to Video State
  const [startImage, setStartImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom Model Integration
  const [customModels, setCustomModels] = useState<CustomModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');

  // History State
  const [history, setHistory] = useState<GeneratedMedia[]>([]);

  useEffect(() => {
    // 1. Load models
    getAllModels().then(models => {
      setCustomModels(models.filter(m => (m.consistencyContext && m.consistencyContext.length > 5) || (m.referenceImages && m.referenceImages.length > 0)));
    });

    // 2. Check for auto-selection from Model Trainer
    const autoSelectId = localStorage.getItem('omni_active_model_id');
    const autoSelectType = localStorage.getItem('omni_active_model_type');
    
    if (autoSelectId && autoSelectType === 'video') {
      setSelectedModelId(autoSelectId);
      // Clear after consuming
      localStorage.removeItem('omni_active_model_id');
      localStorage.removeItem('omni_active_model_type');
    }
  }, []);

  const handleGenerate = async () => {
    if (!prompt && !startImage) return;
    setLoading(true);
    setVideoUrl(null);
    try {
      let finalPrompt = prompt;
      let refImages: string[] | undefined = undefined;

      // Apply Character Context (Only if no start image is used, or mixed usage)
      if (selectedModelId && !startImage) {
        const model = customModels.find(m => m.id === selectedModelId);
        if (model) {
           if (model.consistencyContext) {
              finalPrompt = `Cinematic shot. Character Visuals: ${model.consistencyContext}. Action: ${prompt}`;
           }
           if (model.referenceImages && model.referenceImages.length > 0) {
              refImages = model.referenceImages;
           }
        }
      }

      const url = await generateVideo(finalPrompt, resolution, aspectRatio, refImages, startImage || undefined);
      setVideoUrl(url);

      // Add to history
      const newItem: GeneratedMedia = {
        id: Date.now().toString(),
        type: 'video',
        url: url,
        prompt: prompt || "Image Animation",
        timestamp: Date.now()
      };
      setHistory(prev => [newItem, ...prev]);

    } catch (error) {
      console.error(error);
      alert('Failed to generate video. Note: Veo requires a paid project.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        // Strip prefix for logic if needed, but display needs it. 
        // Service expects base64 without prefix usually? 
        // Actually generateVideo logic handles conversion or expects base64 bytes depending on implementation.
        // Let's assume service handles raw base64 string.
        setStartImage(res.split(',')[1]); 
      };
      reader.readAsDataURL(file);
    }
  };

  const selectedModel = customModels.find(m => m.id === selectedModelId);
  const hasRefImages = selectedModel?.referenceImages && selectedModel.referenceImages.length > 0;

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex flex-col md:flex-row gap-8 h-full">
        {/* Controls */}
        <div className="w-full md:w-1/3 flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <Film className="text-pink-400" /> Generate Video (Veo)
            </h2>
            <p className="text-gray-400 text-sm">Text-to-Video or Image Animation.</p>
          </div>

          <div className="space-y-4">
             {/* Image to Video Upload */}
             <div className="space-y-2">
               <label className="block text-sm font-medium text-gray-300">Start Image (Animate)</label>
               {startImage ? (
                 <div className="relative h-32 w-full rounded-lg overflow-hidden border border-pink-500/50 group">
                    <img src={`data:image/png;base64,${startImage}`} className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setStartImage(null)}
                      className="absolute top-2 right-2 bg-black/60 p-1 rounded-full text-white hover:bg-red-500 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-xs p-1 text-center text-white">
                       Animation Mode Active
                    </div>
                 </div>
               ) : (
                 <div 
                   onClick={() => fileInputRef.current?.click()}
                   className="h-20 w-full border-2 border-dashed border-gray-700 hover:border-pink-500 rounded-lg flex flex-col items-center justify-center cursor-pointer text-gray-500 hover:text-pink-400 transition bg-gray-800/30"
                 >
                   <Upload className="w-5 h-5 mb-1" />
                   <span className="text-xs">Upload Photo to Animate</span>
                   <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                 </div>
               )}
             </div>

             {/* Persona Selector (Disabled if Animating Image) */}
             {!startImage && customModels.length > 0 && (
              <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-pink-400" /> Cast Character (Optional)
                </label>
                <div className="relative">
                  <select 
                    value={selectedModelId} 
                    onChange={(e) => setSelectedModelId(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 pl-3 text-white focus:ring-2 focus:ring-pink-500 outline-none appearance-none"
                  >
                    <option value="">No Character (Generic)</option>
                    {customModels.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                {selectedModelId && (
                   <div className="mt-2 space-y-1">
                     <p className="text-xs text-pink-300">
                       * <b>{selectedModel?.name}</b> will star in this video.
                     </p>
                     {hasRefImages && (
                        <p className="text-[10px] text-green-400 flex items-center gap-1">
                          <Info className="w-3 h-3" /> Using reference images for max consistency.
                          (Locks to 720p 16:9)
                        </p>
                     )}
                   </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Prompt {startImage ? "(Optional)" : ""}</label>
              <textarea
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-pink-500 focus:outline-none min-h-[100px]"
                placeholder={startImage ? "Describe how it should move..." : "A cinematic drone shot of a misty mountain range at sunrise..."}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Resolution</label>
              <div className="grid grid-cols-2 gap-2">
                {[VideoResolution.HD, VideoResolution.FHD].map((res) => (
                  <button
                    key={res}
                    onClick={() => !hasRefImages && setResolution(res)} 
                    disabled={hasRefImages && res !== VideoResolution.HD}
                    className={`p-2 text-sm rounded-md border ${
                      resolution === res
                        ? 'bg-pink-600 border-pink-500 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed'
                    }`}
                  >
                    {res}
                  </button>
                ))}
              </div>
            </div>

            <div>
               <label className="block text-sm font-medium text-gray-300 mb-2">Aspect Ratio</label>
               <select 
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                disabled={hasRefImages}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white disabled:opacity-50"
               >
                 <option value="16:9">Landscape (16:9)</option>
                 <option value="9:16">Portrait (9:16)</option>
               </select>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || (!prompt && !startImage)}
              className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform transition hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Video />}
              Generate Video
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="w-full md:w-2/3 bg-gray-900 rounded-2xl border border-gray-800 flex items-center justify-center relative overflow-hidden min-h-[400px]">
          {loading ? (
            <div className="text-center space-y-4 px-8">
              <Loader2 className="w-12 h-12 text-pink-500 animate-spin mx-auto" />
              <p className="text-pink-300 font-medium">Generating video with Veo...</p>
              <p className="text-gray-500 text-sm">This may take a minute. Please wait.</p>
            </div>
          ) : videoUrl ? (
            <div className="relative w-full h-full flex flex-col items-center justify-center">
              <video 
                src={videoUrl} 
                controls 
                autoPlay 
                loop 
                className="max-w-full max-h-[500px] rounded-lg shadow-2xl" 
              />
              <a
                href={videoUrl}
                download="generated-video.mp4"
                className="mt-4 bg-gray-800 hover:bg-gray-700 text-white py-2 px-6 rounded-full font-bold flex items-center gap-2 transition"
              >
                <Download className="w-4 h-4" /> Download MP4
              </a>
            </div>
          ) : (
            <div className="text-gray-600 flex flex-col items-center">
               <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <Film className="w-10 h-10 opacity-20" />
              </div>
              <p>Enter a prompt or upload an image to start</p>
            </div>
          )}
        </div>
      </div>

       {/* History Grid */}
       {history.length > 0 && (
        <div className="pt-8 border-t border-gray-800">
           <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
             <Clock className="w-5 h-5 text-gray-400" /> Recent Videos
           </h3>
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
             {history.map((item) => (
               <div key={item.id} className="group relative aspect-video bg-gray-800 rounded-lg overflow-hidden cursor-pointer" onClick={() => setVideoUrl(item.url)}>
                  <video src={item.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <div className="bg-black/50 p-2 rounded-full backdrop-blur-sm">
                       <Video className="w-4 h-4 text-white" />
                     </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                     <p className="text-xs text-white line-clamp-1">{item.prompt}</p>
                  </div>
               </div>
             ))}
           </div>
        </div>
      )}
    </div>
  );
};
