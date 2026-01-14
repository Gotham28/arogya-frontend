import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Mic, MicOff, Globe } from 'lucide-react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';
import { Message } from '../types/chat';

const BACKEND_URL = 'https://arogya-backend-y7d6.onrender.com';

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'ml' | null>(null);
  const [showLanguageButtons, setShowLanguageButtons] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition();

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Sync transcript → input while listening
  useEffect(() => {
    if (listening) {
      setInput(transcript);
    }
  }, [transcript, listening]);

  // Preserve transcript when mic stops naturally
  useEffect(() => {
    if (!listening && transcript.trim()) {
      setInput(transcript.trim());
      // Auto-send if we have content and mic just stopped
      if (!isLoading) {
        sendMessage(); // Will use current input
      }
    }
  }, [listening, transcript, isLoading]);

  // Initial welcome
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          text:
            "Hello! ✨\n\nWelcome to Arogya — your trusted hospital assistant.\nI'm here to help with doctors, symptoms, timings, and more.\n\nPlease select your language:",
          sender: 'bot',
          timestamp: new Date(),
        },
      ]);
      setShowLanguageButtons(true);
    }
  }, []);

  const selectLanguage = (lang: 'en' | 'ml') => {
    setPreferredLanguage(lang);
    setShowLanguageButtons(false);
    const confirmationText =
      lang === 'en'
        ? "Great! 😊 I'll respond in English from now on.\n\nHow can I help you today?"
        : 'നല്ല തിരഞ്ഞെടുപ്പ്! 😊 ഇനി മുതൽ മലയാളത്തിൽ മറുപടി തരാം.\n\nഎന്താണ് സഹായിക്കാൻ കഴിയുക?';
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        text: confirmationText,
        sender: 'bot',
        timestamp: new Date(),
      },
    ]);
  };

  // Mic toggle with auto-restart + max timeout
  const toggleListening = () => {
    if (!browserSupportsSpeechRecognition) {
      alert('Voice input is not supported in this browser. Please type your message.');
      return;
    }
    if (preferredLanguage === null) {
      alert('Please choose a language first (English or Malayalam).');
      return;
    }
    if (isMicrophoneAvailable === false) {
      alert(
        'Microphone access was denied.\n\n' +
        'To enable it:\n' +
        '1. Tap the lock icon (or info "i") next to the website address\n' +
        '2. Go to Permissions → Microphone → Allow\n' +
        '3. Refresh the page and try again.\n\n' +
        'You can still type your message!'
      );
      return;
    }

    if (listening) {
      SpeechRecognition.stopListening();
      return;
    }

    resetTranscript();
    setInput('');

    const startListening = () => {
      SpeechRecognition.startListening({
        continuous: false,
        language: preferredLanguage === 'ml' ? 'ml-IN' : 'en-IN',
      }).catch(err => {
        console.error('Speech start error:', err);
        alert('Failed to start listening. Check microphone permission.');
      });
    };

    startListening();

    // Auto-restart after short silence (makes it feel longer)
    const restartOnEnd = () => {
      if (!input.trim()) { // Only restart if nothing was said yet
        startListening();
      }
    };

    SpeechRecognition.onend = restartOnEnd;

    // Hard max timeout: stop + send after ~45 seconds regardless
    const maxTimeout = setTimeout(() => {
      SpeechRecognition.stopListening();
      if (input.trim() && !isLoading) {
        sendMessage();
      }
      SpeechRecognition.onend = null; // Clean up
    }, 45000);

    return () => {
      clearTimeout(maxTimeout);
      SpeechRecognition.onend = null;
    };
  };

  const sendMessage = async () => {
    const finalInput = input.trim();
    if (!finalInput || isLoading) return;

    // Language fallback via typing (kept for convenience)
    if (preferredLanguage === null) {
      const lower = finalInput.toLowerCase();
      if (lower.includes('english') || lower.includes('eng')) {
        selectLanguage('en');
        setInput('');
        return;
      }
      if (lower.includes('malayalam') || /[\u0D00-\u0D7F]/.test(finalInput)) {
        selectLanguage('ml');
        setInput('');
        return;
      }
    }

    // Add user message
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), text: finalInput, sender: 'user', timestamp: new Date() },
    ]);
    setInput('');
    resetTranscript();
    setIsLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: finalInput,
          language: preferredLanguage || 'en', // Removed voice_enabled
        }),
      });

      if (!response.ok) throw new Error('Server error');
      const data = await response.json();

      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: data.reply,
          sender: 'bot',
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          text: "I'm having trouble connecting right now. Please try again 😊",
          sender: 'bot',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Instruction text based on language
  const voiceInstruction = preferredLanguage === 'ml'
    ? "മൈക്ക് ഓണാക്കാൻ താഴെയുള്ള ബട്ടൺ ക്ലിക്ക് ചെയ്യുക"
    : "Click the mic button below to speak";

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-green-50 to-emerald-100">
      <header className="bg-gradient-to-r from-green-700 to-emerald-800 text-white px-6 py-8 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center gap-5">
          <Sparkles className="w-10 h-10 text-green-300 animate-pulse" />
          <div>
            <h1 className="text-4xl font-bold">Arogya</h1>
            <p className="text-green-200 text-lg">Your trusted hospital assistant</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {messages.map(msg => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {isLoading && <TypingIndicator />}
          {showLanguageButtons && (
            <div className="flex flex-col sm:flex-row justify-center gap-6 mt-8">
              <button
                onClick={() => selectLanguage('en')}
                className="flex items-center justify-center gap-3 px-10 py-8 bg-white border-2 border-green-600 rounded-2xl shadow-lg hover:bg-green-50 active:scale-95 transition-all text-2xl font-semibold"
              >
                <Globe className="w-10 h-10 text-green-600" />
                English
              </button>
              <button
                onClick={() => selectLanguage('ml')}
                className="flex items-center justify-center gap-3 px-10 py-8 bg-white border-2 border-green-600 rounded-2xl shadow-lg hover:bg-green-50 active:scale-95 transition-all text-2xl font-semibold"
              >
                <Globe className="w-10 h-10 text-green-600" />
                മലയാളം
              </button>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bg-white border-t px-6 py-6 shadow-2xl">
        <div className="max-w-4xl mx-auto">
          {/* Mic permission warning */}
          {preferredLanguage !== null && isMicrophoneAvailable === false && (
            <p className="text-red-600 text-center mb-4 text-sm font-medium">
              Microphone access denied. Tap the lock icon next to the URL → Permissions → Microphone → Allow, then refresh.
            </p>
          )}

          {/* Voice instruction */}
          {preferredLanguage !== null && (
            <p className="text-center text-green-700 text-base font-medium mb-4">
              {voiceInstruction}
            </p>
          )}

          <div className="flex justify-center gap-10 mb-6">
            <button
              onClick={toggleListening}
              disabled={isMicrophoneAvailable === false || preferredLanguage === null || isLoading}
              className={`p-5 rounded-full text-white shadow-md transition-all ${
                listening
                  ? 'bg-red-600 animate-pulse'
                  : isMicrophoneAvailable === false
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 active:scale-95'
              }`}
            >
              {listening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            </button>
          </div>

          <div className="flex items-center gap-4">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              placeholder={
                preferredLanguage === null
                  ? 'Choose language first 😊'
                  : listening
                  ? 'Listening... speak now 🎤'
                  : 'Type your message...'
              }
              className="flex-1 px-6 py-5 rounded-2xl border border-green-300 bg-green-50 text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="p-5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl shadow-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
            >
              <Send className="w-7 h-7" />
            </button>
          </div>

          <p className="text-center text-green-700 text-sm mt-4">
            {preferredLanguage === null
              ? 'Please select English or Malayalam to continue'
              : 'Your assistant is ready'}
          </p>
        </div>
      </div>
    </div>
  );
}
