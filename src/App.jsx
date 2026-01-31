import React, { useState } from 'react';
import Launcher from './components/Launcher';
import GameClient from './components/GameClient';

import CustomCursor from './components/CustomCursor';

function App() {
  const [hasLaunched, setHasLaunched] = useState(false);
  const [lang, setLang] = useState('en');

  return (
    <div className="w-screen h-screen overflow-hidden bg-black text-white font-serif relative cursor-none">
      <CustomCursor />
      {!hasLaunched ? (
        <Launcher
          onLaunch={() => setHasLaunched(true)}
          lang={lang}
          setLang={setLang}
        />
      ) : (
        <GameClient
          lang={lang}
          setLang={setLang}
        />
      )}
    </div>
  );
}

export default App;
