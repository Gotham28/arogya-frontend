import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { v4 as uuidv4 } from "uuid";

/* =========================
   Session ID (per-tab)
   ========================= */
const SESSION_KEY = "chat_session_id";

if (!sessionStorage.getItem(SESSION_KEY)) {
  sessionStorage.setItem(SESSION_KEY, uuidv4());
}

/* =========================
   Google Analytics (GA4)
   ========================= */
declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

function initGA() {
  if (window.gtag) return; // Prevent double loading

  const gaScript = document.createElement("script");
  gaScript.src = "https://www.googletagmanager.com/gtag/js?id=G-NY9LSXS6FP";
  gaScript.async = true;

  const inlineScript = document.createElement("script");
  inlineScript.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-NY9LSXS6FP', {
      anonymize_ip: true,
      send_page_view: false
    });
  `;

  document.head.appendChild(gaScript);
  document.head.appendChild(inlineScript);
}

/* =========================
   Bootstrap wrapper
   ========================= */
function Bootstrap() {
  useEffect(() => {
    initGA();

    // Manual page view
    window.gtag?.("event", "page_view", {
      page_path: window.location.pathname,
    });
  }, []);

  return <App />;
}

/* =========================
   Render (unchanged behavior)
   ========================= */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Bootstrap />
  </StrictMode>
);
