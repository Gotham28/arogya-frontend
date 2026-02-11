import { Analytics } from '@vercel/analytics/react';
import Chat from './components/Chat';

function App() {
  return (
    <>
      <Chat />
      <Analytics />
    </>
  );
}

export default App;
