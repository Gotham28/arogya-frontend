import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Mic, MicOff } from 'lucide-react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';
import { Message } from '../types/chat';

const BACKEND_URL = "https://arogya-backend-y7d6.onrender.com";
';

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (listening) setInput(transcript);
  }, [transcript, listening]);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          text: "Hello! ✨\n\nWelcome to Arogya — your trusted hospital assistant.\n\nI'm here to help with doctors, symptoms, timings, and more.\n\nPlease choose your preferred language:",
          sender: 'bot',
          timestamp: new Date(),
        },
        {
          id: 'lang-options',
          text: "🇬🇧 English\n\n🇮🇳 മലയാളം (Malayalam)",
          sender: 'bot',
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  const toggleListening = () => {
    if (listening) {
      SpeechRecognition.stopListening();
      if (transcript) setInput(transcript);
    } else {
      resetTranscript();
      SpeechRecognition.startListening({
        continuous: true,
        language: preferredLanguage === 'ml' ? 'ml-IN' : 'en-IN',
      });
    }
  };

  const sendMessage = async () => {
    let finalInput = input.trim() || transcript?.trim();
    if (!finalInput || isLoading) return;

    if (preferredLanguage === null) {
      const lower = finalInput.toLowerCase();
      if (lower.includes('english') || lower.includes('eng')) {
        setPreferredLanguage('en');
        setMessages(prev => [...prev, { id: Date.now().toString(), text: finalInput, sender: 'user', timestamp: new Date() }]);
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          text: "Great! 😊 I'll respond in English from now on.\n\nHow can I help you today?",
          sender: 'bot',
          timestamp: new Date(),
        }]);
        setInput('');
        return;
      } else if (lower.includes('malayalam') || /[\u0D00-\u0D7F]/.test(finalInput)) {
        setPreferredLanguage('ml');
        setMessages(prev => [...prev, { id: Date.now().toString(), text: finalInput, sender: 'user', timestamp: new Date() }]);
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          text: "നല്ല തിരഞ്ഞെടുപ്പ്! 😊 ഇനി മുതൽ മലയാളത്തിൽ മറുപടി തരാം.\n\nഎന്താണ് സഹായിക്കാൻ കഴിയുക?",
          sender: 'bot',
          timestamp: new Date(),
        }]);
        setInput('');
        return;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: finalInput,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
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

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.reply,
        audio_url: voiceEnabled ? data.audio_url : undefined,
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: "I'm having trouble connecting right now. Please try again — I'm here to help! 😊",
        sender: 'bot',
        timestamp: new Date(),
      }]);
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

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-green-50 to-emerald-100">
      {/* Clean Green Header */}
      <header className="bg-gradient-to-r from-green-700 to-emerald-800 text-white shadow-lg px-6 py-8">
        <div className="max-w-5xl mx-auto flex items-center gap-5">
          <Sparkles className="w-10 h-10 text-green-300 animate-pulse" />
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Arogya</h1>
            <p className="text-green-200 text-lg mt-1">Your trusted hospital assistant</p>
          </div>
        </div>
      </header>

      {/* Spacious Message Area */}
      <div className="flex-1 overflow-y-auto px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Clean Input Bar */}
      <div className="bg-white border-t border-green-200 px-6 py-6 shadow-2xl">
        <div className="max-w-4xl mx-auto">
          {/* Controls */}
          <div className="flex justify-center gap-10 mb-6">
            <button
              onClick={toggleListening}
              className={`p-4 rounded-full transition-all shadow-md ${
                listening ? 'bg-red-600 animate-pulse' : 'bg-green-600 hover:bg-green-700'
              } text-white`}
            >
              {listening ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
            </button>

            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`px-8 py-3 rounded-full font-medium transition-all shadow-md ${
                voiceEnabled
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
              }`}
            >
              {voiceEnabled ? '🔊 Voice ON' : '🔇 Voice OFF'}
            </button>
          </div>

          {/* Input Field */}
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              placeholder={
                preferredLanguage === null
                  ? "Choose language first 😊"
                  : listening
                  ? "Listening... speak now 🎤"
                  : "Type your message..."
              }
              className="flex-1 px-6 py-5 bg-green-50 border border-green-300 rounded-2xl focus:outline-none focus:ring-4 focus:ring-green-400 focus:border-green-500 text-gray-800 placeholder-green-600 text-lg transition-all"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="p-5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-4 focus:ring-green-400 disabled:opacity-50 transition-all shadow-xl hover:scale-105"
            >
              <Send className="w-7 h-7" />
            </button>
          </div>

          <p className="text-center text-green-700 text-sm mt-4">
            {preferredLanguage === null ? 'Please select English or Malayalam to continue' : 'Your assistant is ready'}
          </p>
        </div>
      </div>
    </div>
  );
}
