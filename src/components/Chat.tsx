import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Mic, MicOff } from 'lucide-react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';
import { Message } from '../types/chat';

const BACKEND_URL = 'https://arogya-backend-y7d6.onrender.com';

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'ml' | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  /* -------------------- Scroll -------------------- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  /* -------------------- Sync speech → input -------------------- */
  useEffect(() => {
    if (listening) {
      setInput(transcript);
    }
  }, [transcript, listening]);

  /* Preserve transcript when mic stops */
  useEffect(() => {
    if (!listening && transcript) {
      setInput(transcript);
    }
  }, [listening]);

  /* -------------------- Initial welcome -------------------- */
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          text:
            "Hello! ✨\n\nWelcome to Arogya — your trusted hospital assistant.\n\nI'm here to help with doctors, symptoms, timings, and more.\n\nPlease choose your preferred language:",
          sender: 'bot',
          timestamp: new Date(),
        },
        {
          id: 'lang-options',
          text: '🇬🇧 English\n\n🇮🇳 മലയാളം (Malayalam)',
          sender: 'bot',
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  /* -------------------- Mic handler (FIXED) -------------------- */
  const toggleListening = () => {
    if (!browserSupportsSpeechRecognition) {
      alert('Voice input is not supported in this browser.');
      return;
    }

    if (preferredLanguage === null) {
      alert('Please choose a language first.');
      return;
    }

    if (listening) {
      SpeechRecognition.stopListening();
      return;
    }

    resetTranscript();
    SpeechRecognition.startListening({
      continuous: false, // ✅ CRITICAL
      language: preferredLanguage === 'ml' ? 'ml-IN' : 'en-IN',
    });
  };

  /* -------------------- Send message -------------------- */
  const sendMessage = async () => {
    const finalInput = input.trim();
    if (!finalInput || isLoading) return;

    /* -------- Language selection -------- */
    if (preferredLanguage === null) {
      const lower = finalInput.toLowerCase();

      if (lower.includes('english') || lower.includes('eng')) {
        setPreferredLanguage('en');
        setMessages(prev => [
          ...prev,
          { id: Date.now().toString(), text: finalInput, sender: 'user', timestamp: new Date() },
          {
            id: (Date.now() + 1).toString(),
            text: "Great! 😊 I'll respond in English from now on.\n\nHow can I help you today?",
            sender: 'bot',
            timestamp: new Date(),
          },
        ]);
        setInput('');
        return;
      }

      if (lower.includes('malayalam') || /[\u0D00-\u0D7F]/.test(finalInput)) {
        setPreferredLanguage('ml');
        setMessages(prev => [
          ...prev,
          { id: Date.now().toString(), text: finalInput, sender: 'user', timestamp: new Date() },
          {
            id: (Date.now() + 1).toString(),
            text: 'നല്ല തിരഞ്ഞെടുപ്പ്! 😊 ഇനി മുതൽ മലയാളത്തിൽ മറുപടി തരാം.\n\nഎന്താണ് സഹായിക്കാൻ കഴിയുക?',
            sender: 'bot',
            timestamp: new Date(),
          },
        ]);
        setInput('');
        return;
      }
    }

    /* -------- Normal chat -------- */
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
          voice_enabled: voiceEnabled,
          language: preferredLanguage || 'en',
        }),
      });

      if (!response.ok) throw new Error('Server error');

      const data = await response.json();

      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: data.reply,
          audio_url: voiceEnabled ? data.audio_url : undefined,
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

  /* -------------------- Enter key -------------------- */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /* -------------------- UI -------------------- */
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
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bg-white border-t px-6 py-6 shadow-2xl">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center gap-10 mb-6">
            <button
              onClick={toggleListening}
              className={`p-4 rounded-full text-white shadow-md ${
                listening ? 'bg-red-600 animate-pulse' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {listening ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
            </button>

            <button
              onClick={() => setVoiceEnabled(v => !v)}
              className={`px-8 py-3 rounded-full shadow-md ${
                voiceEnabled
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-300 text-gray-700'
              }`}
            >
              {voiceEnabled ? '🔊 Voice ON' : '🔇 Voice OFF'}
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
              className="flex-1 px-6 py-5 rounded-2xl border border-green-300 bg-green-50 text-lg"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="p-5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl shadow-xl"
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
