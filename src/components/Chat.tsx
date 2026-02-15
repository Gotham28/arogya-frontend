import { useState, useEffect, useRef } from "react";
import { Mic, Send } from "lucide-react";

import ChatMessage from "./ChatMessage";
import TypingIndicator from "./TypingIndicator";
import { Message } from "../types/chat";

const BACKEND_URL = "https://arogya-backend-y7d6.onrender.com";

/* Timing (mobile friendly) */
const MIN_RECORD_TIME = 1200; // ms
const SILENT_FRAMES_LIMIT = 80; // ~4s
const SILENCE_THRESHOLD = 0.018;

export default function Chat() {

  /* ---------------- State ---------------- */

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<"en" | "ml" | null>(null);
  const [isMicActive, setIsMicActive] = useState(false);


  /* ---------------- Refs ---------------- */

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const mediaStream = useRef<MediaStream | null>(null);

  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const dataArray = useRef<Uint8Array | null>(null);

  const animationFrame = useRef<number | null>(null);

  const audioChunks = useRef<Blob[]>([]);

  const silentFrames = useRef(0);
  const isStopping = useRef(false);

  const recordStartTime = useRef(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);


  /* ---------------- Welcome ---------------- */

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


  /* ---------------- Auto Scroll ---------------- */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);


  /* ---------------- Cleanup ---------------- */

  useEffect(() => {
    return () => {
      forceStop();
    };
  }, []);


  /* ---------------- Instruction ---------------- */

  const instruction = (() => {

    if (!language) return "";

    if (!isMicActive) {
      return language === "ml"
        ? "സംസാരിക്കാൻ മൈക്ക് അമർത്തുക"
        : "Press mic to speak";
    }

    return language === "ml"
      ? "സംസാരിച്ച് കഴിഞ്ഞാൽ നിർത്തുക"
      : "Speaking... pause to send";

  })();


  /* ---------------- Start Recording ---------------- */

  const startRecording = async () => {

    if (!language || isLoading) return;

    if (isMicActive) {
      stopRecording();
      return;
    }

    try {

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
        },
      });

      mediaStream.current = stream;


      /* Audio Context */

      audioContext.current = new AudioContext();

      if (audioContext.current.state === "suspended") {
        await audioContext.current.resume();
      }

      const source =
        audioContext.current.createMediaStreamSource(stream);

      analyser.current =
        audioContext.current.createAnalyser();

      analyser.current.fftSize = 2048;

      source.connect(analyser.current);

      dataArray.current =
        new Uint8Array(analyser.current.fftSize);


      /* Recorder */

      const recorder = new MediaRecorder(stream);

      audioChunks.current = [];

      silentFrames.current = 0;
      isStopping.current = false;

      recorder.ondataavailable = e => {
        if (e.data.size > 0) {
          audioChunks.current.push(e.data);
        }
      };

      recorder.onstop = processAudio;


      /* Stabilize mic first */
      await new Promise(r => setTimeout(r, 500));


      recorder.start();

      recordStartTime.current = Date.now();

      mediaRecorder.current = recorder;

      setIsMicActive(true);


      /* Delay silence detection */
      setTimeout(() => {
        detectSilence();
      }, 600);


    } catch (err) {

      console.error(err);
      alert("Microphone permission denied.");

    }
  };


  /* ---------------- Silence Detection ---------------- */

  const detectSilence = () => {

    if (!analyser.current || !dataArray.current) return;

    analyser.current.getByteTimeDomainData(dataArray.current);

    let sum = 0;

    for (let i = 0; i < dataArray.current.length; i++) {
      const v = (dataArray.current[i] - 128) / 128;
      sum += v * v;
    }

    const rms = Math.sqrt(sum / dataArray.current.length);


    if (rms < SILENCE_THRESHOLD) {
      silentFrames.current += 1;
    } else {
      silentFrames.current = 0;
    }


    const elapsed =
      Date.now() - recordStartTime.current;


    if (
      silentFrames.current > SILENT_FRAMES_LIMIT &&
      elapsed > MIN_RECORD_TIME
    ) {
      stopRecording();
      return;
    }


    animationFrame.current =
      requestAnimationFrame(detectSilence);
  };


  /* ---------------- Stop Recording ---------------- */

  const stopRecording = () => {

    if (!mediaRecorder.current) return;
    if (isStopping.current) return;

    isStopping.current = true;

    try {

      mediaRecorder.current.stop();

      mediaStream.current?.getTracks().forEach(t => t.stop());

    } catch (err) {
      console.error(err);
    }


    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    }


    audioContext.current?.close();

    audioContext.current = null;
    analyser.current = null;
    dataArray.current = null;

    mediaRecorder.current = null;
    mediaStream.current = null;

    silentFrames.current = 0;

    setIsMicActive(false);
  };


  /* ---------------- Force Stop ---------------- */

  const forceStop = () => {

    try {

      mediaRecorder.current?.stop();

      mediaStream.current?.getTracks().forEach(t => t.stop());

    } catch {}

    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
    }

    audioContext.current?.close();

    mediaRecorder.current = null;
    mediaStream.current = null;

    animationFrame.current = null;

    setIsMicActive(false);
  };


  /* ---------------- Process Audio ---------------- */

  const processAudio = async () => {

    if (audioChunks.current.length === 0) return;

    const audioBlob = new Blob(audioChunks.current, {
      type: "audio/webm",
    });


    const formData = new FormData();

    formData.append("file", audioBlob, "speech.webm");
    formData.append("language", language!);


    setIsLoading(true);

    try {

      const res = await fetch(`${BACKEND_URL}/speech`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Speech failed");

      const data = await res.json();


      if (data.original?.trim()) {

        /* Show Malayalam */
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "user",
            text: data.original,
            timestamp: new Date(),
          },
        ]);

        /* Send English */
        await sendMessage(data.processed);
      }

    } catch (err) {

      console.error(err);
      alert("Voice recognition failed.");

    } finally {

      setIsLoading(false);

    }
  };


  /* ---------------- Send Message ---------------- */

  const sendMessage = async (textOverride?: string) => {

    const text = (textOverride ?? input).trim();

    if (!text || isLoading || !language) return;


    /* Add only for typing */
    if (!textOverride) {

      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "user",
          text,
          timestamp: new Date(),
        },
      ]);
    }


    setInput("");
    setIsLoading(true);


    try {

      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-ID":
            sessionStorage.getItem("chat_session_id") || "",
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

    } catch (err) {

      console.error(err);

      setMessages(prev => [
        ...prev,
        {
          id: "error",
          sender: "bot",
          text: "Something went wrong.",
          timestamp: new Date(),
        },
      ]);

    } finally {

      setIsLoading(false);

    }
  };


  /* ---------------- UI ---------------- */

  return (
    <div className="flex flex-col h-screen bg-green-50">


      {/* HEADER */}
      <header className="bg-green-700 text-white px-6 py-6 shadow">
        <h1 className="text-3xl font-bold">Arogya</h1>
        <p className="text-green-200">
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


        {/* LANGUAGE */}
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


        {/* Instruction */}
        {language && (
          <p className="text-center text-green-700 text-sm mb-2">
            {instruction}
          </p>
        )}


        {/* MIC */}
        {language && (
          <div className="flex justify-center mb-4">

            <button
              onClick={startRecording}
              disabled={isLoading}
              className={`p-6 rounded-full text-white transition ${
                isMicActive
                  ? "bg-red-500 animate-pulse"
                  : "bg-green-600"
              }`}
            >
              <Mic size={30} />
            </button>

          </div>
        )}


        {/* INPUT */}
        <div className="flex gap-3">

          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={!language || isLoading}
            className="flex-1 px-4 py-3 rounded-full border border-green-300"
            placeholder={
              language
                ? "Type your message…"
                : "Choose language first 😊"
            }
          />

          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || !language || isLoading}
            className="p-4 bg-green-600 text-white rounded-full"
          >
            <Send size={20} />
          </button>

        </div>

      </div>
    </div>
  );
}
