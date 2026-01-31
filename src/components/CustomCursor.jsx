import React, { useState, useEffect } from 'react';

export default function CustomCursor() {
    const [position, setPosition] = useState({ x: -100, y: -100 });
    const [isPointer, setIsPointer] = useState(false);
    const [isClicking, setIsClicking] = useState(false);
    const [trail, setTrail] = useState([]);

    useEffect(() => {
        const updatePosition = (e) => {
            setPosition({ x: e.clientX, y: e.clientY });

            // Robust Check for Interactive Elements
            let target = e.target;
            let clickable = false;

            // Check up to 5 ancestors
            for (let i = 0; i < 5 && target && target !== document.body; i++) {
                const tag = target.tagName;
                if (['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL'].includes(tag)) {
                    clickable = true;
                    break;
                }
                // Check for Tailwind cursor-pointer class
                if (target.classList && target.classList.contains('cursor-pointer')) {
                    clickable = true;
                    break;
                }
                // Check for role="button"
                if (target.getAttribute && target.getAttribute('role') === 'button') {
                    clickable = true;
                    break;
                }
                target = target.parentElement;
            }
            setIsPointer(clickable);

            // Add Trail Point
            const trailId = `${performance.now()}-${Math.random()}`;
            setTrail(prev => [...prev.slice(-10), { x: e.clientX, y: e.clientY, id: trailId }]);

            // Cleanup Trail
            setTimeout(() => {
                setTrail(prev => prev.filter(p => p.id !== trailId));
            }, 100);
        };

        const handleMouseDown = () => setIsClicking(true);
        const handleMouseUp = () => setIsClicking(false);

        window.addEventListener('mousemove', updatePosition);
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', updatePosition);
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    return (
        <>
            {/* Trail Effect */}
            {trail.map((point, i) => (
                <div
                    key={point.id}
                    className="fixed pointer-events-none rounded-full bg-[#FFD700] z-[9998]"
                    style={{
                        left: point.x,
                        top: point.y,
                        width: `${(i + 1) * 2}px`,
                        height: `${(i + 1) * 2}px`,
                        opacity: (i + 1) / 10 * 0.4,
                        transform: 'translate(-50%, -50%)',
                        boxShadow: '0 0 4px #FFD700'
                    }}
                />
            ))}

            {/* Custom Cursor Image */}
            <div
                className="fixed top-0 left-0 pointer-events-none z-[9999]"
                style={{
                    transform: `translate(${position.x}px, ${position.y}px)`,
                }}
            >
                <img
                    src="/cursor.png"
                    alt="cursor"
                    className={`
                        w-12 h-12 object-contain transition-all duration-75 ease-out
                        ${isClicking ? 'scale-90 -rotate-12' : ''} 
                        ${isPointer ? 'filter brightness-125 drop-shadow-[0_0_10px_rgba(255,50,50,0.8)]' : 'drop-shadow-[0_2px_5px_rgba(0,0,0,0.5)]'}
                    `}
                    style={{
                        marginTop: '-2px',
                        marginLeft: '-2px'
                    }}
                />
            </div>
        </>
    );
}
