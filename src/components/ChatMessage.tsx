<<<<<<< Updated upstream
import { useEffect } from 'react';
import { Message } from '../types/chat';
=======
import { Message } from '../types/chat';
import { useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
>>>>>>> Stashed changes

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
  const [audio] = useState(message.audio_url ? new Audio(message.audio_url) : null);

<<<<<<< Updated upstream
  useEffect(() => {
    if (!isUser && message.audio_url) {
      const audio = new Audio(message.audio_url);
      audio.play().catch(err => console.log('Audio play failed:', err));
=======
  const playAudio = () => {
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
>>>>>>> Stashed changes
    }
  };

  // Detect doctor list message
  const isDoctorList = message.text.includes('Happy to help!') && 
                       (message.text.includes('**General Medicine**') || 
                        message.text.includes('**Gastroenterology**') ||
                        message.text.includes('recommend consulting'));

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="mr-3 flex-shrink-0 mt-2">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-full text-white flex items-center justify-center text-lg font-bold shadow-lg">
            A
          </div>
        </div>
      )}

<<<<<<< Updated upstream
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
=======
      <div className="max-w-2xl w-full">
        {/* Voice Button - Always visible for bot messages with audio */}
        {!isUser && message.audio_url && (
          <button
            onClick={playAudio}
            className="mb-4 flex items-center gap-3 px-5 py-3 bg-teal-100 hover:bg-teal-200 rounded-full text-teal-800 font-semibold transition shadow-md"
          >
            <Volume2 size={20} />
            Play Voice Response
          </button>
        )}
>>>>>>> Stashed changes

        {/* Doctor Cards */}
        {isDoctorList ? (
          <DoctorListCards text={message.text} />
        ) : (
          /* Normal formatted text message */
          <div
            className={`px-6 py-5 rounded-3xl text-base leading-relaxed shadow-md ${
              isUser
                ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white'
                : 'bg-white text-gray-800 border border-gray-200'
            }`}
          >
            <div className="space-y-3">
              {message.text.split('\n').map((line, i) => (
                <p
                  key={i}
                  className="break-words"
                  dangerouslySetInnerHTML={{
                    __html: line
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-teal-700">$1</strong>')
                      .replace(/\n/g, '<br/>'),
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Doctor Cards Component (unchanged from previous)
function DoctorListCards({ text }: { text: string }) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const departments: { name: string; doctors: string[] }[] = [];
  let currentDept = '';

  for (const line of lines) {
    if (line.startsWith('**') && line.endsWith('**')) {
      currentDept = line.slice(2, -2).trim();
      departments.push({ name: currentDept, doctors: [] });
    } else if (line.startsWith('- **Dr.')) {
      const doctorInfo = line
        .replace(/^- \*\*(Dr\..*?)\*\* – /, '$1 – ')
        .replace(/\*\*/g, '');
      if (departments.length > 0) {
        departments[departments.length - 1].doctors.push(doctorInfo);
      }
    }
  }

  return (
    <div className="space-y-6">
      {departments.map((dept) => (
        <div key={dept.name} className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-6 py-4">
            <h3 className="text-xl font-bold">{dept.name}</h3>
          </div>
          <div className="p-5 space-y-4">
            {dept.doctors.map((doctor, i) => {
              const [name, timing] = doctor.split(' – ');
              return (
                <div
                  key={i}
                  className="p-5 bg-gray-50 rounded-xl hover:bg-gray-100 transition border border-gray-200 shadow-sm"
                >
                  <h4 className="font-bold text-gray-900 text-lg">{name}</h4>
                  <p className="text-teal-700 font-medium mt-2">{timing || 'Timing not specified'}</p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
