import { useEffect } from 'react';
import { Message } from '../types/chat';

interface ChatMessageProps {
  message: Message;
}

const renderBoldText = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      return <strong key={index} className="font-bold text-green-800">{boldText}</strong>;
    }
    return part;
  });
};

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.sender === 'user';

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
        <div className="text-lg leading-relaxed break-words">
          {renderBoldText(message.text)}
        </div>

        {/* Audio fallback */}
        {!isUser && message.audio_url && (
          <div className="mt-3">
            <audio controls src={message.audio_url} className="w-full" />
          </div>
        )}
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
