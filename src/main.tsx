import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import WebcamOverlay from "./WebcamOverlay";
import { getCurrentWindow } from "@tauri-apps/api/window";

function Root() {
  const [label, setLabel] = useState<string>('detecting');

  useEffect(() => {
    async function detectWindow() {
      // DEFAULT FAILSAFE: If detection takes too long (>500ms), assume dashboard if 900px
      const timer = setTimeout(() => {
        if (window.innerWidth === 900) setLabel('controls');
        else setLabel('overlay');
      }, 500);

      let detectedTitle = "unknown";
      let detectedLabel = "";

      try {
        const win = getCurrentWindow();
        detectedLabel = win.label;
        detectedTitle = await win.title();
      } catch (e) {
        // ignore
      }

      // 1. Check Pathname (Fix for /webcam)
      if (window.location.pathname.includes('webcam')) {
        setLabel('webcam');
        document.body.className = 'window-webcam';
        clearTimeout(timer);
        return;
      }

      // 2. Check URL Hash
      let winLabel = window.location.hash.substring(1);

      // 3. Check URL Search Params
      if (!winLabel) {
        const params = new URLSearchParams(window.location.search);
        winLabel = params.get('mode') || '';
      }

      // 4. Check Tauri Label (Restore this check!)
      if (!winLabel && detectedLabel) {
        winLabel = detectedLabel;
      }

      // 5. Force Dashboard override based on Title or Size
      if (
        (window.innerWidth === 900) ||
        (detectedTitle && (detectedTitle.includes("Dashboard") || detectedTitle.includes("Controls")))
      ) {
        winLabel = 'controls';
      }

      // 6. Fallback
      if (!winLabel) winLabel = 'overlay';

      // Sanitize
      if (winLabel.includes('?')) winLabel = winLabel.split('?')[0];

      clearTimeout(timer);
      setLabel(winLabel);
      document.body.className = `window-${winLabel}`;
    }
    detectWindow();
  }, []);

  if (label === 'detecting') {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-black text-white">
        <h1 className="text-2xl font-bold animate-pulse">Initializing...</h1>
      </div>
    );
  }

  return (
    <React.StrictMode>
      {label === 'webcam' ? <WebcamOverlay /> :
        label === 'controls' ? <App mode="controls" /> :
          <App mode="overlay" />}
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(<Root />);
