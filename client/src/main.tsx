import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Howler } from 'howler';

// Configure Howler.js global settings
Howler.autoUnlock = true;
Howler.volume(0.5);

createRoot(document.getElementById("root")!).render(<App />);
