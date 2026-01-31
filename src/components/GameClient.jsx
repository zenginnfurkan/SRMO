import React, { useState, useEffect } from 'react';
import { User, ShoppingBag, Truck, Coins, Shield, Scroll, Map as MapIcon, Settings, X, ChevronRight, Anchor, AlertTriangle, Gift, Lock, ArrowUpCircle, Volume2, VolumeX, Music, Music4, Crown, RotateCcw, ArrowRightLeft, Beer, Store as StoreIcon, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '../utils/translations';
import ChatWidget from './ChatWidget';
import P2PExchange from './P2PExchange';

// --- SOUND MANAGER ---
const SoundManager = {
    ctx: null,
    bgmNodes: [],
    noteInterval: null,
    isMuted: false,

    init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) { this.stopBGM(); }
        else { this.startBGM(); }
        return this.isMuted;
    },

    playTone(freq, type, duration, vol = 0.1) {
        if (this.isMuted) return;
        try {
            if (!this.ctx) this.init();
            if (this.ctx.state === 'suspended') this.ctx.resume();
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(vol, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) { }
    },

    // SFX
    playClick() { this.playTone(600, 'sine', 0.05, 0.05); },
    playGold() { this.playTone(1200, 'sine', 0.1, 0.05); setTimeout(() => this.playTone(1600, 'sine', 0.2, 0.05), 50); },
    playError() { this.playTone(150, 'sawtooth', 0.3, 0.05); },
    playTravel() {
        if (this.isMuted) return;
        this.playTone(100, 'sawtooth', 3.0, 0.02);
    },
    playUpgrade() {
        this.playTone(400, 'square', 0.1, 0.05);
        setTimeout(() => this.playTone(600, 'square', 0.1, 0.05), 100);
        setTimeout(() => this.playTone(800, 'square', 0.3, 0.05), 200);
    },
    playWin() {
        if (this.isMuted) return;
        [523, 659, 784, 1046, 784, 1046].forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 'triangle', 0.4, 0.1), i * 200);
        });
    },

    // BGM
    startBGM() {
        if (this.isMuted || !this.ctx) return;
        if (this.bgmNodes.length > 0) return;

        // Drone
        const droneOsc = this.ctx.createOscillator();
        const droneGain = this.ctx.createGain();
        droneOsc.type = 'triangle';
        droneOsc.frequency.value = 73.42;
        droneGain.gain.value = 0.02;
        droneOsc.connect(droneGain);
        droneGain.connect(this.ctx.destination);
        droneOsc.start();
        this.bgmNodes.push(droneOsc, droneGain);

        // Random Notes
        const scale = [147, 156, 185, 196, 220, 233, 277, 294];
        this.noteInterval = setInterval(() => {
            if (this.isMuted) return;
            if (Math.random() < 0.3) {
                const freq = scale[Math.floor(Math.random() * scale.length)];
                this.playTone(freq, 'sine', 1.5, 0.03);
            }
        }, 2000);
    },

    stopBGM() {
        this.bgmNodes.forEach(n => { try { n.stop() } catch (e) { }; try { n.disconnect() } catch (e) { } });
        this.bgmNodes = [];
        if (this.noteInterval) clearInterval(this.noteInterval);
    }
};

