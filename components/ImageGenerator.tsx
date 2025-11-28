
import React, { useState, useEffect } from 'react';
import { generateImage } from '../services/geminiService';
import { getAllModels } from '../services/storageService';
import { ImageAspectRatio, CustomModel, GeneratedMedia } from '../types';
import { Loader2, Download, Wand2, Maximize2, User, Clock } from 'lucide-react';

export const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>(ImageAspectRatio.SQUARE);
  const [highQuality, setHighQuality] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  
  // Custom Model Integration
  const [customModels, setCustomModels] = useState<CustomModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');

  // History State
  const [history, setHistory] = useState<GeneratedMedia[]>([]);

  useEffect(() => {
    // 1. Load models
    getAllModels().then(models => {
      setCustomModels(models.filter(m => m.consistencyContext && m.consistencyContext.length > 5));
    });

    // 2. Check for auto-selection from Model Trainer
    const autoSelectId = localStorage.getItem('omni_active_model_id');
    const autoSelectType = localStorage.getItem('omni_active_model_type');
    
    if (autoSelectId && autoSelectType === 'image') {
      setSelectedModelId(autoSelectId);
      localStorage.removeItem('omni_active_model_id');
      localStorage.removeItem('omni_active_model_type');
    }
  }, []);

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    setResult(null);
    try {
      let finalPrompt = prompt;
      
      // Apply Consistency Context if selected
      if (selectedModelId) {
        const model = customModels.find(m => m.id === selectedModelId);
        if (model && model.consistencyContext) {
          finalPrompt = `Character Reference: ${model.consistencyContext}. \n\nScene/Action: ${prompt} \n\nInstruction: Ensure the character's visual details match the reference exactly.`;
        }
      }

      const img = await generateImage(finalPrompt, aspectRatio, highQuality);
      setResult(img);

      // Add to history
      const newItem: GeneratedMedia = {
        id: Date.now().toString(),
        type: 'image',
        url: img,
        prompt: prompt,
        timestamp: Date.now()
      };
      setHistory(prev => [newItem, ...prev]);

    } catch (error) {
      console.error(error);
      alert('Failed to generate image. Please try again.');
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
              <Wand2 className="text-purple-400" /> Generate Image
            </h2>
            <p className="text-gray-400 text-sm">Create stunning visuals from text.</p>
          </div>

          <div className="space-y-4">
            
            {/* Persona Selector */}
            {customModels.length > 0 && (
              <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-400" /> Apply Persona Style (Optional)
                </label>
                <div className="relative">
                  <select 
                    value={selectedModelId} 
                    onChange={(e) => setSelectedModelId(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 pl-3 text-white focus:ring-2 focus:ring-purple-500 outline-none appearance-none"
                  >
                    <option value="">None (Pure Prompt)</option>
                    {customModels.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                {selectedModelId && (
                   <p className="text-xs text-purple-300 mt-2">
                     * Visual traits of <b>{customModels.find(m => m.id === selectedModelId)?.name}</b> will be applied.
                   </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Prompt</label>
              <textarea
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none min-h-[120px]"
                placeholder="A futuristic city with flying cars, cyberpunk style, neon lights..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Aspect Ratio</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.values(ImageAspectRatio).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`p-2 text-sm rounded-md border ${
                      aspectRatio === ratio
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg border border-gray-700">
              <div className="flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-gray-200">High Quality (Upscale)</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={highQuality}
                  onChange={(e) => setHighQuality(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !prompt}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform transition hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Wand2 />}
              Generate
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="w-full md:w-2/3 bg-gray-900 rounded-2xl border border-gray-800 flex items-center justify-center relative overflow-hidden min-h-[400px]">
          {loading ? (
            <div className="text-center space-y-4">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-purple-300 animate-pulse">Dreaming up your image...</p>
            </div>
          ) : result ? (
            <div className="relative group w-full h-full flex items-center justify-center p-4">
              <img src={result} alt="Generated" className="max-w-full max-h-full rounded-lg shadow-2xl" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <a
                  href={result}
                  download={`generated-${Date.now()}.png`}
                  className="bg-white text-black py-2 px-4 rounded-full font-bold flex items-center gap-2 hover:bg-gray-200"
                >
                  <Download className="w-4 h-4" /> Download
                </a>
              </div>
            </div>
          ) : (
            <div className="text-gray-600 flex flex-col items-center">
              <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <Wand2 className="w-10 h-10 opacity-20" />
              </div>
              <p>Your masterpiece will appear here</p>
            </div>
          )}
        </div>
      </div>
      
      {/* History Grid */}
      {history.length > 0 && (
        <div className="pt-8 border-t border-gray-800">
           <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
             <Clock className="w-5 h-5 text-gray-400" /> Recent Generations
           </h3>
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
             {history.map((item) => (
               <div key={item.id} className="group relative aspect-square bg-gray-800 rounded-lg overflow-hidden cursor-pointer" onClick={() => setResult(item.url)}>
                  <img src={item.url} alt="History" className="w-full h-full object-cover transition duration-300 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                     <span className="text-xs text-white bg-black/50 px-2 py-1 rounded line-clamp-1 max-w-[90%]">{item.prompt}</span>
                  </div>
               </div>
             ))}
           </div>
        </div>
      )}
    </div>
  );
};
