import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { t } from '../utils/translations';

export default function ChatWidget({ onSend, lang }) {
    const [messages, setMessages] = useState([
        { id: 1, type: 'system', sender: '[SYSTEM]', text: t('chat_welcome', lang), timestamp: new Date() }
    ]);
    const [activeTab, setActiveTab] = useState('ALL');
    const [inputText, setInputText] = useState('');
    const chatEndRef = useRef(null);

    // Dynamic fake messages based on lang
    const globalMessages = [
        t('chat_shout_1', lang),
        t('chat_shout_2', lang),
        t('chat_shout_3', lang),
        t('chat_shout_4', lang),
        t('chat_shout_5', lang),
        t('chat_shout_6', lang)
    ];
    const partyMessages = [
        t('chat_p_1', lang),
        t('chat_p_2', lang),
        t('chat_p_3', lang),
        t('chat_p_4', lang),
        t('chat_p_5', lang)
    ];
    const systemMessages = [
        t('chat_s_1', lang),
        t('chat_s_2', lang),
        t('chat_s_3', lang),
        t('chat_s_4', lang)
    ];
    const fakeNames = ["DarkSlayer", "SRME_Pro", "Healer123", "xX_Dragon_Xx", "MerchantKing", "NomadSoul", "DesertRose", "CaravanMaster", "GlavieGod", "IntNuker"];

    // Auto-scroll to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // --- SIMULATED TRAFFIC ---
    useEffect(() => {
        const interval = setInterval(() => {
            if (Math.random() > 0.4) return; // Randomize timing slightly

            const msgTypeIdx = Math.random();
            let newMsg = null;

            if (msgTypeIdx < 0.1) {
                newMsg = {
                    type: 'system',
                    sender: '[SYSTEM]',
                    text: systemMessages[Math.floor(Math.random() * systemMessages.length)]
                };
            } else if (msgTypeIdx < 0.3) {
                newMsg = {
                    type: 'party',
                    sender: fakeNames[Math.floor(Math.random() * fakeNames.length)],
                    text: partyMessages[Math.floor(Math.random() * partyMessages.length)]
                };
            } else {
                newMsg = {
                    type: 'global',
                    sender: `${t('chat_shout_prefix', lang)} ${fakeNames[Math.floor(Math.random() * fakeNames.length)]}`,
                    text: globalMessages[Math.floor(Math.random() * globalMessages.length)]
                };
            }

            if (newMsg) {
                addMessage(newMsg);
            }
        }, 4000);

        return () => clearInterval(interval);
    }, [lang]);

    const addMessage = (msg) => {
        setMessages(prev => {
            const updated = [...prev, { ...msg, id: Date.now() + Math.random(), timestamp: new Date() }];
            if (updated.length > 50) return updated.slice(updated.length - 50);
            return updated;
        });
    };

    const handleSend = (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        addMessage({
            type: 'general',
            sender: 'Merchant',
            text: inputText
        });

        if (onSend) onSend(inputText);
        setInputText('');
    };

    const handleNameClick = (name) => {
        const prefix = t('chat_shout_prefix', lang);
        const cleanName = name.replace(prefix, '').trim();
        setInputText(`${t('chat_whisper_prefix', lang)}${cleanName} `);
    };

    const filteredMessages = messages.filter(m => {
        if (activeTab === 'ALL') return true;
        if (activeTab === 'PARTY') return m.type === 'party';
        if (activeTab === 'TRADE') return m.text.includes('WTS') || m.text.includes('WTB') || m.text.includes('S>') || m.text.includes('B>');
        return true;
    });

    return (
        <div className="absolute bottom-36 left-4 w-96 h-64 flex flex-col pointer-events-auto z-40 font-sans text-xs">
            <div className="flex gap-1 mb-0.5">
                {['ALL', 'PARTY', 'TRADE'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1 rounded-t-lg bg-black/60 border-t border-x ${activeTab === tab ? 'border-[#DAA520] text-[#DAA520]' : 'border-transparent text-stone-500 hover:text-stone-300'} backdrop-blur-md transition-colors font-bold text-[10px]`}
                    >
                        {t(`chat_${tab.toLowerCase()}`, lang)}
                    </button>
                ))}
            </div>

            <div className="flex-1 bg-black/70 backdrop-blur-md rounded-b-lg rounded-tr-lg border border-[#333] flex flex-col overflow-hidden shadow-lg">
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {filteredMessages.map((msg) => (
                        <div key={msg.id} className="leading-tight break-words">
                            <span
                                onClick={() => handleNameClick(msg.sender)}
                                className={`font-bold cursor-pointer hover:underline mr-1
                                    ${msg.type === 'global' ? 'text-[#FFD700]' :
                                        msg.type === 'party' ? 'text-cyan-400' :
                                            msg.type === 'system' ? 'text-red-500' : 'text-white'}
                                `}
                            >
                                {msg.sender}:
                            </span>
                            <span className={`
                                ${msg.type === 'global' ? 'text-[#FFEFB0]' :
                                    msg.type === 'party' ? 'text-cyan-100' :
                                        msg.type === 'system' ? 'text-red-200' : 'text-stone-200'}
                            `}>
                                {msg.text}
                            </span>
                        </div>
                    ))}
                    <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSend} className="p-1 bg-black/40 border-t border-[#333] flex gap-1">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={t('chat_placeholder', lang)}
                        className="flex-1 bg-transparent border border-[#333] rounded px-2 py-1 text-white focus:outline-none focus:border-[#DAA520] placeholder-stone-600"
                    />
                    <button type="submit" className="px-2 bg-[#333] hover:bg-[#DAA520] hover:text-black rounded text-stone-400 transition-colors">
                        <Send size={12} />
                    </button>
                </form>
            </div>
        </div>
    );
}
