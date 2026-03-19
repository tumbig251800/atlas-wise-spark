import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

function clearStaleSupabaseSessions() {
  if (typeof localStorage === "undefined") return;
  // Keep only our new storage key; remove ANY sb-* keys to avoid cross-project auth collisions.
  const allow = new Set(["atlas_prod_auth"]);
  for (const k of Object.keys(localStorage)) {
    if (allow.has(k)) continue;
    if (k.startsWith("sb-")) {
      localStorage.removeItem(k);
      continue;
    }
  }
}

clearStaleSupabaseSessions();

createRoot(document.getElementById("root")!).render(<App />);
