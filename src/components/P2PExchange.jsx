import React, { useState, useEffect } from 'react';
import { Lock, CheckCircle, X, Shield, Coins, AlertCircle, ArrowRightLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '../utils/translations';

export default function P2PExchange({ partnerName, myGold, inventory, onClose, onComplete, lang }) {
    // --- STATE ---
    const [myGoldOffer, setMyGoldOffer] = useState(0);
    const [theirGoldOffer, setTheirGoldOffer] = useState(0);
    const [myItems, setMyItems] = useState([]); // Array of items I'm offering
    const [theirItems, setTheirItems] = useState([]); // Array of items they're offering

    // Status
    const [myLocked, setMyLocked] = useState(false);
    const [theirLocked, setTheirLocked] = useState(false);
    const [myConfirmed, setMyConfirmed] = useState(false);
    const [theirConfirmed, setTheirConfirmed] = useState(false);
    const [tradeStatus, setTradeStatus] = useState('active'); // active, success, failed

    // --- EFFECT: BOT LOGIC ---
    useEffect(() => {
        // 1. Bot adds item
        const t1 = setTimeout(() => {
            setTheirItems([
                { id: 'bot-sword', name: t('rare_sword', lang), icon: '⚔️', type: t('weapon', lang), rarity: 'rare' }
            ]);
        }, 2000);

        // 2. Bot locks
        const t2 = setTimeout(() => {
            setTheirLocked(true);
        }, 4000);

        // 3. Bot confirms (only after lock)
        const t3 = setTimeout(() => {
            setTheirConfirmed(true);
        }, 5000);

        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, [lang]);

    // --- EFFECT: SUCCESS CHECK ---
    useEffect(() => {
        if (myConfirmed && theirConfirmed) {
            setTradeStatus('success');
            // Play animation delay then complete
            setTimeout(() => {
                onComplete({
                    goldCost: myGoldOffer,
                    receivedItems: theirItems,
                    receivedGold: theirGoldOffer
                });
            }, 2000);
        }
    }, [myConfirmed, theirConfirmed]);

    // --- HANDLERS ---
    const handleMyLock = () => {
        if (myLocked) return; // Can't unlock in this simple sim
        if (myGoldOffer > myGold) {
            return;
        }
        setMyLocked(true);
    };

    const handleMyConfirm = () => {
        if (!myLocked) return;
        setMyConfirmed(true);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-[900px] h-[600px] rpg-panel p-0 flex flex-col overflow-hidden relative border-[#DAA520] shadow-[0_0_50px_rgba(218,165,32,0.3)]"
            >
                {/* HEADER */}
                <div className="h-12 bg-gradient-to-b from-[#3e2b22] to-[#1f1511] border-b border-[#5c4033] flex items-center justify-between px-4 relative z-10">
                    <div className="flex items-center gap-2">
                        <ArrowRightLeft className="text-[#DAA520]" />
                        <span className="text-[#DAA520] font-bold text-lg">{t('trade_exchange', lang)}</span>
                    </div>
                    <button onClick={onClose} disabled={myLocked} className="text-stone-400 hover:text-white disabled:opacity-30"><X /></button>
                </div>

                {/* CONTENT SPLIT */}
                <div className="flex-1 flex relative">
                    {/* SUCCESS OVERLAY */}
                    <AnimatePresence>
                        {tradeStatus === 'success' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 z-50 bg-[#DAA520]/20 backdrop-blur-sm flex items-center justify-center"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1.5 }}
                                    className="text-white font-bold text-4xl drop-shadow-[0_0_10px_rgba(0,0,0,1)]"
                                >
                                    {t('trade_successful_upper', lang)}
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* LEFT: ME */}
                    <div className="w-1/2 bg-[#0a0a0a] border-r border-[#333] flex flex-col p-6 relative">
                        <div className="text-center mb-4">
                            <h3 className="text-stone-300 font-bold text-xl">{t('my_offer', lang)}</h3>
                            <div className="text-xs text-stone-500">{t('balance_label', lang, { gold: myGold.toLocaleString() })}</div>
                        </div>

                        {/* MY GRID */}
                        <div className="grid grid-cols-5 gap-2 mb-6">
                            {Array(10).fill(null).map((_, i) => (
                                <div key={i} className="aspect-square bg-[#111] border border-[#333] rounded flex items-center justify-center">
                                </div>
                            ))}
                        </div>

                        {/* GOLD INPUT */}
                        <div className="bg-[#1a120b] p-3 rounded border border-[#333] mb-auto">
                            <label className="text-xs text-[#DAA520] block mb-1">{t('gold_offer_label', lang)}</label>
                            <div className="flex items-center gap-2">
                                <Coins size={16} className="text-[#FFD700]" />
                                <input
                                    type="number"
                                    value={myGoldOffer}
                                    onChange={(e) => !myLocked && setMyGoldOffer(Number(e.target.value))}
                                    disabled={myLocked}
                                    className="bg-transparent border-none text-white w-full focus:outline-none font-mono"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        {/* STATUS INDICATOR */}
                        <div className={`mt-4 p-3 rounded flex items-center justify-center gap-2 transition-colors ${myConfirmed ? 'bg-green-900/50 border border-green-500' : myLocked ? 'bg-yellow-900/30 border border-yellow-700' : 'bg-red-900/20 border border-red-900'}`}>
                            {myConfirmed ? <CheckCircle className="text-green-500" /> : myLocked ? <Lock className="text-yellow-500" /> : <AlertCircle className="text-red-500" />}
                            <span className={`font-bold ${myConfirmed ? 'text-green-400' : myLocked ? 'text-yellow-400' : 'text-red-400'}`}>
                                {myConfirmed ? t('confirmed_label', lang) : myLocked ? t('locked_label', lang) : t('waiting_label', lang)}
                            </span>
                        </div>
                    </div>

                    {/* RIGHT: PARTNER */}
                    <div className="w-1/2 bg-[#0d0d0d] flex flex-col p-6">
                        <div className="text-center mb-4">
                            <h3 className="text-[#DAA520] font-bold text-xl">{partnerName}</h3>
                            <div className="text-xs text-stone-500">Level 45 Hunter</div>
                        </div>

                        {/* THEIR GRID (Bot Items) */}
                        <div className="grid grid-cols-5 gap-2 mb-6">
                            {Array(10).fill(null).map((_, i) => {
                                const item = theirItems[i];
                                return (
                                    <div key={i} className="aspect-square bg-[#111] border border-[#333] rounded flex items-center justify-center text-2xl relative overflow-hidden group">
                                        {item && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="cursor-help"
                                            >
                                                {item.icon}
                                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </motion.div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        {/* THEIR GOLD */}
                        <div className="bg-[#1a120b] p-3 rounded border border-[#333] mb-auto opacity-50">
                            <label className="text-xs text-[#DAA520] block mb-1">{t('gold_offer_label', lang)}</label>
                            <div className="flex items-center gap-2">
                                <Coins size={16} className="text-[#FFD700]" />
                                <span className="font-mono">{theirGoldOffer}</span>
                            </div>
                        </div>

                        {/* STATUS INDICATOR */}
                        <div className={`mt-4 p-3 rounded flex items-center justify-center gap-2 transition-colors ${theirConfirmed ? 'bg-green-900/50 border border-green-500' : theirLocked ? 'bg-yellow-900/30 border border-yellow-700' : 'bg-red-900/20 border border-red-900'}`}>
                            {theirConfirmed ? <CheckCircle className="text-green-500" /> : theirLocked ? <Lock className="text-yellow-500" /> : <AlertCircle className="text-red-500" />}
                            <span className={`font-bold ${theirConfirmed ? 'text-green-400' : theirLocked ? 'text-yellow-400' : 'text-red-400'}`}>
                                {theirConfirmed ? t('confirmed_label', lang) : theirLocked ? t('locked_label', lang) : t('waiting_label', lang)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* BOTTOM CONTROLS */}
                <div className="h-20 bg-[#111] border-t border-[#333] flex items-center justify-center gap-4 p-4 z-20">
                    <button
                        onClick={handleMyLock}
                        disabled={myLocked}
                        className={`px-8 py-2 rounded font-bold transition-all
                            ${myLocked
                                ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                                : 'bg-yellow-800 hover:bg-yellow-700 text-yellow-100'
                            }`}
                    >
                        {myLocked ? t('locked_label', lang) : t('lock_offer_button', lang)}
                    </button>

                    <button
                        onClick={handleMyConfirm}
                        disabled={!myLocked || !theirLocked || myConfirmed}
                        className={`px-8 py-3 rounded font-bold text-lg shadow-lg uppercase tracking-widest transition-all
                            ${!myLocked || !theirLocked
                                ? 'bg-stone-800 text-stone-600 cursor-not-allowed'
                                : myConfirmed
                                    ? 'bg-green-700 text-green-100 cursor-wait'
                                    : 'bg-green-600 hover:bg-green-500 text-white animate-pulse'
                            }`}
                    >
                        {myConfirmed ? t('waiting_button', lang) : t('confirm_trade_button', lang)}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
