import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Send } from "lucide-react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
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
     Auto-scroll
  ------------------------- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  /* -------------------------
     Sync speech → input
  ------------------------- */
  useEffect(() => {
    if (listening) setInput(transcript);
  }, [transcript, listening]);

  /* -------------------------
     Mic toggle (FIXED)
  ------------------------- */
  const toggleMic = () => {
    if (!browserSupportsSpeechRecognition || !language) return;

    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      resetTranscript();
      SpeechRecognition.startListening({
        continuous: false,
        language: language === "ml" ? "ml-IN" : "en-IN",
      });
    }
  };

  /* -------------------------
     Send message
  ------------------------- */
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading || !language) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    resetTranscript();
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

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.reply,
        sender: "bot",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: "error",
          text: "Something went wrong. Please try again.",
          sender: "bot",
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
  const instruction =
    language === "ml"
      ? "സംസാരിക്കാൻ മൈക്ക് ബട്ടൺ അമർത്തുക"
      : "Click the mic button to speak";

  return (
    <div className="flex flex-col h-screen bg-green-50">

      {/* HEADER */}
      <header className="bg-green-600 text-white px-6 py-5 text-center shadow">
        <h1 className="text-2xl font-bold">Arogya</h1>
        <p className="text-green-100">Hospital Assistant</p>
      </header>

      {/* CHAT */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* CONTROLS */}
      <div className="bg-white border-t px-4 py-4">

        {/* LANGUAGE SELECTION */}
        {!language && (
          <div className="flex justify-center gap-4 mb-4">
            <button
              onClick={() => setLanguage("en")}
              className="px-6 py-3 bg-green-600 text-white rounded-full font-semibold"
            >
              English
            </button>
            <button
              onClick={() => setLanguage("ml")}
              className="px-6 py-3 bg-green-600 text-white rounded-full font-semibold"
            >
              മലയാളം
            </button>
          </div>
        )}

        {/* MIC INSTRUCTION */}
        {language && (
          <p className="text-center text-green-700 text-sm mb-3">
            {instruction}
          </p>
        )}

        {/* MIC BUTTON (CENTERED) */}
        <div className="flex justify-center mb-4">
          <button
            onClick={toggleMic}
            disabled={!language}
            className={`p-6 rounded-full text-white shadow-lg transition ${
              listening ? "bg-red-500 animate-pulse" : "bg-green-600"
            }`}
          >
            {listening ? <MicOff size={28} /> : <Mic size={28} />}
          </button>
        </div>

        {/* INPUT */}
        <div className="flex gap-3 max-w-4xl mx-auto">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            disabled={!language}
            placeholder={
              language
                ? "Type your message..."
                : "Select a language first"
            }
            className="flex-1 px-4 py-3 rounded-full border border-green-300 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={sendMessage}
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
