import { useState, useRef, useEffect } from "react";
import { Send, Mic, MicOff } from "lucide-react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import ChatMessage from "./ChatMessage";
import TypingIndicator from "./TypingIndicator";
import { Message } from "../types/chat";

const BACKEND_URL = "https://arogya-backend-y7d6.onrender.com";

/* =========================
   Analytics helpers
   ========================= */
const trackEvent = (eventName: string, params = {}) => {
  window.gtag?.("event", eventName, params);
};

const getSessionId = () =>
  sessionStorage.getItem("chat_session_id") ?? "unknown";

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState<"en" | "ml" | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition();

  /* =========================
     Auto-scroll
     ========================= */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isLoading]);

  /* =========================
     Sync transcript → input
     ========================= */
  useEffect(() => {
    if (listening) {
      setInput(transcript);
    }
  }, [transcript, listening]);

  /* =========================
     Initial welcome
     ========================= */
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          text:
            "Hello! 👋\n\nI'm here to help with doctors, symptoms, timings, and more.\n\nPlease type **English** or **മലയാളം** to choose your language.",
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  /* =========================
     Voice input toggle
     ========================= */
  const toggleListening = () => {
    trackEvent("voice_input_toggle", {
      enabled: !listening,
      session_id: getSessionId(),
    });

    if (!browserSupportsSpeechRecognition) return;

    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      resetTranscript();
      SpeechRecognition.startListening({
        continuous: true,
        language: preferredLanguage === "ml" ? "ml-IN" : "en-IN",
      });
    }
  };

  /* =========================
     Send message
     ========================= */
  const sendMessage = async () => {
    const finalInput = input.trim() || transcript.trim();
    if (!finalInput || isLoading) return;

    trackEvent("send_message", {
      session_id: getSessionId(),
    });

    setHasStarted(true);

    /* ---------- Language selection ---------- */
    if (preferredLanguage === null) {
      const lower = finalInput.toLowerCase();

      if (lower.includes("english")) {
        setPreferredLanguage("en");
        setMessages(prev => [
          ...prev,
          { id: Date.now().toString(), text: finalInput, sender: "user", timestamp: new Date() },
          {
            id: "lang-confirm",
            text: "Great! I'll respond in English 😊\nHow can I help you today?",
            sender: "bot",
            timestamp: new Date(),
          },
        ]);
        setInput("");
        resetTranscript();
        return;
      }

      if (lower.includes("malayalam") || /[\u0D00-\u0D7F]/.test(finalInput)) {
        setPreferredLanguage("ml");
        setMessages(prev => [
          ...prev,
          { id: Date.now().toString(), text: finalInput, sender: "user", timestamp: new Date() },
          {
            id: "lang-confirm",
            text: "നല്ല തിരഞ്ഞെടുപ്പ്! 😊\nഎന്താണ് സഹായിക്കേണ്ടത്?",
            sender: "bot",
            timestamp: new Date(),
          },
        ]);
        setInput("");
        resetTranscript();
        return;
      }

      setMessages(prev => [
        ...prev,
        { id: Date.now().toString(), text: finalInput, sender: "user", timestamp: new Date() },
        {
          id: "lang-prompt",
          text: "Please type 'English' or 'മലയാളം' to continue.",
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
      setInput("");
      resetTranscript();
      return;
    }

    /* ---------- Normal chat flow ---------- */
    const userMessage: Message = {
      id: Date.now().toString(),
      text: finalInput,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    resetTranscript();
    setIsLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-ID": getSessionId(),
        },
        body: JSON.stringify({
          message: finalInput,
          language: preferredLanguage || "en",
          voice_enabled: voiceEnabled,
        }),
      });

      if (!response.ok) throw new Error("Server error");

      const data = await response.json();

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.reply,
        audio_url: voiceEnabled ? data.audio_url : undefined,
        sender: "bot",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          id: "error",
          text: "I'm having trouble connecting right now. Please try again 🙂",
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const hasContent = input.trim() || transcript.trim();

  /* =========================
     UI
     ========================= */
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {!hasStarted && (
        <header className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-6 py-8 shadow-lg">
          <h1 className="text-3xl font-bold">Arogya</h1>
          <p className="text-teal-100 text-lg mt-1">
            Your trusted hospital assistant
          </p>
        </header>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
        {messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white border-t border-gray-200 px-4 py-4 shadow-lg">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <button
            onClick={toggleListening}
            className={`p-3.5 rounded-full transition-all shadow-md ${
              listening
                ? "bg-red-500 hover:bg-red-600 animate-pulse"
                : "bg-teal-600 hover:bg-teal-700"
            } text-white`}
          >
            {listening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={
              preferredLanguage === null
                ? "Choose language first"
                : listening
                ? "Listening..."
                : "Type your message..."
            }
            className="flex-1 px-5 py-3.5 text-base bg-gray-100 border border-gray-300 rounded-full focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
          />

          <button
            onClick={sendMessage}
            disabled={isLoading || !hasContent}
            className={`p-3.5 rounded-full transition-all shadow-md ${
              isLoading || !hasContent
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-teal-600 hover:bg-teal-700 text-white"
            }`}
          >
            <Send size={20} />
          </button>

          <button
            onClick={() => {
              trackEvent("voice_output_toggle", {
                enabled: !voiceEnabled,
                session_id: getSessionId(),
              });
              setVoiceEnabled(!voiceEnabled);
            }}
            className={`px-4 py-2 rounded-full text-sm ${
              voiceEnabled ? "bg-green-600 text-white" : "bg-gray-200"
            }`}
          >
            Voice
          </button>
        </div>
      </div>
    </div>
  );
}
