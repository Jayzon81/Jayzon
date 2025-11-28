
import React, { useState, useEffect, useRef } from 'react';
import { CustomModel, ImageAspectRatio, AppMode } from '../types';
import { generateImage, autoTrainCharacter } from '../services/geminiService';
import { getAllModels, saveModel, deleteModelById } from '../services/storageService';
import { 
  BrainCircuit, 
  Plus, 
  Trash2, 
  Loader2, 
  Terminal,
  Wand2,
  Sparkles,
  Image as ImageIcon,
  Zap,
  Upload,
  X,
  ArrowLeft,
  Film,
  LayoutTemplate,
  Camera,
  ScanFace,
  Save
} from 'lucide-react';

interface ModelTrainerProps {
  onModeChange?: (mode: AppMode) => void;
}

export const ModelTrainer: React.FC<ModelTrainerProps> = ({ onModeChange }) => {
  const [models, setModels] = useState<CustomModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [isAutoTraining, setIsAutoTraining] = useState(false);
  const [isLoadingDB, setIsLoadingDB] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Auto-Train / Wizard State
  const [showWizard, setShowWizard] = useState(false);
  const [wizardName, setWizardName] = useState('');
  const [wizardDesc, setWizardDesc] = useState('');
  const [wizardFiles, setWizardFiles] = useState<File[]>([]); 

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const wizardFileRef = useRef<HTMLInputElement>(null);

  // Load models on mount
  useEffect(() => {
    const init = async () => {
      setIsLoadingDB(true);
      let loaded = await getAllModels();
      setModels(loaded);
      setIsLoadingDB(false);
    };
    init();
  }, []);

  // Debounced Auto-save
  useEffect(() => {
    if (models.length === 0 || isLoadingDB) return;
    const timer = setTimeout(() => {
        models.forEach(m => saveModel(m));
    }, 1000); 
    return () => clearTimeout(timer);
  }, [models, isLoadingDB]);

  const createNewModel = async () => {
    const newModel: CustomModel = {
      id: `model-${Date.now()}`,
      name: "New Character",
      avatar: "👤",
      type: "chat",
      systemInstruction: "",
      consistencyContext: "",
      examples: [],
      referenceImages: [],
      lastModified: Date.now(),
    };
    await saveModel(newModel);
    setModels(prev => [...prev, newModel]);
    setSelectedModelId(newModel.id);
  };

  const deleteModel = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this character?")) return;
    await deleteModelById(id);
    setModels(prev => prev.filter(m => m.id !== id));
    if (selectedModelId === id) setSelectedModelId(null);
  };

  const updateSelectedModel = (updates: Partial<CustomModel>) => {
    setModels(prev => prev.map(m => 
      m.id === selectedModelId ? { ...m, ...updates, lastModified: Date.now() } : m
    ));
    setSaveSuccess(false); // Reset save state on change
  };

  const handleManualSave = async () => {
    const model = getSelectedModel();
    if (!model) return;
    setIsSaving(true);
    await saveModel(model);
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const getSelectedModel = () => models.find(m => m.id === selectedModelId);

  const handleUseModel = (id: string, type: 'image' | 'video') => {
    localStorage.setItem('omni_active_model_id', id);
    localStorage.setItem('omni_active_model_type', type);
    if (onModeChange) {
      onModeChange(type === 'image' ? AppMode.GENERATE_IMAGE : AppMode.GENERATE_VIDEO);
    }
  };

  // --- Helper Functions ---
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
    });
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        updateSelectedModel({ avatar: result }); 
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Reference Images Logic ---
  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const model = getSelectedModel();
    if (!model || !e.target.files) return;

    const files = Array.from(e.target.files);
    const currentRefs = model.referenceImages || [];
    const remainingSlots = 4 - currentRefs.length;
    
    if (remainingSlots <= 0) return;
    
    const filesToProcess = files.slice(0, remainingSlots);
    
    Promise.all(filesToProcess.map(fileToBase64)).then(newBase64s => {
       updateSelectedModel({ referenceImages: [...currentRefs, ...newBase64s] });
    });
  };

  const removeReferenceImage = (index: number) => {
    const model = getSelectedModel();
    if (!model) return;
    const currentRefs = model.referenceImages || [];
    const newRefs = currentRefs.filter((_, i) => i !== index);
    updateSelectedModel({ referenceImages: newRefs });
  };

  // --- Wizard Logic ---
  const handleRunAutoTrain = async () => {
    if (!wizardName || !wizardDesc) return;
    setIsAutoTraining(true);
    try {
      // Wizard still generates a base context using the API
      let base64Images: string[] = [];
      if (wizardFiles.length > 0) {
        base64Images = await Promise.all(wizardFiles.map(fileToBase64));
      }
      
      const profile = await autoTrainCharacter(wizardName, wizardDesc, ""); 
      
      let avatarData = "👤";
      if (base64Images.length > 0) avatarData = `data:image/png;base64,${base64Images[0]}`;
      else {
        try {
          avatarData = await generateImage(`Icon for character ${wizardName}. ${profile.consistencyContext}. Minimalist vector icon.`, ImageAspectRatio.SQUARE, false);
        } catch (e) {}
      }

      const newModel: CustomModel = {
        id: `model-${Date.now()}`,
        name: wizardName,
        avatar: avatarData,
        type: "chat",
        systemInstruction: "", 
        consistencyContext: profile.consistencyContext,
        examples: [],
        referenceImages: base64Images.length > 0 ? base64Images : [], // Store wizard images as refs
        lastModified: Date.now(),
      };
      await saveModel(newModel);
      setModels(prev => [...prev, newModel]);
      setSelectedModelId(newModel.id);
      setShowWizard(false);
      setWizardName(''); setWizardDesc(''); setWizardFiles([]);
    } catch (e) { alert("Auto-train failed"); } 
    finally { setIsAutoTraining(false); }
  };

  const handleWizardFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setWizardFiles(prev => [...prev, ...Array.from(e.target.files!)].slice(0, 1)); // Only 1 needed for avatar in wizard now
    }
  };

  const removeWizardFile = (index: number) => {
    setWizardFiles(prev => prev.filter((_, i) => i !== index));
  };

  // --- RENDER ---

  if (isLoadingDB) return (
    <div className="flex flex-col h-full items-center justify-center text-gray-500 gap-4">
      <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
      <p>Loading Library...</p>
    </div>
  );

  const currentModel = getSelectedModel();

  // GALLERY VIEW (No Model Selected)
  if (!selectedModelId) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="flex justify-between items-center">
           <div>
             <h2 className="text-3xl font-bold text-white flex items-center gap-3">
               <BrainCircuit className="text-yellow-400 w-8 h-8" /> Character Library
             </h2>
             <p className="text-gray-400 mt-1">Manage and use your custom AI personas.</p>
           </div>
           <button 
             onClick={() => setShowWizard(true)}
             className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg transition transform hover:scale-105"
           >
             <Zap className="w-5 h-5" /> Magic Create
           </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
           {/* Create New Card */}
           <div 
             onClick={createNewModel}
             className="bg-gray-800/50 border-2 border-dashed border-gray-700 hover:border-yellow-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer min-h-[300px] transition group"
           >
              <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4 group-hover:bg-yellow-500/20 transition">
                <Plus className="w-8 h-8 text-gray-400 group-hover:text-yellow-400" />
              </div>
              <h3 className="font-semibold text-gray-300 group-hover:text-white">Empty Character</h3>
              <p className="text-sm text-gray-500 text-center mt-2">Start from scratch</p>
           </div>

           {/* Model Cards */}
           {models.map(model => (
             <div key={model.id} className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700 hover:border-gray-500 transition shadow-lg flex flex-col">
                <div className="aspect-square bg-gray-700 relative group cursor-pointer" onClick={() => setSelectedModelId(model.id)}>
                   {model.avatar?.startsWith('data:') ? (
                     <img src={model.avatar} className="w-full h-full object-cover transition duration-500 group-hover:scale-110" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-6xl">{model.avatar || "👤"}</div>
                   )}
                   <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <button className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full backdrop-blur-sm flex items-center gap-2">
                        <Terminal className="w-4 h-4" /> Edit Profile
                      </button>
                   </div>
                </div>
                
                <div className="p-4 flex-1 flex flex-col">
                   <div className="flex justify-between items-start mb-2">
                     <h3 className="font-bold text-white text-lg truncate">{model.name}</h3>
                     <button onClick={(e) => { e.stopPropagation(); deleteModel(model.id); }} className="text-gray-500 hover:text-red-400">
                       <Trash2 className="w-4 h-4" />
                     </button>
                   </div>
                   <p className="text-xs text-gray-400 line-clamp-2 mb-4 flex-1">
                     {model.consistencyContext || "No visual description set."}
                   </p>
                   
                   <div className="grid grid-cols-2 gap-2 mt-auto">
                     <button 
                       onClick={(e) => { e.stopPropagation(); handleUseModel(model.id, 'image'); }}
                       className="bg-gray-700 hover:bg-purple-600 text-gray-200 hover:text-white py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition"
                     >
                       <ImageIcon className="w-3 h-3" /> Image
                     </button>
                     <button 
                       onClick={(e) => { e.stopPropagation(); handleUseModel(model.id, 'video'); }}
                       className="bg-gray-700 hover:bg-pink-600 text-gray-200 hover:text-white py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition"
                     >
                       <Film className="w-3 h-3" /> Video
                     </button>
                   </div>
                </div>
             </div>
           ))}
        </div>

        {/* Wizard Modal */}
        {showWizard && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gradient-to-r from-yellow-900/20 to-orange-900/20">
                 <h3 className="text-xl font-bold text-white flex items-center gap-2">
                   <Sparkles className="text-yellow-400" /> Character Wizard
                 </h3>
                 <button onClick={() => !isAutoTraining && setShowWizard(false)} className="text-gray-400 hover:text-white">x</button>
              </div>
              <div className="p-8 space-y-6 overflow-y-auto">
                {isAutoTraining ? (
                   <div className="flex flex-col items-center justify-center py-8 space-y-4">
                      <div className="relative"><Loader2 className="w-16 h-16 text-yellow-400 animate-spin" /></div>
                      <h4 className="text-xl font-semibold text-white">Conjuring Character...</h4>
                   </div>
                ) : (
                  <>
                    <div>
                       <label className="block text-sm font-medium text-gray-300 mb-2">Character Name</label>
                       <input value={wizardName} onChange={(e) => setWizardName(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-yellow-500 outline-none" placeholder="e.g. Shadow Broker" />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                       <textarea value={wizardDesc} onChange={(e) => setWizardDesc(e.target.value)} className="w-full h-24 bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-yellow-500 outline-none resize-none" placeholder="Who are they? e.g. A cybernetic samurai with a glowing katana." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Profile Image (Optional)</label>
                      <div className="flex gap-2">
                        {wizardFiles.map((f, i) => (
                          <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-600 bg-gray-800">
                             <img src={URL.createObjectURL(f)} className="w-full h-full object-cover opacity-70" />
                             <button onClick={() => removeWizardFile(i)} className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-red-500/40 text-white transition">
                                <X className="w-4 h-4" />
                             </button>
                          </div>
                        ))}
                        {wizardFiles.length < 1 && (
                          <div onClick={() => wizardFileRef.current?.click()} className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-600 hover:border-yellow-500 flex flex-col items-center justify-center cursor-pointer text-gray-500 hover:text-yellow-400 transition">
                             <Upload className="w-4 h-4" />
                             <input ref={wizardFileRef} type="file" accept="image/*" className="hidden" onChange={handleWizardFileChange} />
                          </div>
                        )}
                      </div>
                    </div>
                    <button onClick={handleRunAutoTrain} disabled={!wizardName || !wizardDesc} className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2">
                      <Wand2 className="w-5 h-5" /> Auto-Create Profile
                    </button>
                  </>
                )}
              </div>
           </div>
        </div>
      )}
      </div>
    );
  }

  // EDITOR VIEW (Single Config View)
  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-4 border-b border-gray-800 pb-4">
         <button onClick={() => setSelectedModelId(null)} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition">
            <ArrowLeft className="w-6 h-6" />
         </button>
         <div className="flex-1">
           <h2 className="text-xl font-bold text-white flex items-center gap-2">
             <span className="text-yellow-400">{currentModel.name}</span>
           </h2>
         </div>
         <div className="flex gap-2">
             <button 
                onClick={handleManualSave}
                disabled={isSaving}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${saveSuccess ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
             >
               {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
               {saveSuccess ? "Saved!" : "Save Changes"}
             </button>
             <button 
               onClick={() => handleUseModel(currentModel.id, 'image')}
               className="bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
             >
               <ImageIcon className="w-4 h-4" /> Use Image
             </button>
             <button 
               onClick={() => handleUseModel(currentModel.id, 'video')}
               className="bg-pink-600/20 hover:bg-pink-600 text-pink-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
             >
               <Film className="w-4 h-4" /> Use Video
             </button>
         </div>
      </div>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden relative shadow-xl">
             <div className="flex border-b border-gray-800 bg-gray-900/50 px-6 py-4">
               <div className="flex items-center gap-2 text-yellow-400 font-medium">
                  <LayoutTemplate className="w-4 h-4" /> Profile Editor
               </div>
             </div>
             
             <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    
                    {/* Left Column: Avatar */}
                    <div className="col-span-1 flex flex-col items-center space-y-4">
                       <div 
                         onClick={() => avatarInputRef.current?.click()}
                         className="w-48 h-48 rounded-2xl bg-gray-800 overflow-hidden border-2 border-dashed border-gray-700 hover:border-yellow-500 cursor-pointer relative group transition-all"
                       >
                          {currentModel.avatar?.startsWith('data:') ? (
                            <img src={currentModel.avatar} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-6xl text-gray-600">
                               {currentModel.avatar || "👤"}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-white gap-2">
                             <Camera className="w-8 h-8" />
                             <span className="text-xs font-bold uppercase tracking-wider">Upload Profile</span>
                          </div>
                          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                       </div>
                       <p className="text-xs text-gray-500 text-center">Click to upload character portrait</p>
                    </div>

                    {/* Right Column: Details */}
                    <div className="col-span-1 md:col-span-2 space-y-6">
                        <div>
                           <label className="text-xs text-gray-400 uppercase font-bold tracking-wider">Character Name</label>
                           <input 
                             value={currentModel.name} 
                             onChange={(e) => updateSelectedModel({ name: e.target.value })} 
                             className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-xl font-bold text-white mt-1 focus:ring-2 focus:ring-yellow-500 outline-none" 
                             placeholder="e.g. Cyberpunk Detective"
                           />
                        </div>

                        {/* Reference Images Section */}
                        <div>
                          <label className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-2">
                              <ScanFace className="w-4 h-4 text-cyan-400" /> Reference Images (Crucial for Video)
                          </label>
                          <p className="text-xs text-gray-500 mb-3">Upload up to 3 images. These are used directly by the Video Generator for maximum consistency.</p>
                          
                          <div className="grid grid-cols-4 gap-2 mb-3">
                              {currentModel.referenceImages?.map((img, idx) => (
                                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-600 group">
                                    <img src={`data:image/png;base64,${img}`} className="w-full h-full object-cover" />
                                    <button onClick={() => removeReferenceImage(idx)} className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white opacity-0 group-hover:opacity-100 transition">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                              ))}
                              {(currentModel.referenceImages?.length || 0) < 4 && (
                                  <div onClick={() => referenceInputRef.current?.click()} className="aspect-square rounded-lg border-2 border-dashed border-gray-600 hover:border-cyan-500 cursor-pointer flex flex-col items-center justify-center text-gray-500 hover:text-cyan-400 transition bg-gray-800/50">
                                    <Upload className="w-5 h-5 mb-1" />
                                    <span className="text-[10px]">Add Ref</span>
                                    <input ref={referenceInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleReferenceUpload} />
                                  </div>
                              )}
                          </div>
                        </div>

                        <div>
                           <label className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-2">
                              <Wand2 className="w-4 h-4 text-cyan-400" /> Visual Prompt (Description)
                           </label>
                           <textarea 
                              value={currentModel.consistencyContext || ''} 
                              onChange={(e) => updateSelectedModel({ consistencyContext: e.target.value })} 
                              className="w-full h-32 bg-gray-800 border border-gray-700 rounded-xl p-4 text-sm text-gray-300 outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none leading-relaxed" 
                              placeholder="Describe exactly how this character looks for image generation. Include hair, eyes, clothing, and art style. (e.g. 'Neon green hair, cybernetic arm, orange bomber jacket, anime art style')." 
                           />
                           <p className="text-xs text-gray-500 mt-2">
                             This description acts as the backup prompt for consistency if references aren't used.
                           </p>
                        </div>
                    </div>
                </div>
             </div>
      </div>
    </div>
  );
};
