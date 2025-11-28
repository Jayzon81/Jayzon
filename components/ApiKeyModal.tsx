import React, { useEffect, useState } from 'react';
import { checkApiKey, promptForKeySelection } from '../services/geminiService';
import { Key } from 'lucide-react';

export const ApiKeyModal: React.FC<{ onVerified: () => void }> = ({ onVerified }) => {
  const [hasKey, setHasKey] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkApiKey().then((exists) => {
      if (exists) {
        setHasKey(true);
        onVerified();
      }
    });
  }, [onVerified]);

  const handleSelectKey = async () => {
    setLoading(true);
    try {
      await promptForKeySelection();
      // Assume success if no error thrown, as per race condition guidance
      setHasKey(true);
      onVerified();
    } catch (e) {
      console.error("Key selection failed", e);
      alert("Failed to select key. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (hasKey) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
        <div className="bg-blue-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
          <Key className="w-8 h-8 text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-4">API Key Required</h2>
        <p className="text-gray-400 mb-8">
          To use OmniCreate AI, you need to select a Google Cloud Project with billing enabled for Gemini API access.
        </p>
        <button
          onClick={handleSelectKey}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Connecting..." : "Select API Key"}
        </button>
        <div className="mt-4 text-sm text-gray-500">
          <a
            href="https://ai.google.dev/gemini-api/docs/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-blue-400"
          >
            Read about billing requirements
          </a>
        </div>
      </div>
    </div>
  );
};
