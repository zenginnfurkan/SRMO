import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { t } from '../utils/translations';

export default function Launcher({ onLaunch, lang, setLang }) {
    const [muted, setMuted] = useState(false);
    const [username, setUsername] = useState('Merchant');
    const [password, setPassword] = useState('');

    return (
        <div className="relative w-full h-full flex items-center justify-center">
            {/* Background */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-bottom"
                style={{ backgroundImage: "url('/login_background.png')" }}
            >
                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

                {/* Embers Layer */}
                <div
                    className="absolute inset-0 opacity-60 animate-ember-rise pointer-events-none"
                    style={{
                        backgroundImage: "radial-gradient(2px 2px at 20px 30px, #ffaa00, rgba(0,0,0,0)), radial-gradient(2px 2px at 40px 70px, #ff4500, rgba(0,0,0,0)), radial-gradient(2px 2px at 50px 160px, #ffaa00, rgba(0,0,0,0)), radial-gradient(2px 2px at 90px 40px, #ff4500, rgba(0,0,0,0)), radial-gradient(2px 2px at 130px 80px, #ffaa00, rgba(0,0,0,0))",
                        backgroundSize: '200px 200px',
                        backgroundRepeat: 'repeat'
                    }}
                />
            </div>

            {/* Launcher Window */}
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative z-10 w-[450px] rpg-panel p-6"
            >
                <div className="flex flex-col items-center gap-8 relative overflow-hidden z-10">
                    {/* Header */}
                    <div className="text-center z-10">
                        <h1 className="text-6xl font-black uppercase tracking-[0.1em] rpg-title leading-tight drop-shadow-2xl">
                            SRME <span className="text-[#DAA520]">Online</span>
                        </h1>
                        <div className="flex items-center justify-center gap-3 mt-1 opacity-60">
                            <div className="h-px w-16 bg-gradient-to-r from-transparent via-[#b8860b] to-transparent" />
                            <h2 className="text-[10px] text-[#ffeeb0] tracking-[0.8em] font-serif uppercase">
                                {t('launcher_subtitle', lang)}
                            </h2>
                            <div className="h-px w-16 bg-gradient-to-r from-transparent via-[#b8860b] to-transparent" />
                        </div>
                    </div>

                    {/* Inputs */}
                    <div className="w-full space-y-6 z-10 px-4">
                        <div className="group">
                            <label className="block text-[#c5a059] text-xs uppercase tracking-wider mb-2 px-1 font-bold group-focus-within:text-[#ffd700] transition-colors drop-shadow-sm">{t('username', lang)}</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full h-12 px-4 rpg-input-ancient text-lg"
                                />
                            </div>
                        </div>
                        <div className="group">
                            <label className="block text-[#c5a059] text-xs uppercase tracking-wider mb-2 px-1 font-bold group-focus-within:text-[#ffd700] transition-colors drop-shadow-sm">{t('password', lang)}</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full h-12 px-4 rpg-input-ancient text-lg"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-[#5c4033] to-transparent my-2" />

                    {/* Start Button */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onLaunch}
                        className="w-full py-4 rpg-button-epic font-bold tracking-[0.2em] text-xl uppercase rounded shadow-lg"
                    >
                        <span className="relative z-10 drop-shadow-md">{t('start_game', lang)}</span>
                    </motion.button>

                    <div className="text-center text-xs text-stone-500 font-serif italic mt-2 drop-shadow-sm">
                        v.1.0.4 - {t('server', lang)}: <span className="text-green-500 font-bold">{t('cappadocia', lang)}</span>
                    </div>
                </div>

                {/* Language Toggle */}
                <div className="absolute -top-12 left-0 flex gap-2">
                    <button
                        onClick={() => setLang('en')}
                        className={`px-3 py-1 rounded-full border text-[10px] font-bold transition-all ${lang === 'en' ? 'bg-[#DAA520] border-[#DAA520] text-black' : 'bg-black/50 border-stone-700 text-stone-400 hover:text-white'}`}
                    >
                        EN
                    </button>
                    <button
                        onClick={() => setLang('tr')}
                        className={`px-3 py-1 rounded-full border text-[10px] font-bold transition-all ${lang === 'tr' ? 'bg-[#DAA520] border-[#DAA520] text-black' : 'bg-black/50 border-stone-700 text-stone-400 hover:text-white'}`}
                    >
                        TR
                    </button>
                </div>

                {/* Sound Toggle */}
                <button
                    onClick={() => setMuted(!muted)}
                    className="absolute -top-12 right-0 p-2 text-stone-400 hover:text-[#ffd700] transition-colors bg-black/50 border border-stone-700 rounded-full hover:border-[#ffd700] backdrop-blur-sm"
                >
                    {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
            </motion.div>
        </div>
    );
}

