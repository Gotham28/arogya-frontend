import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Send } from "lucide-react";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import ChatMessage from "./ChatMessage";
import TypingIndicator from "./TypingIndicator";
import { Message } from "../types/chat";

const BACKEND_URL = "https://arogya-backend-y7d6.onrender.com";

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<"en" | "ml" | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  /* -------------------------
     Welcome message (once)
  ------------------------- */
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          sender: "bot",
          timestamp: new Date(),
          text:
            "Hello! ✨ Welcome to Arogya — your trusted hospital assistant.\n\nPlease select your language:",
        },
      ]);
    }
  }, []);

  /* -------------------------
     Auto-scroll
  ------------------------- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  /* -------------------------
     Sync voice → input
  ------------------------- */
  useEffect(() => {
    if (listening) {
      setInput(transcript);
    }
  }, [transcript, listening]);

  /* -------------------------
     AUTO-SEND WHEN MIC STOPS
     (KEY FIX)
  ------------------------- */
  useEffect(() => {
    if (!listening && transcript.trim() && language) {
      sendMessage(transcript.trim());
      resetTranscript();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening]);

  /* -------------------------
     Mic toggle (IMPROVED)
  ------------------------- */
  const handleMicClick = async () => {
    if (!language) return;

    if (!browserSupportsSpeechRecognition) {
      alert("Voice input is not supported in this browser.");
      return;
    }

    try {
      if (listening) {
        SpeechRecognition.stopListening();
      } else {
        resetTranscript();
        await SpeechRecognition.startListening({
          continuous: true, // 🔑 accuracy improvement
          language: language === "ml" ? "ml-IN" : "en-IN",
        });
      }
    } catch {
      alert("Please allow microphone access.");
    }
  };

  /* -------------------------
     Send message
  ------------------------- */
  const sendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || isLoading || !language) return;

    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: "user",
        text,
        timestamp: new Date(),
      },
    ]);

    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-ID": sessionStorage.getItem("chat_session_id") || "",
        },
        body: JSON.stringify({ message: text, language }),
      });

      const data = await res.json();

      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: data.reply,
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: "error",
          sender: "bot",
          text: "Something went wrong. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const instruction =
    language === "ml"
      ? "വ്യക്തമായി സംസാരിക്കുക, കഴിഞ്ഞാൽ നിർത്തുക"
      : "Speak clearly and pause when finished";

  return (
    <div className="flex flex-col h-screen bg-green-50">
      {/* HEADER */}
      <header className="bg-green-700 text-white px-6 py-6 shadow">
        <h1 className="text-3xl font-bold">Arogya</h1>
        <p className="text-green-200 text-lg">
          Your trusted hospital assistant
        </p>
      </header>

      {/* CHAT */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map(m => (
          <ChatMessage key={m.id} message={m} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* CONTROLS */}
      <div className="bg-white border-t px-4 py-5">
        {!language && (
          <div className="space-y-4 mb-6">
            <button
              onClick={() => setLanguage("en")}
              className="w-full py-4 border-2 border-green-600 rounded-2xl text-xl font-semibold text-green-700"
            >
              🌐 English
            </button>
            <button
              onClick={() => setLanguage("ml")}
              className="w-full py-4 border-2 border-green-600 rounded-2xl text-xl font-semibold text-green-700"
            >
              🌐 മലയാളം
            </button>
          </div>
        )}

        {language && (
          <p className="text-center text-green-700 text-sm mb-3">
            {instruction}
          </p>
        )}

        {/* MIC BUTTON */}
        <div className="flex justify-center mb-4">
          <button
            onClick={handleMicClick}
            disabled={!language}
            className={`p-6 rounded-full text-white shadow-lg ${
              listening ? "bg-red-500 animate-pulse" : "bg-green-600"
            }`}
          >
            {listening ? <MicOff size={30} /> : <Mic size={30} />}
          </button>
        </div>

        {/* INPUT (typing still allowed) */}
        <div className="flex gap-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={!language}
            placeholder={
              language
                ? "Type your message…"
                : "Choose language first 😊"
            }
            className="flex-1 px-4 py-3 rounded-full border border-green-300"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || !language}
            className="p-4 bg-green-600 text-white rounded-full"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
