import { useState } from "react";

// Copy a text exactly as given (US-050) and show "copied" for a moment.
export function useCopy() {
  const [copied, setCopied] = useState(false);
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable (http, old browser); the text stays visible to copy by hand.
    }
  }
  return { copied, copy };
}
