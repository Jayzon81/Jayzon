
import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ImageGenerator } from './components/ImageGenerator';
import { VideoGenerator } from './components/VideoGenerator';
import { Storyboard } from './components/Storyboard';
import { Editor } from './components/Editor';
import { Analyzer } from './components/Analyzer';
import { ModelTrainer } from './components/ModelTrainer';
import { ApiKeyModal } from './components/ApiKeyModal';
import { AppMode } from './types';

function App() {
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.GENERATE_IMAGE);
  const [isKeyVerified, setIsKeyVerified] = useState(false);

  const renderContent = () => {
    switch (currentMode) {
      case AppMode.GENERATE_IMAGE:
        return <ImageGenerator />;
      case AppMode.GENERATE_VIDEO:
        return <VideoGenerator />;
      case AppMode.STORYBOARD:
        return <Storyboard />;
      case AppMode.EDIT_IMAGE:
        return <Editor />;
      case AppMode.ANALYZE:
        return <Analyzer />;
      case AppMode.TRAIN_MODEL:
        // Pass setCurrentMode to allow the Trainer to navigate to generators
        return <ModelTrainer onModeChange={setCurrentMode} />;
      default:
        return <ImageGenerator />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans selection:bg-purple-500/30">
      <ApiKeyModal onVerified={() => setIsKeyVerified(true)} />
      
      {isKeyVerified ? (
        <>
          <Sidebar currentMode={currentMode} onModeChange={setCurrentMode} />
          <main className="ml-20 md:ml-64 min-h-screen transition-all duration-300">
             <header className="h-16 border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-20 flex items-center px-6 justify-between md:hidden">
                <span className="font-bold">OmniCreate</span>
             </header>
             <div className="container mx-auto py-8">
               {renderContent()}
             </div>
          </main>
        </>
      ) : (
        <div className="flex h-screen items-center justify-center text-gray-500">
          <p>Waiting for API Key selection...</p>
        </div>
      )}
    </div>
  );
}

export default App;
