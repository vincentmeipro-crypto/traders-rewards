"use client";
import { useEffect } from "react";

export default function CrispChat() {
  useEffect(() => {
    (window as any).$crisp = [];
    (window as any).CRISP_WEBSITE_ID = "12bb26b9-91ca-4a8c-8b42-42a66d94b0f4";
    const s = document.createElement("script");
    s.src = "https://client.crisp.chat/l.js";
    s.async = true;
    document.head.appendChild(s);
  }, []);

  return null;
}
