import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Send } from "lucide-react";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import ChatMessage from "./ChatMessage";
import TypingIndicator from "./TypingIndicator";
import { Message } from "../types/chat";

const BACKEND_URL = "https://arogya-backend-y7d6.onrender.com";
const SILENCE_DELAY = 1200; // ms
const MAX_MIC_DURATION = 8000; // 8 seconds safety cutoff

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<"en" | "ml" | null>(null);

  // 🔴 Manual mic state
  const [isMicActive, setIsMicActive] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const silenceTimer = useRef<NodeJS.Timeout | null>(null);
  const maxMicTimer = useRef<NodeJS.Timeout | null>(null);

  const {
    transcript,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  /* -------------------------
     Welcome message
  ------------------------- */
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          sender: "bot",
          text:
            "Hello! ✨ Welcome to Arogya — your trusted hospital assistant.\n\nPlease select your language:",
          timestamp: new Date(),
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
     Silence-based auto send
  ------------------------- */
  useEffect(() => {
    if (!isMicActive || !language) return;

    setInput(transcript);

    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
    }

    silenceTimer.current = setTimeout(() => {
      const finalText = transcript.trim();
      if (!finalText) return;

      SpeechRecognition.stopListening();
      setIsMicActive(false);

      if (silenceTimer.current) {
        clearTimeout(silenceTimer.current);
        silenceTimer.current = null;
      }

      if (maxMicTimer.current) {
        clearTimeout(maxMicTimer.current);
        maxMicTimer.current = null;
      }

      resetTranscript();
      sendMessage(finalText);
    }, SILENCE_DELAY);

    return () => {
      if (silenceTimer.current) {
        clearTimeout(silenceTimer.current);
      }
    };
  }, [transcript]);

  /* -------------------------
     Mic toggle (SAFE)
  ------------------------- */
  const handleMicClick = async () => {
    if (!language) return;

    if (!browserSupportsSpeechRecognition) {
      alert("Voice input is not supported in this browser.");
      return;
    }

    // 🔴 Manual stop
    if (isMicActive) {
      SpeechRecognition.stopListening();
      setIsMicActive(false);
      resetTranscript();

      if (silenceTimer.current) {
        clearTimeout(silenceTimer.current);
        silenceTimer.current = null;
      }

      if (maxMicTimer.current) {
        clearTimeout(maxMicTimer.current);
        maxMicTimer.current = null;
      }

      return;
    }

    // 🔴 Manual start
    resetTranscript();
    setIsMicActive(true);

    // ⏱️ Safety cutoff
    maxMicTimer.current = setTimeout(() => {
      SpeechRecognition.stopListening();
      setIsMicActive(false);

      if (maxMicTimer.current) {
        clearTimeout(maxMicTimer.current);
        maxMicTimer.current = null;
      }

      console.log("Mic auto-stopped (safety)");
    }, MAX_MIC_DURATION);

    await SpeechRecognition.startListening({
      continuous: language === "en",
      language: language === "ml" ? "ml-IN" : "en-IN",
    });
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
        body: JSON.stringify({
          message: text,
          language,
        }),
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

  /* -------------------------
     Instruction text
  ------------------------- */
  const instruction = (() => {
    if (!language) return "";

    if (!isMicActive) {
      return language === "ml"
        ? "സംസാരിക്കാൻ മൈക്ക് അമർത്തുക"
        : "Press the mic to speak";
    }

    return language === "ml"
      ? "ഇപ്പോൾ സംസാരിക്കുക"
      : "Speak now";
  })();

  return (
    <div className="flex flex-col h-screen bg-green-50">
      {/* HEADER */}
      <header className="bg-green-700 text-white px-6 py-6 shadow">
        <h1 className="text-3xl font-bold">Arogya</h1>
        <p className="text-green-200">Your trusted hospital assistant</p>
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
              English
            </button>

            <button
              onClick={() => setLanguage("ml")}
              className="w-full py-4 border-2 border-green-600 rounded-2xl text-xl font-semibold text-green-700"
            >
              മലയാളം
            </button>
          </div>
        )}

        {language && (
          <p className="text-center text-green-700 text-sm mb-3">
            {instruction}
          </p>
        )}

        {/* MIC */}
        <div className="flex justify-center mb-4">
          <button
            onClick={handleMicClick}
            className={`p-6 rounded-full text-white transition ${
              isMicActive ? "bg-red-500 animate-pulse" : "bg-green-600"
            }`}
          >
            {isMicActive ? <MicOff size={30} /> : <Mic size={30} />}
          </button>
        </div>

        {/* INPUT */}
        <div className="flex gap-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={!language}
            className="flex-1 px-4 py-3 rounded-full border border-green-300"
            placeholder={
              language
                ? "Type your message…"
                : "Choose language first 😊"
            }
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
