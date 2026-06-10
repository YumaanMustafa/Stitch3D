// File: app/layout.js
// Purpose: Global root layout to enforce font (Inter) and premium base theme.
import { Inter } from 'next/font/google';
import './globals.css';

import { CartProvider } from './context/CartContext';

// Using 'Inter' for that clean, modern e-commerce look
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'Stitch | Custom Leather Jackets',
  description: 'Premium Leather Customization Platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/* GLOBAL THEME APPLIED HERE:
         - Font: Inter (via variable)
         - Background: bg-gray-50 (Light gray, not harsh white)
         - Text: text-gray-900 (Dark gray/black)
         - Selection: Indigo highlight for premium feel
      */}
      <body
        className={`${inter.variable} font-sans bg-gray-50 text-gray-900 antialiased selection:bg-indigo-100 selection:text-indigo-700`}
      >
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}