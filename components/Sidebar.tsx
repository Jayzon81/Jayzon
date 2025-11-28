
import React from 'react';
import { AppMode } from '../types';
import { Wand2, Film, Clapperboard, Eraser, ScanEye, Layers, BrainCircuit } from 'lucide-react';

interface SidebarProps {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentMode, onModeChange }) => {
  const items = [
    { mode: AppMode.GENERATE_IMAGE, icon: Wand2, label: 'Generate Image' },
    { mode: AppMode.GENERATE_VIDEO, icon: Film, label: 'Generate Video' },
    { mode: AppMode.STORYBOARD, icon: Clapperboard, label: 'Storyboard' },
    { mode: AppMode.EDIT_IMAGE, icon: Eraser, label: 'Edit & Upscale' },
    { mode: AppMode.ANALYZE, icon: ScanEye, label: 'Analyze Media' },
    { mode: AppMode.TRAIN_MODEL, icon: BrainCircuit, label: 'AI Character Studio' },
  ];

  return (
    <div className="w-20 md:w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-screen fixed left-0 top-0 z-10 transition-all duration-300">
      <div className="p-6 flex items-center gap-3 border-b border-gray-800">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
          <Layers className="text-white w-5 h-5" />
        </div>
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 hidden md:block">
          OmniCreate
        </h1>
      </div>

      <nav className="flex-1 py-6 space-y-2 px-3">
        {items.map((item) => (
          <button
            key={item.mode}
            onClick={() => onModeChange(item.mode)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
              currentMode === item.mode
                ? 'bg-gray-800 text-white shadow-md border border-gray-700'
                : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
            }`}
          >
            <item.icon className={`w-5 h-5 ${currentMode === item.mode ? 'text-blue-400' : 'group-hover:text-blue-400 transition-colors'}`} />
            <span className="font-medium hidden md:block">{item.label}</span>
            {currentMode === item.mode && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 hidden md:block shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800">
         <div className="text-xs text-gray-600 text-center md:text-left">
           <p className="hidden md:block">Powered by Gemini & Veo</p>
           <p className="md:hidden">v1.0</p>
         </div>
      </div>
    </div>
  );
};