export default function GameClient({ lang, setLang }) {
    // --- STATE ---
    const [gold, setGold] = useState(1250);
    const [hp, setHp] = useState(850);
    const [maxHp, setMaxHp] = useState(1000);
    const [mp, setMp] = useState(420);
    const [maxMp, setMaxMp] = useState(500);

    // UI State
    const [isTradeOpen, setIsTradeOpen] = useState(false);
    const [isMapOpen, setIsMapOpen] = useState(false);
    const [isStablesOpen, setIsStablesOpen] = useState(false);
    const [isQuestOpen, setIsQuestOpen] = useState(false);
    const [eventModal, setEventModal] = useState(null);
    const [winModal, setWinModal] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    // Trade Simulation State
    const [tradeRequest, setTradeRequest] = useState(null);
    const [isExchangeOpen, setIsExchangeOpen] = useState(false);

    // Travel State
    const [currentCity, setCurrentCity] = useState('Samarkand');
    const [isTraveling, setIsTraveling] = useState(false);
    const [travelProgress, setTravelProgress] = useState(0);

    // Caravan State
    const [caravanLevel, setCaravanLevel] = useState(1);
    const [maxInventory, setMaxInventory] = useState(10);

    // Quest State
    const [activeQuest, setActiveQuest] = useState(null);

    const caravanTypes = [
        { level: 1, name: t('caravan_donkey', lang), cost: 0, slots: 10, desc: t('caravan_donkey_desc', lang), icon: "/donkey.png", fallbackColor: "bg-stone-600" },
        { level: 2, name: t('caravan_camel', lang), cost: 2000, slots: 20, desc: t('caravan_camel_desc', lang), icon: "/camel_icon.png", fallbackColor: "bg-yellow-700" },
        { level: 3, name: t('caravan_wagon', lang), cost: 10000, slots: 30, desc: t('caravan_wagon_desc', lang), icon: "/wagon_icon.png", fallbackColor: "bg-red-900" },
        { level: 4, name: t('caravan_elephant', lang), cost: 50000, slots: 50, desc: t('caravan_elephant_desc', lang), icon: "/elephant_icon.png", fallbackColor: "bg-purple-900" }
    ];

    const currentCaravan = caravanTypes.find(c => c.level === caravanLevel);

    const [inventory, setInventory] = useState(Array(50).fill(null));
    const [floatingText, setFloatingText] = useState([]);
    const [systemLog, setSystemLog] = useState([
        { id: 1, text: t('log_welcome', lang), type: "info" }
    ]);
    const [completedQuests, setCompletedQuests] = useState(0);
    const [availableQuests, setAvailableQuests] = useState([]);
    const [travelFlavorText, setTravelFlavorText] = useState("");

    // Economy State
    const [marketEvents, setMarketEvents] = useState([]); // [{id, text, type, multipliers: {Item: 1.5}}]
    const [haggledStatus, setHaggledStatus] = useState({}); // { itemId: { adjustedMultiplier: 1.0, attempted: false } }
    const [isTavernOpen, setIsTavernOpen] = useState(false);

    // Merchant Mode State
    const [myStall, setMyStall] = useState([null, null, null, null]); // 4 slots: { item, price }
    const [isStallOpen, setIsStallOpen] = useState(false);
    const [bazaarStalls, setBazaarStalls] = useState([]); // Array of { id, playerName, title, inventory: [...] }
    const [isBazaarOpen, setIsBazaarOpen] = useState(false);
    const [selectedStall, setSelectedStall] = useState(null); // To view specific card shops

    const cities = {
        'Chang\'an': {
            id: 'changan',
            name: t('changan', lang),
            desc: t('changan_desc', lang),
            bg: '/changan_bg.png',
            x: '85%', y: '40%',
            marketMultipliers: { [t('raw_silk', lang)]: 0.5, [t('exotic_spices', lang)]: 1.2, [t('ceramics', lang)]: 0.8 }
        },
        'Samarkand': {
            id: 'samarkand',
            name: t('samarkand', lang),
            desc: t('samarkand_desc', lang),
            bg: '/market_bg.png',
            x: '50%', y: '55%',
            marketMultipliers: { [t('raw_silk', lang)]: 1.0, [t('exotic_spices', lang)]: 1.0, [t('ceramics', lang)]: 1.0 }
        },
        'Constantinople': {
            id: 'constantinople',
            name: t('constantinople', lang),
            desc: t('constantinople_desc', lang),
            bg: '/constantinople_bg.png',
            x: '15%', y: '35%',
            marketMultipliers: { [t('raw_silk', lang)]: 4.0, [t('exotic_spices', lang)]: 0.7, [t('ceramics', lang)]: 1.5 }
        }
    };

    const baseItems = [
        { id: 101, name: t('raw_silk', lang), basePrice: 150, type: "Material", icon: "🕸️" },
        { id: 102, name: t('exotic_spices', lang), basePrice: 350, type: "Trade Good", icon: "🌶️" },
        { id: 103, name: t('ceramics', lang), basePrice: 800, type: "Trade Good", icon: "🏺" },
    ];

    const getPrice = (item) => {
        const city = cities[currentCity];
        const cityMultiplier = city.marketMultipliers[item.name] || 1.0;

        // Event Multiplier
        let eventMultiplier = 1.0;
        marketEvents.forEach(event => {
            if (event.multipliers && event.multipliers[item.name]) {
                eventMultiplier *= event.multipliers[item.name];
            }
        });

        // Haggle Multiplier
        let haggleMultiplier = 1.0;
        if (haggledStatus[item.id]) {
            haggleMultiplier = haggledStatus[item.id].adjustedMultiplier;
        }

        return Math.floor(item.basePrice * cityMultiplier * eventMultiplier * haggleMultiplier);
    };

    // --- PERSISTENCE ---
    useEffect(() => {
        const savedData = localStorage.getItem('silkroad_save');
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                setGold(parsed.gold);
                setCurrentCity(parsed.currentCity);
                setCaravanLevel(parsed.caravanLevel);
                setMaxInventory(parsed.maxInventory);
                setInventory(parsed.inventory || Array(50).fill(null));
                setActiveQuest(parsed.activeQuest || null);
            } catch (e) {
                console.error(e);
            }
        }
    }, []);

    useEffect(() => {
        const dataToSave = { gold, currentCity, caravanLevel, maxInventory, inventory, activeQuest, completedQuests, availableQuests };
        localStorage.setItem('silkroad_save', JSON.stringify(dataToSave));
    }, [gold, currentCity, caravanLevel, inventory, activeQuest, completedQuests, availableQuests]);

    // --- TRADE SIMULATION LOGIC ---
    useEffect(() => {
        // Trigger simulated trade request after 10s
        const timer = setTimeout(() => {
            SoundManager.playClick(); // Alert sound
            setTradeRequest({ sender: 'ShadowHunter' });
        }, 10000);
        return () => clearTimeout(timer);
    }, []);

    const handleAcceptTrade = () => {
        setTradeRequest(null);
        setIsExchangeOpen(true);
        // Play open sound
        SoundManager.playClick();
    };

    const handleTradeComplete = ({ goldCost, receivedItems, receivedGold }) => {
        // 1. Deduct Gold
        setGold(g => g - goldCost + receivedGold);

        // 2. Add Items
        const newInv = [...inventory];
        receivedItems.forEach(item => {
            const emptyIdx = newInv.findIndex((slot, i) => slot === null && i < maxInventory);
            if (emptyIdx !== -1) {
                newInv[emptyIdx] = { ...item, uniqueId: Date.now() + Math.random() };
                addLog(t('log_received', lang, { name: item.name }), "success");
            } else {
                addLog(t('log_inv_full', lang), "error");
            }
        });
        setInventory(newInv);

        setIsExchangeOpen(false);
        SoundManager.playGold();
        addLog(t('log_trade_success', lang, { gold: goldCost }), "success");
    };

    // --- LOGIC ---
    const resetGame = () => {
        if (confirm("Are you sure you want to reset your progress?")) {
            localStorage.removeItem('silkroad_save');
            window.location.reload();
        }
    };

    const toggleMute = () => {
        const muted = SoundManager.toggleMute();
        setIsMuted(muted);
    };

    const addLog = (text, type = "info") => {
        setSystemLog(prev => {
            const lastLog = prev[prev.length - 1];
            if (lastLog && lastLog.text === text) {
                // Determine new count
                const currentCount = lastLog.count || 1;
                const newCount = currentCount + 1;

                // Return new array with updated count on last item
                const newLogArray = [...prev];
                newLogArray[prev.length - 1] = { ...lastLog, count: newCount, id: Date.now() }; // Update ID to re-trigger highlight if needed
                return newLogArray;
            } else {
                const logId = `log-${Date.now()}-${Math.random()}`;
                const newLog = [...prev, { id: logId, text, type, count: 1 }];
                if (newLog.length > 8) return newLog.slice(newLog.length - 8);
                return newLog;
            }
        });
    };

    const addFloatingText = (text, x, y, color, size = 'xl') => {
        const id = Date.now() + Math.random();
        // Add random jitter to position to prevent stacking
        const jitterX = (Math.random() - 0.5) * 30; // +/- 15px
        const jitterY = (Math.random() - 0.5) * 30;

        setFloatingText(prev => [...prev, { id, text, x: x - 20 + jitterX, y: y - 40 + jitterY, color, size }]);
        setTimeout(() => {
            setFloatingText(prev => prev.filter(ft => ft.id !== id));
        }, 1500);
    };

    const handleBuyUpgrade = (upgrade) => {
        if (caravanLevel >= upgrade.level) return;
        if (gold >= upgrade.cost) {
            setGold(g => g - upgrade.cost);
            setCaravanLevel(upgrade.level);
            setMaxInventory(upgrade.slots);
            SoundManager.playUpgrade();
            addLog(t('log_upgrade', lang, { name: upgrade.name, slots: upgrade.slots }), "success");
        } else {
            SoundManager.playError();
            addLog(t('log_no_gold', lang), "error");
        }
    };

    const handleListStallItem = (invIdx, price) => {
        const item = inventory[invIdx];
        if (!item) return;

        const emptyStallIdx = myStall.findIndex(slot => slot === null);
        if (emptyStallIdx === -1) {
            addLog(t('log_no_space', lang), "error");
            return;
        }

        const newStall = [...myStall];
        newStall[emptyStallIdx] = { ...item, price: Number(price), invIdx };

        const newInv = [...inventory];
        newInv[invIdx] = null;

        setMyStall(newStall);
        setInventory(newInv);
        SoundManager.playClick();
        addLog(t('log_listed', lang, { name: item.name, price: price }), "info");
    };

    const handleRemoveStallItem = (stallIdx) => {
        const stallItem = myStall[stallIdx];
        if (!stallItem) return;

        const emptyInvIdx = inventory.findIndex(slot => slot === null && slot < maxInventory);
        if (emptyInvIdx === -1) {
            addLog(t('log_inv_full', lang), "error");
            return;
        }

        const newInv = [...inventory];
        newInv[emptyInvIdx] = { ...stallItem };
        delete newInv[emptyInvIdx].price; // Remove price when back in inventory

        const newStall = [...myStall];
        newStall[stallIdx] = null;

        setInventory(newInv);
        setMyStall(newStall);
        SoundManager.playClick();
    };

    const generateBazaarStalls = () => {
        const names = ["ShadowWolf", "GoldDigger", "SilkMaster", "SultanTrade", "NomadKing", "SilentDagger", "CaravanQueen", "OldMerchant"];
        const titles = ["Best Prices!", "Rare Finds", "Quick Sale", "AFK / Buying Gold", "Discounted Spices", "High Quality Silk"];

        const newStalls = [];
        const stallCount = 5 + Math.floor(Math.random() * 4); // 5-8 stalls

        for (let i = 0; i < stallCount; i++) {
            const stallItems = [];
            const itemTypeCount = 2 + Math.floor(Math.random() * 2); // 2-3 items

            for (let j = 0; j < itemTypeCount; j++) {
                const baseItem = baseItems[Math.floor(Math.random() * baseItems.length)];
                // Price between 90% and 150% of base
                const price = Math.floor(baseItem.basePrice * (0.9 + Math.random() * 0.6));
                stallItems.push({ ...baseItem, price, id: Date.now() + Math.random() });
            }

            newStalls.push({
                id: i,
                playerName: names[Math.floor(Math.random() * names.length)],
                title: titles[Math.floor(Math.random() * titles.length)],
                inventory: stallItems
            });
        }
        setBazaarStalls(newStalls);
    };

    const handleBuyFromBazaar = (stall, item) => {
        if (!item || !stall) return;
        if (gold < item.price) {
            addLog(t('log_no_gold', lang), "error");
            return;
        }
        const emptyInvIdx = inventory.findIndex((s, i) => s === null && i < maxInventory);
        if (emptyInvIdx === -1) {
            addLog(t('log_inv_full', lang), "error");
            return;
        }

        setGold(g => g - item.price);
        const newInv = [...inventory];
        // Ensure item properties are preserved for rendering
        newInv[emptyInvIdx] = {
            ...item,
            uniqueId: Date.now() + Math.random(),
            boughtAt: item.price,
            name: item.name,
            icon: item.icon
        };
        setInventory(newInv);

        // Remove item from bot's stall
        setBazaarStalls(prev => prev.map(s =>
            s.id === stall.id
                ? { ...s, inventory: s.inventory.filter(i => i.id !== item.id) }
                : s
        ));

        SoundManager.playGold();
        addLog(t('log_bought', lang, { name: item.name, player: stall.playerName, price: item.price }), "success");
    };

    const handleMakeOffer = (stall, item, offerPrice) => {
        if (!item || !stall || isNaN(offerPrice) || offerPrice <= 0) return;

        // Random chance based on how close the offer is to the price
        const priceRatio = offerPrice / item.price;
        const successChance = priceRatio > 0.9 ? 0.7 : priceRatio > 0.75 ? 0.4 : 0.1;

        if (Math.random() < successChance) {
            addLog(t('log_offer_accepted', lang, { player: stall.playerName, offer: offerPrice }), "success");
            handleBuyFromBazaar(stall, { ...item, price: offerPrice });
        } else {
            addLog(t('log_offer_rejected', lang, { player: stall.playerName }), "error");
            SoundManager.playError();
        }
    };

    // Passive Sales Logic
    useEffect(() => {
        const interval = setInterval(() => {
            const activeSlots = myStall.map((s, i) => s ? i : null).filter(i => i !== null);
            if (activeSlots.length === 0) return;

            const targetIdx = activeSlots[Math.floor(Math.random() * activeSlots.length)];
            const stallItem = myStall[targetIdx];

            // Simulation check: if price is <= 120% of base (modified by city/event)
            const currentMarketPrice = getPrice(stallItem);
            const isReasonable = stallItem.price <= currentMarketPrice * 1.25;

            if (isReasonable && Math.random() > 0.5) {
                const botNames = ["DragonSlayer", "TraderJoe", "MysticNomad", "BladeMaster"];
                const buyer = botNames[Math.floor(Math.random() * botNames.length)];

                setGold(g => g + stallItem.price);
                setMyStall(prev => {
                    const next = [...prev];
                    next[targetIdx] = null;
                    return next;
                });

                SoundManager.playGold();
                addLog(t('log_sold', lang, { name: stallItem.name, buyer: buyer, price: stallItem.price }), "gain");
                addFloatingText(`+${stallItem.price} G`, window.innerWidth / 2, window.innerHeight / 2, '#FFD700', '2xl');
            }
        }, 8000); // Check every 8 seconds

        return () => clearInterval(interval);
    }, [myStall, currentCity, marketEvents]); // Re-run if market conditions change

    const startTravel = (targetCityKey) => {
        const travelCost = 50;
        if (gold < travelCost) {
            SoundManager.playError();
            addLog(t('log_need_gold_travel', lang), "error");
            return;
        }
        if (targetCityKey === currentCity) return;

        SoundManager.playTravel();
        setGold(g => g - travelCost);
        setIsMapOpen(false);
        setIsTradeOpen(false);
        setIsStablesOpen(false);
        setIsTraveling(true);
        setTravelProgress(0);
        setEventModal(null);
        setTravelFlavorText(t('travel_preparing', lang));

        addLog(t('log_departing', lang, { city: targetCityKey }), "info");

        let progress = 0;
        const flavorTexts = [
            t('travel_dunes', lang),
            t('travel_river', lang),
            t('travel_oasis', lang),
            t('travel_nomads', lang),
            t('travel_walls', lang)
        ];

        const interval = setInterval(() => {
            progress += 1;
            setTravelProgress(progress);

            // Cycle flavor text every 20%
            if (progress % 20 === 0) {
                const textIdx = Math.floor(progress / 20) % flavorTexts.length;
                setTravelFlavorText(flavorTexts[textIdx]);
            }

            if (progress >= 100) {
                clearInterval(interval);
                setIsTraveling(false);
                triggerRandomEvent(targetCityKey);
                setCurrentCity(targetCityKey);
                checkQuestCompletion(targetCityKey);
                generateMarketEvents(targetCityKey);
                generateBazaarStalls();
            }
        }, 50);
    };

    const generateQuest = (city) => {
        // 50% chance to generate a quest if none available
        if (Math.random() > 0.5) return;

        const items = ['Raw Silk', 'Exotic Spices', 'Ceramics'];
        const targetItem = items[Math.floor(Math.random() * items.length)];
        const qty = Math.floor(Math.random() * 5) + 3;
        const reward = qty * 400 + 1000;
        const otherCities = Object.keys(cities).filter(c => c !== city);
        const targetCity = otherCities[Math.floor(Math.random() * otherCities.length)];

        const newQuest = {
            id: Date.now() + Math.random(),
            title: `Supply Run: ${targetCity}`,
            desc: `The Governor of ${targetCity} is demanding ${qty} ${targetItem}.`,
            item: targetItem,
            quantity: qty,
            targetCity: targetCity,
            reward: reward
        };

        setAvailableQuests(prev => [...prev, newQuest]);
        SoundManager.playClick(); // Subtle notification sound
        // Don't log every generation, just show UI indicator
    };

    const generateMarketEvents = (city) => {
        // Reset haggle status on travel
        setHaggledStatus({});

        const possibleEvents = [
            { text: "Silk Shortage in the West! Silk prices up.", type: 'shortage', multipliers: { "Raw Silk": 2.0 } },
            { text: "Bountiful Spices harvest nearby. Prices low.", type: 'surplus', multipliers: { "Exotic Spices": 0.5 } },
            { text: "Ceramics festival in town!", type: 'event', multipliers: { "Ceramics": 1.5 } },
            { text: "War brewing! Weapons and supplies needed.", type: 'war', multipliers: { "Raw Silk": 1.2, "Ceramics": 1.2 } },
            { text: "Bandits block trade routes. Spices scarce.", type: 'bad', multipliers: { "Exotic Spices": 1.5 } }
        ];

        // 60% chance of an event
        if (Math.random() > 0.4) {
            const event = possibleEvents[Math.floor(Math.random() * possibleEvents.length)];
            setMarketEvents([{ ...event, id: Date.now() }]);
            // Log is added when checking tavern
        } else {
            setMarketEvents([]);
        }
    };

    const handleHaggle = (item) => {
        if (haggledStatus[item.id] && haggledStatus[item.id].attempted) return;

        const isSuccess = Math.random() < 0.4; // 40% chance
        let newMultiplier = 1.0;

        if (isSuccess) {
            newMultiplier = 0.8; // 20% discount
            SoundManager.playGold();
            addLog("Haggle successful! 20% discount.", "success");
        } else {
            newMultiplier = 1.1; // 10% penalty
            SoundManager.playError();
            addLog("Merchant offended! Price +10%.", "error");
        }

        setHaggledStatus(prev => ({
            ...prev,
            [item.id]: { adjustedMultiplier: newMultiplier, attempted: true }
        }));
    };

    const checkQuestCompletion = (city) => {
        // Generate new Available Quests on arrival
        if (availableQuests.length < 3) {
            generateQuest(city);
        }

        if (activeQuest && activeQuest.targetCity === city) {
            const requiredItem = activeQuest.item;
            const requiredQty = activeQuest.quantity;

            // Check inventory
            const itemRenderers = inventory.filter(slot => slot && slot.name === requiredItem);

            if (itemRenderers.length >= requiredQty) {
                // Complete Quest
                // Remove items
                let remainingToRemove = requiredQty;
                const newInv = [...inventory];
                for (let i = 0; i < newInv.length; i++) {
                    if (remainingToRemove <= 0) break;
                    if (newInv[i] && newInv[i].name === requiredItem) {
                        newInv[i] = null;
                        remainingToRemove--;
                    }
                }
                setInventory(newInv);

                // Reward
                const xp = 100;
                setGold(g => g + activeQuest.reward);
                setCompletedQuests(c => c + 1);
                setActiveQuest(null);

                SoundManager.playWin();
                setWinModal({ type: 'quest', title: 'Quest Complete', reward: activeQuest.reward });
                addFloatingText("QUEST COMPLETE!", window.innerWidth / 2, window.innerHeight / 2, '#FFD700', '3xl');
                addLog(`Quest Completed! Reward: ${activeQuest.reward} G`, "success");
            } else {
                addLog(t('log_quest_hint', lang, { qty: requiredQty, item: requiredItem }), "info");
            }
        }
    };

    const handleAcceptQuest = (quest) => {
        setActiveQuest(quest);
        setAvailableQuests(prev => prev.filter(q => q.id !== quest.id));
        SoundManager.playClick();
        addLog(t('log_accepted_quest', lang, { city: quest.targetCity }), "info");
    };

    // --- WIN CONDITION CHECK ---
    useEffect(() => {
        if (!winModal && caravanLevel === 4 && gold >= 100000 && completedQuests >= 5) {
            setWinModal(true);
            SoundManager.playWin();
        }
    }, [gold, caravanLevel, completedQuests]);

    const triggerRandomEvent = (city) => {
        const roll = Math.random();
        if (roll < 0.3) {
            const loss = Math.floor(gold * 0.1);
            setGold(g => Math.floor(g * 0.9));
            SoundManager.playError();
            setEventModal({ title: t('event_bandits_title', lang), message: t('event_bandits_msg', lang, { gold: loss }), effect: `-${loss} G`, type: 'bad' });
            addLog(t('log_bandits', lang, { gold: loss }), "error");
        } else if (roll < 0.5) {
            const bonus = 75;
            setGold(g => g + bonus);
            SoundManager.playGold();
            setEventModal({ title: t('event_oasis_title', lang), message: t('event_oasis_msg', lang), effect: `+${bonus} G`, type: 'good' });
            addLog(t('log_found_gold', lang, { gold: bonus }), "gain");
        } else {
            setEventModal({ title: t('event_safe_title', lang), message: t('event_safe_msg', lang, { city: city }), effect: t('event_standard_travel', lang), type: 'neutral' });
            addLog(t('log_safe_arrival', lang, { city: city }), "info");
        }
    };

    return (
        <div className="w-full h-full text-white relative flex flex-col font-serif select-none overflow-hidden">

            {/* CHAT WIDGET */}
            <ChatWidget onSend={(msg) => addLog(t('chat_merchant_says', lang) + msg)} lang={lang} />

            {/* P2P EXCHANGE MODAL */}
            <AnimatePresence>
                {isExchangeOpen && (
                    <P2PExchange
                        partnerName="ShadowHunter"
                        myGold={gold}
                        inventory={inventory}
                        onClose={() => setIsExchangeOpen(false)}
                        onComplete={handleTradeComplete}
                        lang={lang}
                    />
                )}
            </AnimatePresence>

            {/* TRADE REQUEST NOTIFICATION */}
            <AnimatePresence>
                {tradeRequest && !isExchangeOpen && (
                    <div className="absolute top-24 right-4 z-[90] pointer-events-auto">
                        <motion.div
                            initial={{ x: 100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 100, opacity: 0 }}
                            className="bg-black/80 backdrop-blur border border-[#DAA520] p-4 rounded shadow-2xl w-80"
                        >
                            <h3 className="text-[#DAA520] font-bold text-lg mb-2 flex items-center gap-2">
                                <ArrowRightLeft size={18} /> Trade Request
                            </h3>
                            <p className="text-sm text-stone-300 mb-4">
                                <span className="text-white font-bold">{tradeRequest.sender}</span> wants to trade with you.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleAcceptTrade}
                                    className="flex-1 bg-green-700 hover:bg-green-600 text-white text-sm font-bold py-2 rounded transition-colors"
                                >
                                    ACCEPT
                                </button>
                                <button
                                    onClick={() => setTradeRequest(null)}
                                    className="flex-1 bg-red-900/50 hover:bg-red-900 text-stone-300 hover:text-white text-sm font-bold py-2 rounded transition-colors"
                                >
                                    DECLINE
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* WIN MODAL */}
            <AnimatePresence>
                {winModal && !winModal.type && (
                    <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-[600px] rpg-panel p-8 text-center flex flex-col items-center gap-6 border-[#FFD700] shadow-[0_0_50px_rgba(255,215,0,0.5)]"
                        >
                            <Crown size={80} className="text-[#FFD700] animate-bounce" />
                            <h1 className="text-5xl rpg-title text-[#FFD700] uppercase tracking-widest">Merchant King</h1>
                            <p className="text-xl text-stone-300">
                                You have amassed a fortune and command the greatest caravan on the Silk Road.
                            </p>
                            <div className="flex gap-4 mt-4">
                                <button onClick={() => setWinModal(false)} className="px-8 py-3 rpg-button-tactile bg-[#DAA520] text-black hover:bg-white text-xl font-bold">Continue Playing</button>
                                <button onClick={resetGame} className="px-8 py-3 rpg-button-tactile hover:text-red-400">Restart Legacy</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* QUEST COMPLETION MODAL */}
            <AnimatePresence>
                {winModal && winModal.type === 'quest' && (
                    <div className="absolute inset-0 z-[140] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-[400px] rpg-panel p-6 text-center flex flex-col items-center gap-4 border-green-700"
                        >
                            <Gift size={48} className="text-green-500" />
                            <h2 className="text-3xl rpg-title text-green-400">Quest Complete!</h2>
                            <p className="text-stone-300">The Governor is pleased.</p>
                            <div className="text-2xl font-bold text-[#FFD700] py-2">+{winModal.reward} Gold</div>
                            <button onClick={() => setWinModal(false)} className="px-8 py-2 rpg-button-tactile">Excellent</button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* BACKGROUND */}
            <div className="absolute inset-0 z-0 bg-black">
                <AnimatePresence mode='wait'>
                    <motion.img
                        key={currentCity}
                        src={cities[currentCity].bg}
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                        className="w-full h-full object-cover object-bottom"
                        alt="City Background"
                    />
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
            </div>

            {/* TRAVEL LOADING */}
            <AnimatePresence>
                {isTraveling && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[100] bg-[#1a120b] flex flex-col items-center justify-center pointer-events-auto"
                    >
                        {/* Background Map Overlay */}
                        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: `url('/world_map.png')`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'sepia(1)' }} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black pointer-events-none" />

                        <div className="relative z-10 flex flex-col items-center w-full max-w-4xl">
                            <h2 className="text-4xl rpg-title text-[#FFD700] mb-2 animate-pulse tracking-widest text-shadow">TRAVELING</h2>
                            <p className="text-stone-400 italic mb-12 h-6 text-sm">{travelFlavorText}</p>

                            <div className="w-full relative h-48 overflow-hidden border-y border-[#DAA520]/30 bg-black/40 backdrop-blur-sm mb-8">
                                <div className="absolute bottom-0 w-full h-1/4 bg-[#2a1f16]" />
                                {/* Moving Caravan */}
                                <motion.div
                                    className="absolute bottom-4"
                                    style={{ left: `${travelProgress}%`, x: '-50%' }}
                                    animate={{ y: [0, -5, 0] }}
                                    transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
                                >
                                    <img
                                        src={currentCaravan.icon}
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                        className="h-32 drop-shadow-lg"
                                        alt="Caravan"
                                    />
                                    <div className="hidden">🐪</div>
                                </motion.div>
                            </div>

                            <div className="w-[500px] h-4 bg-[#111] border border-[#333] rounded-full overflow-hidden relative shadow-[0_0_15px_rgba(218,165,32,0.2)]">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-[#8B6914] to-[#FFD700]"
                                    style={{ width: `${travelProgress}%` }}
                                    transition={{ ease: "linear" }}
                                />
                            </div>
                            <div className="mt-2 text-[#DAA520] font-mono text-xs">{travelProgress}%</div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* HEADER */}
            <div className="relative z-30 h-16 flex items-start pt-2 px-6 gap-6 pointer-events-none">
                <div className="relative group pointer-events-auto cursor-pointer">
                    <div className="w-16 h-16 bg-[#111] border-[3px] border-[#DAA520] rounded-lg rotate-45 transform origin-center overflow-hidden shadow-[0_0_10px_#DAA520] group-hover:shadow-[0_0_20px_#DAA520] transition-all">
                        <div className="w-full h-full -rotate-45 scale-150 flex items-center justify-center bg-stone-800">
                            <User size={32} className="text-stone-400" />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-1 w-64 pt-2 pointer-events-auto">
                    <div className="text-[#DAA520] font-bold text-sm tracking-widest drop-shadow-md text-shadow uppercase">{cities[currentCity].name}</div>
                    <div className="relative h-2 bg-black/50 border border-stone-600 rounded-sm">
                        <motion.div className="h-full bg-gradient-to-r from-[#8B0000] to-[#FF0000]" initial={{ width: `${(hp / maxHp) * 100}%` }} />
                    </div>
                </div>

                <div className="flex-1 flex flex-col items-center pt-0 pointer-events-auto">
                    <div className="bg-black/80 border border-[#DAA520]/50 px-6 py-1.5 rounded-xl backdrop-blur-md shadow-lg flex flex-col items-center gap-0.5 transform scale-90 origin-top">
                        <div className="text-[#DAA520] text-[10px] items-center gap-2 uppercase tracking-[0.2em] font-bold border-b border-[#DAA520]/30 pb-1 mb-1 w-full text-center flex justify-center">
                            <Crown size={12} /> {t('path_to_king', lang)}
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                            <div className={`flex items-center gap-2 ${caravanLevel === 4 ? "text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]" : "text-stone-400"}`}>
                                <div className="relative">
                                    <div className={`absolute -inset-1 rounded-full ${caravanLevel === 4 ? "bg-green-500/20 blur-sm" : ""}`} />
                                    <span className="relative text-lg">🐘</span>
                                </div>
                                <div className="flex flex-col leading-none">
                                    <span className="text-[10px] uppercase font-bold text-stone-500">{t('caravan', lang)}</span>
                                    <span className="font-bold">{currentCaravan.name}</span>
                                </div>
                            </div>

                            <div className="w-[1px] h-6 bg-[#DAA520]/30" />

                            <div className={`flex items-center gap-2 ${gold >= 100000 ? "text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]" : "text-stone-400"}`}>
                                <div className="relative">
                                    <div className={`absolute -inset-1 rounded-full ${gold >= 100000 ? "bg-green-500/20 blur-sm" : ""}`} />
                                    <Coins size={16} />
                                </div>
                                <div className="flex flex-col leading-none">
                                    <span className="text-[10px] uppercase font-bold text-stone-500">{t('gold', lang)}</span>
                                    <span className="font-bold">{Math.floor(gold / 1000)}k / 100k</span>
                                </div>
                            </div>

                            <div className="w-[1px] h-6 bg-[#DAA520]/30" />

                            <div className={`flex items-center gap-2 ${completedQuests >= 5 ? "text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]" : "text-stone-400"}`}>
                                <div className="relative">
                                    <div className={`absolute -inset-1 rounded-full ${completedQuests >= 5 ? "bg-green-500/20 blur-sm" : ""}`} />
                                    <Scroll size={16} />
                                </div>
                                <div className="flex flex-col leading-none">
                                    <span className="text-[10px] uppercase font-bold text-stone-500">{t('contracts', lang)}</span>
                                    <span className="font-bold">{completedQuests} / 5</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Volume & Reset */}
                <div className="pointer-events-auto flex gap-2">
                    <button onClick={resetGame} className="p-2 bg-black/60 border border-red-900 rounded-lg hover:border-red-500 transition-colors text-red-500" title="Reset Save">
                        <RotateCcw size={20} />
                    </button>
                    <button onClick={toggleMute} className="p-2 bg-black/60 border border-stone-600 rounded-lg hover:border-[#DAA520] transition-colors">
                        {isMuted ? <VolumeX size={20} className="text-stone-500" /> : <Music size={20} className="text-[#DAA520] animate-pulse" />}
                    </button>
                </div>

                <div className="flex items-center gap-3 px-6 py-2 bg-black/60 border border-[#8B6914] rounded-lg shadow-lg pointer-events-auto backdrop-blur-md">
                    <Coins size={20} className="text-[#FFD700]" />
                    <span className="text-xl text-[#FFD700] font-mono font-bold tracking-wider">{gold.toLocaleString()}</span>
                </div>
            </div>

            {/* CENTRAL AREA */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-start pt-24 gap-6">
                <motion.div
                    onClick={() => { setIsStallOpen(true); SoundManager.playClick(); }}
                    className="relative group cursor-pointer pointer-events-auto"
                    whileHover={{ scale: 1.05 }}
                >
                    <img src="/merchant.png" className="h-[320px] object-contain rounded-full drop-shadow-[0_10px_20px_rgba(218,165,32,0.3)]" />
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/80 border border-[#DAA520] px-6 py-2 text-[#DAA520] rounded-full font-bold shadow-lg group-hover:bg-[#DAA520] group-hover:text-black transition-all whitespace-nowrap">
                        {t('my_stall', lang)}
                    </div>
                    {myStall.some(s => s !== null) && (
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[10px] px-3 py-1 rounded-full font-bold animate-pulse">
                            {t('online', lang).toUpperCase()}
                        </div>
                    )}
                </motion.div>

                <motion.button
                    onClick={() => { setIsBazaarOpen(true); SoundManager.playClick(); }}
                    className="px-12 py-4 bg-gradient-to-r from-[#8B6914] to-[#DAA520] text-black font-black text-xl rounded-lg shadow-[0_0_20px_rgba(218,165,32,0.4)] hover:scale-105 hover:brightness-110 active:scale-95 transition-all pointer-events-auto border-2 border-white/20 uppercase tracking-widest"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                >
                    {t('visit_bazaar', lang)}
                </motion.button>
            </div>

            {/* MODALS */}
            <AnimatePresence>
                {isBazaarOpen && <BazaarModal stalls={bazaarStalls} onClose={() => setIsBazaarOpen(false)} onVisitStall={(stall) => setSelectedStall(stall)} lang={lang} />}
                {selectedStall && <BazaarStallModal stall={selectedStall} onClose={() => setSelectedStall(null)} onBuy={handleBuyFromBazaar} onOffer={handleMakeOffer} gold={gold} lang={lang} />}
                {isStallOpen && <MyStallModal inventory={inventory} myStall={myStall} onList={handleListStallItem} onRemove={handleRemoveStallItem} onClose={() => setIsStallOpen(false)} maxInventory={maxInventory} getPrice={getPrice} lang={lang} />}
                {isTavernOpen && <TavernModal activeEvents={marketEvents} onClose={() => setIsTavernOpen(false)} lang={lang} />}
                {isStablesOpen && <StablesModal currentLevel={caravanLevel} caravanTypes={caravanTypes} gold={gold} onUpgrade={handleBuyUpgrade} onClose={() => setIsStablesOpen(false)} maxInventory={maxInventory} lang={lang} />}
                {isQuestOpen && <QuestModal activeQuest={activeQuest} availableQuests={availableQuests} onAccept={handleAcceptQuest} onClose={() => setIsQuestOpen(false)} lang={lang} />}
                {isMapOpen && <MapModal currentCity={currentCity} cities={cities} onTravel={startTravel} onClose={() => setIsMapOpen(false)} lang={lang} />}
                {eventModal && !isTraveling && <EventModal event={eventModal} onClose={() => setEventModal(null)} lang={lang} />}
                {winModal && <WinModal winData={winModal} onContinue={() => setWinModal(false)} onRestart={resetGame} lang={lang} />}
            </AnimatePresence>

            {/* DOCK */}
            <div className="relative z-30 h-32 flex flex-col justify-end pb-2 bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-none">
                {/* SYSTEM LOG NOTIFICATIONS (Bottom Right) */}
                <div className="absolute bottom-36 right-4 z-[120] w-80 pointer-events-none flex flex-col items-end gap-1">
                    <AnimatePresence>
                        {systemLog.map((log) => (
                            <motion.div
                                key={log.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.3 }}
                                className={`px-3 py-1 rounded bg-black/60 backdrop-blur-sm border-l-4 text-xs font-mono shadow-lg
                                    ${log.type === 'error' ? 'border-red-500 text-red-200' :
                                        log.type === 'success' ? 'border-green-500 text-green-200' :
                                            log.type === 'gain' ? 'border-[#FFD700] text-[#FFD700]' :
                                                'border-stone-500 text-stone-300'}
                                `}
                            >
                                {log.text}
                                {log.count > 1 && <span className="ml-2 bg-white/20 px-1 rounded text-[10px] font-bold">x{log.count}</span>}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* FLOATING TEXT */}
                <AnimatePresence>
                    {floatingText.map((ft) => (
                        <motion.div
                            key={ft.id}
                            initial={{ opacity: 1, y: 0 }}
                            animate={{ opacity: 0, y: -50 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className={`absolute font-bold text-shadow pointer-events-none z-[120] whitespace-nowrap
                                        ${ft.size === '3xl' ? 'text-3xl' : ft.size === '2xl' ? 'text-2xl' : 'text-xl'}
                                    `}
                            style={{ left: ft.x, top: ft.y, color: ft.color }}
                        >
                            {ft.text}
                        </motion.div>
                    ))}
                </AnimatePresence>

                <div className="flex justify-center gap-4 p-2 px-6 pointer-events-auto">
                    <DockButton icon={<ShoppingBag size={24} />} label={t('inventory', lang)} onClick={() => { setIsStallOpen(true); SoundManager.playClick(); }} />
                    <DockButton icon={<Truck size={24} />} label={t('caravan', lang)} onClick={() => { setIsStablesOpen(true); SoundManager.playClick(); }} highlight={true} />
                    <DockButton icon={<MapIcon size={24} />} label={t('map', lang)} onClick={() => { setIsMapOpen(true); SoundManager.playClick(); }} />
                    <DockButton icon={<Beer size={24} />} label={t('tavern', lang)} onClick={() => { setIsTavernOpen(true); SoundManager.playClick(); }} notification={marketEvents.length > 0} />
                    <DockButton
                        icon={<Scroll size={24} />}
                        label={t('quests', lang)}
                        onClick={() => { setIsQuestOpen(true); SoundManager.playClick(); }}
                        notification={availableQuests.length > 0 || activeQuest}
                    />
                </div>
            </div>
        </div>
    );
}

// --- SUB-COMPONENTS ---

function DockButton({ icon, label, onClick, highlight, notification }) {
    return (
        <button onClick={onClick} className={`w-14 h-14 rounded-full border flex items-center justify-center group relative ${highlight ? 'border-[#DAA520] text-[#DAA520]' : 'border-stone-600 text-stone-400'} bg-black/40 backdrop-blur`}>
            {icon}
            {notification && (
                <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border border-black animate-pulse flex items-center justify-center">
                    <span className="text-[8px] font-bold text-white">!</span>
                </div>
            )}
            <span className="absolute -top-8 bg-black text-xs px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity border border-[#DAA520] pointer-events-none">{label}</span>
        </button>
    );
}

function QuestModal({ activeQuest, availableQuests, onAccept, onClose, lang }) {
    const [activeTab, setActiveTab] = useState(activeQuest ? 'ACTIVE' : 'AVAILABLE');

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm pointer-events-auto">
            <div className="w-[800px] h-[600px] rpg-panel border-2 border-[#DAA520]/50 overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                <div className="h-20 flex items-center justify-between px-10 border-b-2 border-[#DAA520]/50 bg-gradient-to-b from-stone-900 to-black">
                    <div className="flex items-center gap-4">
                        <Scroll size={40} className="text-[#DAA520]" />
                        <h2 className="text-3xl rpg-title text-[#DAA520] leading-none">{t('quests', lang)}</h2>
                    </div>
                    <button onClick={onClose} className="text-[#DAA520] hover:text-white transition-colors"><X size={40} /></button>
                </div>

                <div className="flex border-b border-[#DAA520]/30 bg-black/40">
                    <button onClick={() => setActiveTab('ACTIVE')} className={`flex-1 py-4 font-bold tracking-widest text-sm transition-all ${activeTab === 'ACTIVE' ? 'bg-[#DAA520]/20 text-[#DAA520] border-b-2 border-[#DAA520]' : 'text-stone-500 hover:text-stone-300'}`}>
                        {t('active_contracts', lang).toUpperCase()}
                    </button>
                    <button onClick={() => setActiveTab('AVAILABLE')} className={`flex-1 py-4 font-bold tracking-widest text-sm transition-all ${activeTab === 'AVAILABLE' ? 'bg-[#DAA520]/20 text-[#DAA520] border-b-2 border-[#DAA520]' : 'text-stone-500 hover:text-stone-300'}`}>
                        {t('available_jobs', lang).toUpperCase()}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {activeTab === 'ACTIVE' && (
                        <div className="mb-8">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-[#DAA520]"><Crown size={20} /> {t('current_contract', lang)}</h3>
                            {activeQuest ? (
                                <div className="p-4 border-2 border-[#DAA520]/50 rounded bg-black/30 relative overflow-hidden">
                                    <div className="absolute -right-4 -top-4 opacity-10"><Scroll size={100} /></div>
                                    <h4 className="font-bold text-lg mb-1 text-white">{activeQuest.title}</h4>
                                    <p className="text-sm mb-3 italic text-stone-300">"{activeQuest.desc}"</p>
                                    <div className="space-y-1 text-sm font-bold text-stone-200">
                                        <div className="flex items-center gap-2"><Gift size={16} className="text-[#DAA520]" /> {t('deliver', lang)}: {activeQuest.quantity}x {activeQuest.item}</div>
                                        <div className="flex items-center gap-2"><MapIcon size={16} className="text-[#DAA520]" /> {t('destination', lang)}: {activeQuest.targetCity}</div>
                                        <div className="flex items-center gap-2"><Coins size={16} className="text-[#DAA520]" /> {t('reward', lang)}: {activeQuest.reward} {t('gold', lang)}</div>
                                    </div>
                                    <div className="mt-3 text-xs uppercase tracking-widest text-green-400 font-bold border-t border-[#DAA520]/30 pt-2">
                                        {t('status', lang)}: {t('in_progress', lang)}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-6 border-2 border-dashed border-[#DAA520]/40 rounded text-center text-stone-500 italic">
                                    {t('no_active_contract', lang)}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'AVAILABLE' && (
                        <div>
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-[#DAA520]"><Scroll size={20} /> {t('available_work', lang)}</h3>
                            <div className="space-y-3">
                                {availableQuests.length === 0 && (
                                    <p className="text-center italic text-stone-500">
                                        {t('no_pending_requests', lang)}
                                    </p>
                                )}
                                {availableQuests.map(quest => (
                                    <motion.div
                                        key={quest.id}
                                        whileHover={{ scale: 1.02 }}
                                        className="p-3 border border-[#DAA520]/30 rounded hover:bg-black/40 transition-colors flex justify-between items-center group cursor-pointer"
                                        onClick={() => onAccept(quest)}
                                    >
                                        <div>
                                            <div className="font-bold text-white">{quest.title}</div>
                                            <div className="text-xs text-stone-400">{quest.desc}</div>
                                            <div className="text-xs font-bold mt-1 text-[#DAA520]">{t('reward', lang)}: {quest.reward} {t('gold_short', lang)}</div>
                                        </div>
                                        <button className="px-3 py-1 bg-[#DAA520] text-black text-xs font-bold rounded uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                                            {t('sign', lang)}
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

function TavernModal({ activeEvents, onClose, lang }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-[500px] h-[600px] relative bg-[#2a1a10] text-[#d4b483] border-4 border-[#5c4033] rounded-lg shadow-2xl overflow-hidden flex flex-col items-center"
            >
                <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ backgroundImage: "repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), repeating-linear-gradient(45deg, #000 25%, #2a1a10 25%, #2a1a10 75%, #000 75%, #000)" }}></div>

                <button onClick={onClose} className="absolute top-4 right-4 text-[#d4b483] hover:text-white z-50"><X size={24} /></button>

                <div className="mt-8 mb-4 relative z-10">
                    <Beer size={48} className="text-[#DAA520]" />
                </div>
                <h2 className="text-3xl rpg-title text-[#DAA520] mb-2 relative z-10">{t('tavern_title', lang)}</h2>
                <p className="border-b border-[#5c4033] w-3/4 text-center pb-4 mb-6 italic text-stone-500 relative z-10">"{t('tavern_subtitle', lang)}"</p>

                <div className="flex-1 w-full px-8 overflow-y-auto custom-scrollbar relative z-10">
                    <h3 className="text-lg font-bold text-[#b8860b] mb-4 uppercase tracking-widest text-center">{t('latest_rumors', lang)}</h3>

                    {activeEvents.length === 0 ? (
                        <div className="text-center text-stone-500 italic py-8">
                            "{t('no_rumors', lang)}"
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {activeEvents.map(event => (
                                <div key={event.id} className="bg-[#1a100a] p-4 border border-[#5c4033] rounded relative">
                                    <div className="absolute -left-2 top-2 w-1 h-full bg-[#DAA520]" />
                                    <p className="text-lg font-serif">"{event.text}"</p>
                                    <div className="mt-2 text-xs uppercase font-bold text-stone-500 text-right">
                                        {event.type.toUpperCase()} {t('event', lang).toUpperCase()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-6 text-xs text-stone-600 relative z-10">
                    {t('rumors_change_travel', lang)}
                </div>
            </motion.div>
        </div>
    );
}

function MyStallModal({ inventory, myStall, onList, onRemove, onClose, maxInventory, getPrice, lang }) {
    const [selectedItemIdx, setSelectedItemIdx] = useState(null);
    const [priceInput, setPriceInput] = useState("");

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm pointer-events-auto">
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="w-[1000px] h-[700px] rpg-panel flex flex-col overflow-hidden"
            >
                <div className="h-16 flex items-center justify-between px-8 border-b-2 border-[#DAA520]/30 bg-black/40">
                    <h2 className="text-3xl rpg-title text-[#DAA520]">{t('stall_management', lang)}</h2>
                    <button onClick={onClose} className="text-[#DAA520] hover:text-white"><X size={32} /></button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    <div className="w-1/2 p-6 border-r border-[#DAA520]/20 flex flex-col">
                        <h3 className="text-[#DAA520] uppercase font-bold text-sm tracking-widest mb-4 flex items-center gap-2">
                            <ShoppingBag size={18} /> {t('my_cargo_select_to_list', lang)}
                        </h3>
                        <div className="grid grid-cols-6 gap-2 overflow-y-auto flex-1 content-start pr-2 custom-scrollbar">
                            {inventory.map((slot, idx) => {
                                const isLocked = idx >= maxInventory;
                                if (isLocked) return null;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => slot && setSelectedItemIdx(idx)}
                                        className={`aspect-square border rounded flex items-center justify-center text-2xl transition-all
                                            ${selectedItemIdx === idx ? 'bg-[#DAA520]/30 border-[#DAA520] shadow-[0_0_15px_rgba(218,165,32,0.4)] scale-105 z-10' : 'bg-black/40 border-[#333] hover:border-[#555]'}
                                            ${!slot ? 'opacity-30' : ''}
                                        `}
                                    >
                                        {slot?.icon}
                                    </button>
                                );
                            })}
                        </div>

                        {selectedItemIdx !== null && (
                            <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-4 p-5 bg-[#DAA520]/5 border-2 border-[#DAA520]/20 rounded-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-[#DAA520]/5 -rotate-45 translate-x-10 -translate-y-10" />
                                <div className="flex justify-between items-center mb-4 relative z-10">
                                    <div>
                                        <div className="font-black text-xl text-[#DAA520]">{inventory[selectedItemIdx].name}</div>
                                        <div className="text-[10px] text-stone-500 uppercase font-bold tracking-widest mt-1">{t('ready_for_market', lang)}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-stone-400 font-bold uppercase tracking-tighter">{t('market_hint', lang)}</div>
                                        <div className="text-green-400 font-mono font-bold">~{Math.floor(getPrice(inventory[selectedItemIdx]) * 1.25)} G</div>
                                    </div>
                                </div>
                                <div className="flex gap-3 relative z-10">
                                    <input
                                        type="number"
                                        placeholder={t('set_sale_price_placeholder', lang)}
                                        value={priceInput}
                                        onChange={(e) => setPriceInput(e.target.value)}
                                        className="flex-1 bg-black/60 border border-[#DAA520]/50 px-4 py-2 font-mono text-white outline-none"
                                    />
                                    <button
                                        onClick={() => { onList(selectedItemIdx, priceInput); setSelectedItemIdx(null); setPriceInput(""); }}
                                        className="px-8 py-2 bg-[#DAA520] text-black font-bold uppercase hover:bg-white transition-colors"
                                    >
                                        {t('list', lang)}
                                    </button>
                                </div>
                                <p className="text-[10px] text-stone-500 mt-3 italic">"{t('pricing_hint', lang)}"</p>
                            </motion.div>
                        )}
                    </div>

                    <div className="w-1/2 p-6 bg-black/20 flex flex-col">
                        <h3 className="text-[#DAA520] uppercase font-bold text-sm tracking-widest mb-4 flex items-center gap-2">
                            <StoreIcon size={18} /> {t('items_on_sale', lang)} (Max 4)
                        </h3>
                        <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-4">
                            {myStall.map((slot, idx) => (
                                <div key={idx} className="bg-gradient-to-br from-[#1a120b] to-black border-2 border-[#DAA520]/30 rounded-lg flex flex-col items-center justify-center relative group p-4">
                                    <div className="absolute top-2 left-2 text-[10px] text-stone-600 font-bold">SLOT 0{idx + 1}</div>
                                    {slot ? (
                                        <>
                                            <div className="text-5xl mb-2 drop-shadow-[0_0_10px_rgba(255,215,0,0.3)]">{slot.icon}</div>
                                            <div className="text-[#DAA520] font-bold text-lg">{slot.name}</div>
                                            <div className="text-green-400 font-mono font-bold mt-1">{slot.price} G</div>
                                            <button
                                                onClick={() => onRemove(idx)}
                                                className="mt-4 text-[10px] text-red-500 uppercase font-bold hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                [ {t('cancel_sale', lang)} ]
                                            </button>
                                        </>
                                    ) : (
                                        <div className="text-stone-800 text-sm italic font-bold">{t('empty_slot', lang)}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 p-4 bg-black/60 rounded border border-stone-800 text-xs text-stone-400 italic">
                            {t('bots_browse_stall_hint', lang)}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

function BazaarModal({ stalls, onClose, onVisitStall, lang }) {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm pointer-events-auto">
            <div className="w-[1200px] h-[800px] rpg-panel border-2 border-[#DAA520]/50 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                <div className="h-20 flex items-center justify-between px-10 border-b-2 border-[#DAA520]/50 bg-gradient-to-b from-stone-900 to-black">
                    <div className="flex items-center gap-4">
                        <StoreIcon size={40} className="text-[#DAA520]" />
                        <div>
                            <h2 className="text-3xl rpg-title text-[#DAA520] leading-none">{t('bazaar_title', lang)}</h2>
                            <p className="text-[10px] text-stone-500 uppercase tracking-[0.3em] font-bold">{t('bazaar_subtitle', lang)}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-[#DAA520] hover:text-white transition-colors"><X size={40} /></button>
                </div>

                <div className="p-10 grid grid-cols-4 gap-6 h-[720px] overflow-y-auto custom-scrollbar content-start">
                    {stalls.map(stall => (
                        <motion.div key={stall.id} whileHover={{ y: -5 }} className="rpg-panel p-6 border border-[#DAA520]/20 flex flex-col items-center text-center group bg-black/40">
                            <div className="w-20 h-20 rounded-full bg-[#DAA520]/10 border-2 border-[#DAA520]/30 flex items-center justify-center mb-4 group-hover:border-[#DAA520] transition-colors">
                                <User size={40} className="text-[#DAA520]" />
                            </div>
                            <h4 className="font-bold text-[#DAA520] text-lg leading-tight mb-1">{stall.playerName}</h4>
                            <p className="text-xs text-stone-400 italic mb-4 line-clamp-1">"{stall.title}"</p>
                            <button
                                onClick={() => onVisitStall(stall)}
                                className="w-full py-2 bg-[#DAA520] text-black font-bold uppercase text-xs tracking-widest rounded hover:bg-white transition-colors"
                            >
                                {t('visit', lang)}
                            </button>
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

function BazaarStallModal({ stall, onClose, onBuy, onOffer, gold, lang }) {
    const [offerPrices, setOfferPrices] = useState({}); // Per-item state
    const [negotiatingId, setNegotiatingId] = useState(null);

    const handleOffer = (item) => {
        const price = offerPrices[item.id];
        if (!price || isNaN(price)) return;
        setNegotiatingId(item.id);
        setTimeout(() => {
            onOffer(stall, item, Number(price));
            setOfferPrices(prev => ({ ...prev, [item.id]: "" }));
            setNegotiatingId(null);
        }, 1500);
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md pointer-events-auto">
            <div className="w-[1100px] h-[750px] rpg-panel border-2 border-[#DAA520]/50 overflow-hidden flex flex-col">
                <div className="h-20 flex items-center justify-between px-10 border-b-2 border-[#DAA520]/50 bg-gradient-to-b from-stone-900 to-black">
                    <div className="flex items-center gap-4">
                        <User size={40} className="text-[#DAA520]" />
                        <div>
                            <h2 className="text-2xl rpg-title text-[#DAA520] leading-none">{stall.playerName}'s {t('players_stall', lang)}</h2>
                            <p className="text-xs text-stone-500 italic mt-1 font-serif">"{stall.title}"</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-[#DAA520] hover:text-white transition-colors">{t('back_to_bazaar', lang)}</button>
                </div>

                <div className="flex-1 p-10 flex gap-8 overflow-hidden">
                    <div className="w-1/3 p-8 bg-stone-900 border border-[#DAA520]/30 rounded-2xl flex flex-col items-center text-center">
                        <div className="w-32 h-32 bg-black border-4 border-[#DAA520] rounded-full mb-6 flex items-center justify-center text-[#DAA520] shadow-[0_0_30px_rgba(218,165,32,0.2)]">
                            <User size={64} />
                        </div>
                        <h3 className="text-3xl text-[#DAA520] font-black mb-2">{stall.playerName}</h3>
                        <div className="px-4 py-1 bg-green-900/30 text-green-400 text-[10px] font-bold rounded-full mb-6 border border-green-500/30 uppercase tracking-widest">{t('established_trader', lang)}</div>
                        <p className="italic text-stone-300 text-sm">"{stall.title}"</p>
                    </div>

                    <div className="flex-1 grid grid-cols-2 gap-6 overflow-y-auto pr-4 custom-scrollbar content-start">
                        {stall.inventory.map(item => (
                            <div key={item.id} className="bg-black/40 border border-[#333] p-5 rounded-xl hover:border-[#DAA520] transition-all flex flex-col relative overflow-hidden">
                                {negotiatingId === item.id && (
                                    <div className="absolute inset-0 bg-black/80 z-20 flex items-center justify-center flex-col gap-3">
                                        <div className="w-10 h-10 border-4 border-[#DAA520] border-t-transparent rounded-full animate-spin" />
                                        <span className="text-[#DAA520] font-bold tracking-widest uppercase text-[10px] animate-pulse">{t('negotiating', lang)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="text-4xl">{item.icon}</div>
                                        <div>
                                            <div className="text-lg font-bold text-white">{item.name}</div>
                                            <div className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">{item.type}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[#DAA520] font-mono font-bold text-xl">{item.price} G</div>
                                        <div className="text-[10px] text-stone-600 font-bold uppercase tracking-tighter">{t('asking_price', lang)}</div>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-auto pt-4 border-t border-white/5">
                                    <div className="flex-1 flex flex-col gap-2">
                                        <input
                                            type="number"
                                            placeholder={t('offer_price_placeholder', lang)}
                                            value={offerPrices[item.id] || ""}
                                            onChange={(e) => setOfferPrices(prev => ({ ...prev, [item.id]: e.target.value }))}
                                            className="w-full bg-stone-900 border border-[#DAA520]/20 rounded px-3 py-1.5 text-xs text-white outline-none focus:border-[#DAA520]"
                                        />
                                        <button
                                            onClick={() => handleOffer(item)}
                                            className="w-full py-1.5 border border-[#DAA520]/30 text-[#DAA520] text-[10px] font-bold uppercase rounded hover:bg-[#DAA520]/10"
                                        >
                                            {t('make_offer', lang)}
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => onBuy(stall, item)}
                                        disabled={gold < item.price}
                                        className={`flex-1 font-black text-xs rounded uppercase
                                            ${gold < item.price ? 'bg-stone-800 text-stone-600 cursor-not-allowed' : 'bg-[#DAA520] text-black hover:bg-white'}
                                        `}
                                    >
                                        {gold < item.price ? t('poor', lang) : t('buy_now', lang)}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function StablesModal({ currentLevel, caravanTypes, gold, onUpgrade, onClose, maxInventory, lang }) {
    const currentCaravan = caravanTypes.find(c => c.level === currentLevel);
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="w-[900px] h-[600px] rpg-panel p-0 rounded-lg shadow-2xl relative flex overflow-hidden border-[#DAA520]/50"
            >
                <div className="absolute inset-0 z-0">
                    <img src="/caravan_camp.png" className="w-full h-full object-cover opacity-40 mix-blend-overlay" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
                </div>

                <button onClick={onClose} className="absolute top-4 right-4 z-50 text-stone-400 hover:text-white"><X size={24} /></button>

                <div className="relative z-10 w-1/3 p-6 border-r border-[#DAA520]/30 flex flex-col items-center justify-center text-center">
                    <div className="relative w-48 h-48 mb-6 flex items-center justify-center">
                        <div className="absolute inset-0 bg-[#DAA520] opacity-20 blur-xl rounded-full animate-pulse" />
                        <img
                            src={currentCaravan.icon || '/placeholder.png'}
                            className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]"
                            alt={currentCaravan.name}
                        />
                    </div>
                    <h2 className="text-2xl rpg-title text-[#DAA520] mb-2">{currentCaravan.name}</h2>
                    <div className="text-sm text-stone-400 mb-6">{currentCaravan.desc}</div>

                    <div className="w-full bg-[#111] p-4 rounded border border-[#333]">
                        <div className="flex justify-between mb-2">
                            <span className="text-stone-500 uppercase font-bold text-[10px]">Capacity</span>
                            <span className="text-[#DAA520] font-mono">{maxInventory} {t('gold_short', lang)}</span>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 w-2/3 p-6 flex flex-col">
                    <h2 className="text-2xl rpg-title text-[#DAA520] mb-6 flex items-center gap-2">
                        <ArrowUpCircle size={24} /> {t('stables_upgrades', lang)}
                    </h2>

                    <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
                        {caravanTypes.map((type) => {
                            const isOwned = currentLevel >= type.level;
                            const isNext = type.level === currentLevel + 1;
                            const canAfford = gold >= type.cost;

                            return (
                                <div
                                    key={type.level}
                                    className={`relative p-4 border rounded-lg flex items-center gap-4 transition-all
                                        ${isOwned
                                            ? 'bg-[#1a120b]/50 border-[#DAA520]/20 opacity-60'
                                            : isNext
                                                ? 'bg-[#1a120b] border-[#DAA520] shadow-[0_0_10px_rgba(218,165,32,0.2)]'
                                                : 'bg-black/40 border-[#333] opacity-50 grayscale'
                                        }
                                    `}
                                >
                                    <div className="w-16 h-16 flex items-center justify-center bg-black/20 rounded text-3xl font-bold">
                                        {type.icon ? (
                                            <img src={type.icon} className="max-w-full max-h-full object-contain" />
                                        ) : "📦"}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-lg font-bold text-[#DAA520]">{type.name}</div>
                                        <div className="text-xs text-stone-400">{type.desc}</div>
                                        <div className="text-xs text-green-400 mt-1 uppercase font-bold text-[10px]">
                                            Capacity: {type.slots} Slots
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        {isOwned ? (
                                            <div className="text-stone-500 text-sm font-bold uppercase tracking-widest">{t('online', lang).toUpperCase()}</div>
                                        ) : (
                                            <button
                                                disabled={!isNext || !canAfford}
                                                onClick={() => onUpgrade(type)}
                                                className={`px-4 py-2 text-sm font-bold rounded border
                                                    ${isNext && canAfford
                                                        ? 'bg-[#DAA520] text-black border-white hover:bg-white'
                                                        : 'bg-[#333] text-stone-500 border-[#444] cursor-not-allowed'
                                                    }
                                                `}
                                            >
                                                {type.cost.toLocaleString()} {t('gold_short', lang)}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

function MapModal({ currentCity, cities, onTravel, onClose, lang }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm pointer-events-auto">
            <motion.div className="relative w-[800px] h-[600px] bg-[#1a120b] border border-[#DAA520] mb-8 shadow-2xl overflow-hidden rounded-lg">
                <img src="/world_map.png" className="w-full h-full object-cover opacity-60" />
                {Object.values(cities).map(city => (
                    <button
                        key={city.id}
                        onClick={() => onTravel(city.name)}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                        style={{ left: city.x, top: city.y }}
                    >
                        <div className={`w-6 h-6 rounded-full border-2 ${currentCity === city.name ? 'bg-[#FFD700] border-white shadow-[0_0_15px_#FFD700]' : 'bg-[#333] border-stone-500 hover:bg-[#DAA520]'}`} />
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 text-white font-bold text-shadow whitespace-nowrap bg-black/50 px-2 rounded">{city.name}</div>
                    </button>
                ))}
                <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-[#DAA520]"><X /></button>
                <div className="absolute top-4 left-4 text-[#DAA520] font-bold text-xl bg-black/50 px-4 py-2 rounded border border-[#DAA520]">{t('map', lang)}</div>
            </motion.div>
        </div>
    );
}

function EventModal({ event, onClose, lang }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto">
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`w-[400px] rpg-panel p-6 text-center flex flex-col items-center gap-4 ${event.type === 'bad' ? 'border-red-900 shadow-[0_0_30px_rgba(255,0,0,0.2)]' : 'border-[#DAA520] shadow-[0_0_30px_rgba(218,165,32,0.2)]'}`}
            >
                {event.type === 'bad' ? <AlertTriangle size={48} className="text-red-500" /> : <Anchor size={48} className="text-[#DAA520]" />}
                <h2 className="text-3xl rpg-title text-[#FFD700]">{event.title}</h2>
                <p className="text-stone-300 italic">{event.message}</p>
                <div className="text-xl font-bold py-2 border-y border-white/10 w-full text-white">{event.effect}</div>
                <button onClick={onClose} className="mt-4 px-8 py-2 bg-[#DAA520] text-black font-bold uppercase rounded hover:bg-white transition-colors">{t('event_continue', lang)}</button>
            </motion.div>
        </div>
    );
}

function WinModal({ winData, onContinue, onRestart, lang }) {
    const isQuest = winData.type === 'quest';
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md pointer-events-auto">
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`w-[600px] rpg-panel p-8 text-center flex flex-col items-center gap-6 ${isQuest ? 'border-green-700' : 'border-[#FFD700] shadow-[0_0_50px_rgba(255,215,0,0.3)]'}`}
            >
                {isQuest ? <Gift size={80} className="text-green-500" /> : <Crown size={80} className="text-[#FFD700] animate-bounce" />}
                <h1 className={`text-5xl rpg-title uppercase tracking-widest ${isQuest ? 'text-green-400' : 'text-[#FFD700]'}`}>{t(isQuest ? 'win_quest_title' : 'win_king_title', lang)}</h1>
                <p className="text-xl text-stone-300">
                    {t(isQuest ? 'win_quest_msg' : 'win_king_msg', lang)}
                </p>
                {isQuest && <div className="text-3xl font-bold text-[#FFD700] py-2">+{winData.reward} {t('gold_short', lang)}</div>}

                <div className="flex gap-4 mt-4">
                    <button onClick={onContinue} className="px-8 py-3 bg-[#DAA520] text-black hover:bg-white text-xl font-bold rounded uppercase transition-colors">{t(isQuest ? 'win_excellent' : 'win_continue', lang)}</button>
                    {!isQuest && <button onClick={onRestart} className="px-8 py-3 border border-red-900 text-red-500 hover:text-white hover:bg-red-900 rounded uppercase transition-colors">{t('win_restart', lang)}</button>}
                </div>
            </motion.div>
        </div>
    );
}
