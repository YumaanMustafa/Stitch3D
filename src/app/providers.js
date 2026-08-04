'use client';

// File: src/app/providers.js
// Purpose: Client-side wrapper that provides theme switching support using next-themes.
// This component wraps the app so the entire site can respond to light/dark mode changes.

// Import ThemeProvider from next-themes library which handles dark/light mode toggling
import { ThemeProvider } from 'next-themes';
// Import hooks for managing state and running side effects
import { useEffect, useState } from 'react';

// Providers component wraps child components and gives them access to the theme system
// children: all the page content to be wrapped
export function Providers({ children }) {
  // mounted state ensures the ThemeProvider only renders after the page has loaded in the browser
  // This prevents a mismatch between the server-rendered HTML and the client-rendered HTML
  const [mounted, setMounted] = useState(false);

  // Effect hook runs once after component mounts in the browser
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // During server-side rendering, render children without theme wrapper to avoid hydration errors
    return <>{children}</>;
  }

  return (
    // ThemeProvider manages the active theme and applies it as an HTML attribute
    <ThemeProvider
      attribute="data-bs-theme" // Bootstrap 5.3 uses this specific attribute to switch themes
      defaultTheme="system"      // Default to whatever theme the user's operating system prefers
      enableSystem={true}        // Allow the theme to follow system-level dark/light mode setting
    >
      {children}
    </ThemeProvider>
  );
}