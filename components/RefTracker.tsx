"use client";
import { useEffect } from "react";

export default function RefTracker() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && ref.length >= 6) {
      localStorage.setItem("elysium_ref", ref);
    }
  }, []);
  return null;
}
