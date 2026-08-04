// File: app/layout.js
// This is the root layout file that wraps every page in the entire application.
// It loads the global font and CSS, and provides the CartProvider context to all pages.

// Import the Inter font from Google Fonts via Next.js built-in font optimization
import { Inter } from 'next/font/google';
// Import global CSS styles that apply to the entire application
import './globals.css';

// Import CartProvider which wraps the app so any component can access the shopping cart
import { CartProvider } from './context/CartContext';

// Configure the Inter font with the Latin character set and assign it to a CSS variable
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

// metadata object is used by Next.js to set the browser tab title and meta description for SEO
export const metadata = {
  title: 'Stitch | Custom Leather Jackets',
  description: 'Premium Leather Customization Platform',
};

// RootLayout is the top-level layout that wraps every single page in the app
// children: the content of whatever page the user is currently visiting
export default function RootLayout({ children }) {
  return (
    // Set the HTML language attribute to English
    <html lang="en">
      {/* Apply global theme classes to the body:
          - inter.variable: makes the Inter font variable available in CSS
          - font-sans: applies the sans-serif font stack
          - bg-gray-50: light gray background instead of harsh white
          - text-gray-900: near-black text color
          - antialiased: smooths font rendering on screens
          - selection: indigo highlight when user selects text
      */}
      <body
        className={`${inter.variable} font-sans bg-gray-50 text-gray-900 antialiased selection:bg-indigo-100 selection:text-indigo-700`}
      >
        {/* CartProvider wraps all pages so the cart state is available throughout the app */}
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}