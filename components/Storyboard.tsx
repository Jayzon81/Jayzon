import React, { useState } from 'react';
import { generateImage, generateStoryboardPlan } from '../services/geminiService';
import { ImageAspectRatio, StoryboardPanel } from '../types';
import { Loader2, Clapperboard, RefreshCw, RotateCcw } from 'lucide-react';

export const Storyboard: React.FC = () => {
  const [storyPrompt, setStoryPrompt] = useState('');
  const [panels, setPanels] = useState<StoryboardPanel[]>([]);
  const [isPlanning, setIsPlanning] = useState(false);

  const handleCreatePlan = async () => {
    if (!storyPrompt) return;
    setIsPlanning(true);
    setPanels([]); // Clear previous
    try {
      const descriptions = await generateStoryboardPlan(storyPrompt);
      const newPanels = descriptions.map((desc, index) => ({
        id: `panel-${index}`,
        description: desc,
        isLoading: false,
      }));
      setPanels(newPanels);
    } catch (e) {
      console.error(e);
      alert("Could not generate storyboard plan. Please try again.");
    } finally {
      setIsPlanning(false);
    }
  };

  const generatePanelImage = async (index: number) => {
    const panel = panels[index];
    if (panel.isLoading) return; 

    const newPanels = [...panels];
    newPanels[index] = { ...panel, isLoading: true };
    setPanels(newPanels);

    try {
      // Generate image for this panel
      // We append the main style context to ensure consistency
      const fullPrompt = `Storyboard panel, cinematic sketch style: ${panel.description}. Context: ${storyPrompt}`;
      const img = await generateImage(fullPrompt, ImageAspectRatio.WIDE, false); // Use 16:9 for cinematic look
      
      setPanels(prev => prev.map((p, i) => i === index ? { ...p, imageUrl: img, isLoading: false } : p));
    } catch (e) {
      console.error(e);
      setPanels(prev => prev.map((p, i) => i === index ? { ...p, isLoading: false } : p));
    }
  };

  const generateAll = () => {
    panels.forEach((_, index) => generatePanelImage(index));
  };

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex flex-col gap-6">
         <div>
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <Clapperboard className="text-orange-400" /> AI Storyboard
            </h2>
            <p className="text-gray-400 text-sm">Visualize your narrative scene by scene.</p>
          </div>

          <div className="flex gap-4 items-start">
             <div className="flex-1">
                <input
                  type="text"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  placeholder="Describe your story (e.g., A detective explores a rainy cyberpunk city looking for clues...)"
                  value={storyPrompt}
                  onChange={(e) => setStoryPrompt(e.target.value)}
                />
             </div>
             <button
              onClick={handleCreatePlan}
              disabled={isPlanning || !storyPrompt}
              className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-6 rounded-lg whitespace-nowrap disabled:opacity-50"
             >
               {isPlanning ? <Loader2 className="animate-spin" /> : "Plan Story"}
             </button>
          </div>
      </div>

      {panels.length > 0 && (
         <div className="space-y-4">
             <div className="flex justify-between items-center">
                <h3 className="text-lg text-gray-300 font-semibold">Scenes</h3>
                <button 
                  onClick={generateAll}
                  className="text-sm bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Generate All Images
                </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {panels.map((panel, index) => (
                   <div key={panel.id} className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 flex flex-col">
                      <div className="aspect-video bg-gray-900 relative flex items-center justify-center group">
                         {panel.isLoading ? (
                            <div className="flex flex-col items-center">
                               <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                               <span className="text-xs text-orange-400 mt-2">Generating...</span>
                            </div>
                         ) : panel.imageUrl ? (
                            <>
                              <img src={panel.imageUrl} alt={panel.description} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                  onClick={() => generatePanelImage(index)}
                                  className="bg-orange-600 hover:bg-orange-500 text-white p-2 rounded-full transform hover:scale-110 transition"
                                  title="Regenerate this panel"
                                >
                                  <RotateCcw className="w-6 h-6" />
                                </button>
                              </div>
                            </>
                         ) : (
                            <button 
                              onClick={() => generatePanelImage(index)}
                              className="text-orange-400 hover:text-orange-300 text-sm border border-orange-500/30 bg-orange-500/10 px-4 py-2 rounded-full transition"
                            >
                               Generate Image
                            </button>
                         )}
                         
                         {/* Scene Number Badge */}
                         <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded font-mono pointer-events-none">
                           SCENE {index + 1}
                         </div>
                      </div>
                      <div className="p-3">
                         <p className="text-gray-300 text-xs leading-relaxed line-clamp-4">{panel.description}</p>
                      </div>
                   </div>
                ))}
             </div>
         </div>
      )}
    </div>
  );
};