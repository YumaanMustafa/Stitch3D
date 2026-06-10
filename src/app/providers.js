'use client';

// File: src/app/providers.js
// Purpose: Client component to wrap the app with next-themes Provider.
// Inputs: children
// Outputs: ThemeProvider configured for Bootstrap 5.3
// Note: Bootstrap 5.3 uses the 'data-bs-theme' attribute for dark mode.

import { ThemeProvider } from 'next-themes';
import { useEffect, useState } from 'react';

export function Providers({ children }) {
  // Mount state to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Render children without theming attributes during SSR to prevent mismatch
    return <>{children}</>;
  }

  return (
    <ThemeProvider
      attribute="data-bs-theme" // Critical: Tells next-themes to toggle this specific attribute for Bootstrap
      defaultTheme="system"      // Default to system preference
      enableSystem={true}
    >
      {children}
    </ThemeProvider>
  );
}