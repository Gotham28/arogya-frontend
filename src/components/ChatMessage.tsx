import { Message } from '../types/chat';
import { useEffect } from 'react';

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.sender === 'user';

  // Auto-play audio if provided and voice enabled
  useEffect(() => {
    if (!isUser && message.audio_url) {
      const audio = new Audio(message.audio_url);
      audio.play().catch(err => console.log('Audio play failed:', err));
    }
  }, [message, isUser]);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-8`}>
      {/* Bot Avatar */}
      {!isUser && (
        <div className="mr-4 flex-shrink-0">
          <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
            A
          </div>
        </div>
      )}

      <div
        className={`max-w-2xl px-6 py-5 rounded-3xl shadow-lg transition-all duration-300 hover:shadow-xl ${
          isUser
            ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
            : 'bg-gradient-to-r from-green-100 to-emerald-100 text-gray-800 border border-green-200'
        }`}
      >
        <p className="text-lg leading-relaxed whitespace-pre-wrap break-words">
          {message.text}
        </p>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="ml-4 flex-shrink-0">
          <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
            You
          </div>
        </div>
      )}
    </div>
  );
}