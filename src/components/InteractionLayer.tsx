import { memo, useEffect, useState, useRef } from 'react';

interface InteractionLayerProps {
  mouseEnabled: boolean;
  keysEnabled: boolean;
  keystrokePosition?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'bottom-center';
  clickColorLeft?: string;
  clickColorRight?: string;
}

interface Ripple {
  x: number;
  y: number;
  id: number;
  button: string;
}

interface KeyEntry {
  id: number;
  text: string;
}

const InteractionLayer = memo(({
  mouseEnabled,
  keysEnabled,
  keystrokePosition = 'bottom-left',
  clickColorLeft = '#6366f1',
  clickColorRight = '#ea580c'
}: InteractionLayerProps) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [keyHistory, setKeyHistory] = useState<KeyEntry[]>([]);

  // Mouse Logic
  const mouseListenerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!mouseEnabled) return;

    let isMounted = true;

    const setupListener = async () => {
      // Import dynamically to avoid SSR issues if any, though not applicable here
      const { listen } = await import('@tauri-apps/api/event');

      if (mouseListenerRef.current) {
        mouseListenerRef.current();
        mouseListenerRef.current = null;
      }

      const unlisten = await listen<{ x: number, y: number, button: string }>('global-click', (event) => {
        if (!isMounted) return;
        const { x, y, button } = event.payload;
        const id = Date.now();
        setRipples(prev => [...prev.slice(-4), { x, y, id, button }]);
        setTimeout(() => {
          if (!isMounted) return;
          setRipples(prev => prev.filter(r => r.id !== id));
        }, 600);
      });

      if (isMounted) {
        mouseListenerRef.current = unlisten;
      } else {
        unlisten();
      }
    };

    setupListener();

    return () => {
      isMounted = false;
      if (mouseListenerRef.current) {
        mouseListenerRef.current();
        mouseListenerRef.current = null;
      }
    };
  }, [mouseEnabled]);

  // Keyboard Logic
  const nextId = useRef(0);
  const listenerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!keysEnabled) return;

    let isMounted = true;

    const setupListener = async () => {
      const { listen } = await import('@tauri-apps/api/event');

      if (listenerRef.current) {
        listenerRef.current();
        listenerRef.current = null;
      }

      const unlisten = await listen<string>('global-key', (event) => {
        if (!isMounted) return;

        // Raw key string like "KeyA", "Space", "ShiftLeft"
        let text = event.payload;
        if (text.startsWith('Key')) text = text.substring(3); // Remove 'Key' prefix

        const entryId = nextId.current++;
        const newEntry = { id: entryId, text };

        setKeyHistory(prev => {
          const updated = [newEntry, ...prev];
          return updated.slice(0, 4);
        });

        setTimeout(() => {
          if (!isMounted) return;
          setKeyHistory(prev => prev.filter(k => k.id !== entryId));
        }, 3000);
      });

      if (isMounted) {
        listenerRef.current = unlisten;
      } else {
        unlisten();
      }
    };

    setupListener();

    return () => {
      isMounted = false;
      if (listenerRef.current) {
        listenerRef.current();
        listenerRef.current = null;
      }
    };
  }, [keysEnabled]);

  const getPositionClasses = () => {
    switch (keystrokePosition) {
      case 'bottom-right': return 'bottom-12 right-12 flex-row-reverse';
      case 'top-left': return 'top-12 left-12 flex-row';
      case 'top-right': return 'top-12 right-12 flex-row-reverse';
      case 'bottom-center': return 'bottom-12 left-1/2 -translate-x-1/2 flex-row justify-center';
      case 'bottom-left':
      default: return 'bottom-12 left-12 flex-row';
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[100]">
      {/* Mouse Ripples */}
      {ripples.map(r => {
        const color = r.button === 'right' ? clickColorRight : clickColorLeft;
        return (
          <div
            key={r.id}
            className="absolute rounded-full border-2"
            style={{
              left: r.x,
              top: r.y,
              width: '40px',
              height: '40px',
              transform: 'translate(-50%, -50%)',
              animation: 'ripple 0.6s ease-out forwards',
              willChange: 'transform, opacity',
              borderColor: color,
              backgroundColor: `${color}33`, // roughly 20% opacity
              boxShadow: `0 0 10px ${color}`
            }}
          />
        );
      })}

      {/* Keystroke Display */}
      {keysEnabled && keyHistory.length > 0 && (
        <div className={`absolute flex gap-2 items-center transition-all duration-300 ${getPositionClasses()}`}>
          {keyHistory.map((k) => (
            <div
              key={k.id}
              className="bg-zinc-900/90 text-white px-3 py-2 min-w-[32px] text-center rounded-lg border border-white/10 shadow-xl backdrop-blur-md font-mono text-sm font-bold animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              {k.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default InteractionLayer;
