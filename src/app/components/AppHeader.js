"use client";

// Import React hooks for managing state and side effects
import React, { useEffect, useRef, useState } from "react";
// Import Link for fast client-side navigation between pages
import Link from "next/link";
// Import hooks to get the current route and navigation tools
import { useRouter, usePathname } from "next/navigation";
// Import Framer Motion for smooth animations
import { motion, AnimatePresence } from "framer-motion";
// Import global cart state to show the number of items in the cart
import { useCart } from "../context/CartContext";
// Import all the icons we need for the navigation menu
import {
  ShoppingCart,
  Sun,
  Moon,
  Bell,
  User,
  LogOut,
  Settings,
  Menu,
  X,
  Home,
  Shirt,
  Heart,
  MessageSquare,
  ChevronDown,
} from "lucide-react";
// Import custom components used inside the header
import UserAvatarMenu from "./AppUserAvatar";
import NotificationBell from "./NotificationBell";

/**
 * File: AppHeader.js
 * Description: The main top navigation bar for the entire website.
 * It changes its links based on whether the user is a Customer, Vendor, Supplier, or Admin.
 * Handles mobile menu toggling, profile dropdown, and shows the shopping cart count.
 */

export default function Header() {
  const router = useRouter(); // Used to redirect the user to other pages
  const pathname = usePathname(); // Gets the current URL path to highlight the active link

  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  // Get the cart count from the global context
  const { cartCount } = useCart(); 
  
  // Local state variables
  const [notificationCount, setNotificationCount] = useState(3); // Fake notification count for now
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false); // Controls desktop profile dropdown
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false); // Controls mobile hamburger menu
  const [isDarkMode, setDarkMode] = useState(false); // Controls light/dark mode toggle
  const [profile, setProfile] = useState(null); // Stores user's name and image from database
  const [userRole, setUserRole] = useState("customer"); // Determines which links to show
  const [loading, setLoading] = useState(true); // True while fetching user profile on first load

  // ==========================================
  // REFS
  // ==========================================
  // Refs are used to detect clicks outside the menus to close them automatically
  const menuRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // ==========================================
  // NAVIGATION LINKS CONFIGURATION
  // ==========================================
  // Define the menu links for each type of user
  const navLinks = {
    customer: [
      { name: "Dashboard", href: "/customer/dashboard", icon: Home },
      { name: "Customize", href: "/customer/customize", icon: Shirt },
      { name: "Shop", href: "/customer/shop", icon: ShoppingCart },
      { name: "Saved Designs", href: "/customer/designs", icon: Heart },
      { name: "Messages", href: "/customer/messages", icon: MessageSquare },
    ],
    vendor: [
      { name: "Dashboard", href: "/vendor/dashboard", icon: Home },
      { name: "Products", href: "/vendor/products", icon: Shirt },
      { name: "Orders", href: "/vendor/orders", icon: ShoppingCart },
      { name: "Settings", href: "/vendor/settings", icon: Settings },
    ],
    supplier: [
      { name: "Dashboard", href: "#", icon: Home }, // Coming Soon
      { name: "Materials", href: "#", icon: Shirt },
      { name: "Requests", href: "#", icon: ShoppingCart },
      { name: "Orders", href: "#", icon: Heart },
    ],
    admin: [
      { name: "Dashboard", href: "/admin/dashboard", icon: Home },
      { name: "Users", href: "/admin/users", icon: User },
      { name: "Vendors", href: "/admin/vendors", icon: Shirt },
      { name: "Reports", href: "#", icon: Heart }, // Coming Soon
    ],
  };

  // ==========================================
  // INITIALIZATION EFFECT
  // ==========================================
  // Runs once when the header loads. Checks local storage for tokens and fetches profile.
  useEffect(() => {
    // Safely check local storage (checking for 'window' prevents errors during server-side rendering)
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const role = typeof window !== "undefined" ? localStorage.getItem("userRole") : "customer";
    
    setUserRole(role || "customer"); // Fallback to customer if no role found
    
    // If they have a token, fetch their profile data from the API
    if (token) {
      fetchProfile(token);
    } else {
      setLoading(false); // Not logged in, so stop loading
    }
  }, []);

  // ==========================================
  // API: FETCH PROFILE
  // ==========================================
  // Calls the backend to get the user's name and picture
  const fetchProfile = async (token) => {
    try {
      const response = await fetch("/api/auth/profile", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Save the profile info to state so the UI can display it
        setProfile({
          firstName: data.first_name || data.firstName || "",
          lastName: data.last_name || data.lastName || "",
          email: data.email || "",
          profileImage: data.profile_image || null,
        });
      } else {
        // If token is invalid/expired, remove it
        localStorage.removeItem("token");
      }
    } catch (error) {
      console.error("Profile fetch error:", error);
    } finally {
      setLoading(false); // Always stop loading spinner when done
    }
  };

  // ==========================================
  // EFFECT: CLICK OUTSIDE TO CLOSE MENUS
  // ==========================================
  // This listens for clicks anywhere on the page and closes dropdowns if you click outside them
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if profile menu is open and the click was outside of it
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
      // Check if mobile menu is open and the click was outside of it
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setMobileMenuOpen(false);
      }
    };

    // Attach listener when component mounts
    document.addEventListener("click", handleClickOutside);
    // Cleanup listener when component unmounts
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // ==========================================
  // ACTION: HANDLE LOGOUT
  // ==========================================
  // Calls the logout API, clears local storage, and redirects to login screen
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch (error) {
      console.warn("Logout network error:", error);
    } finally {
      // Always clean up local storage even if API fails
      localStorage.removeItem("token");
      localStorage.removeItem("userRole");
      setProfile(null);
      // Send user back to the login page
      router.replace("/customer-auth/login");
    }
  };

  // Helper function to check if the current URL matches the link URL (used to highlight active links)
  const isActive = (href) => pathname === href;

  // Extract the first letter of the user's name for the fallback avatar, default to 'N' if no name
  const initials = profile?.firstName?.[0]?.toUpperCase() || "N";

  // Select the correct set of links to show based on if they are customer/vendor/etc.
  const currentNavLinks = navLinks[userRole] || navLinks.customer;

  // ==========================================
  // RENDER: LOADING STATE
  // ==========================================
  if (loading) {
    return (
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-center">
          <div className="text-gray-500 text-sm">Loading...</div>
        </div>
      </header>
    );
  }

  // ==========================================
  // RENDER: MAIN HEADER
  // ==========================================
  return (
    // Sticky header stays at the top of the screen when scrolling down
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
        <div className="flex items-center justify-between">
          
          {/* ==========================================
              LEFT SECTION: LOGO & DASHBOARD BUTTON 
              ========================================== */}
          <motion.div
            initial={{ opacity: 0, x: -10 }} // Slide in from left on load
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-4"
          >
            {/* The Logo Link back to homepage */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative w-10 h-10 flex items-center justify-center bg-[#1E293B] rounded-xl overflow-hidden shadow-lg group-hover:shadow-orange-500/20 transition-all">
                <div className="absolute inset-0 bg-gradient-to-br from-[#F97316] to-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <span className="relative z-10 text-white font-black text-xl italic tracking-tighter">S</span>
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-white/20 backdrop-blur-sm rounded-tl-lg" />
              </div>
              <div className="flex flex-col">
                <div className="text-xl font-black tracking-tighter flex items-center gap-0.5">
                  <span className="text-[#1E293B]">Stitch</span>
                </div>
                {/* Animated underline under 'Stitch' on hover */}
                <div className="h-0.5 w-0 bg-[#F97316] group-hover:w-full transition-all duration-500" />
              </div>
            </Link>

            {/* Vertical divider line (only shows if logged in) */}
            {profile && (
              <div className="hidden sm:block h-8 w-px bg-slate-200 mx-2" />
            )}

            {/* Dashboard Button next to logo (only shows if logged in) */}
            {profile && (
              <Link 
                href={`/${userRole}/dashboard`}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-orange-50 text-slate-500 hover:text-[#F97316] rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-transparent hover:border-orange-100 shadow-sm"
              >
                <Home size={14} />
                Dashboard
              </Link>
            )}
          </motion.div>

          {/* ==========================================
              CENTER SECTION: DESKTOP NAVIGATION LINKS 
              ========================================== */}
          {/* Hidden on mobile (lg:flex means show only on large screens) */}
          <nav className="hidden lg:flex items-center gap-1">
            {/* Loop over the nav links for the current role and render them */}
            {currentNavLinks.map(({ name, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                // If it's the active page, color it indigo. Otherwise gray.
                className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${isActive(href)
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-gray-700 hover:bg-gray-50"
                  }`}
              >
                <Icon size={16} />
                {name}
              </Link>
            ))}
          </nav>

          {/* ==========================================
              RIGHT SECTION: ACTIONS & PROFILE 
              ========================================== */}
          <div className="flex items-center gap-2 md:gap-4">
            
            {/* Search Bar (Desktop only) */}
            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition">
              <svg
                className="w-4 h-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent text-sm text-gray-600 placeholder-gray-500 outline-none w-32"
              />
            </div>

            {/* Notification Bell Component */}
            <NotificationBell 
                role={userRole} 
                tokenKey={userRole === 'customer' ? 'token' : userRole === 'vendor' ? 'vendorToken' : userRole === 'admin' ? 'adminToken' : 'supplierToken'} 
            />

            {/* Shopping Cart Icon (Only shows for Customers) */}
            {userRole === "customer" && (
              // Add a bouncy animation when user hovers or taps the cart
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href="/customer/cart"
                  className="relative p-2 rounded-xl hover:bg-gray-100 transition inline-block"
                >
                  <ShoppingCart size={20} className="text-gray-600" />
                  {/* If there are items in the cart, show the red badge with the number */}
                  {cartCount > 0 && (
                    <motion.span
                      key={cartCount} // Changing key triggers the bounce animation when count updates
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
                    >
                      {cartCount}
                    </motion.span>
                  )}
                </Link>
              </motion.div>
            )}

            {/* Dark Mode Toggle Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setDarkMode(!isDarkMode)} // Flip the boolean when clicked
              className="p-2 rounded-xl hover:bg-gray-100 transition hidden sm:block"
              aria-label="Toggle theme"
            >
              {/* Swap icons depending on current mode */}
              {isDarkMode ? (
                <Sun size={20} className="text-gray-600" />
              ) : (
                <Moon size={20} className="text-gray-600" />
              )}
            </motion.button>

            {/* Profile Dropdown Component (Desktop only) */}
            <div className="hidden sm:block">
              <UserAvatarMenu
                initials={initials}
                profileImage={profile?.profileImage}
                isOpen={isProfileMenuOpen}
                onToggle={() => setProfileMenuOpen(!isProfileMenuOpen)}
                onLogout={handleLogout}
              />
            </div>

            {/* Mobile Hamburger Menu Button (Only shows on small screens) */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition"
              aria-label="Toggle menu"
            >
              {/* Show X if open, Hamburger if closed */}
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </motion.button>
          </div>
        </div>

        {/* ==========================================
            MOBILE MENU DROPDOWN PANEL 
            ========================================== */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.nav
              ref={mobileMenuRef}
              initial={{ opacity: 0, height: 0 }} // Starts invisible with 0 height
              animate={{ opacity: 1, height: "auto" }} // Slides down smoothly
              exit={{ opacity: 0, height: 0 }} // Slides up smoothly when closed
              transition={{ duration: 0.2 }}
              className="lg:hidden mt-4 space-y-2 border-t border-gray-100 pt-4"
            >
              {/* Render the standard navigation links */}
              {currentNavLinks.map(({ name, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${isActive(href)
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-gray-700 hover:bg-gray-50"
                    }`}
                  onClick={() => setMobileMenuOpen(false)} // Close menu when a link is clicked
                >
                  <Icon size={18} />
                  {name}
                </Link>
              ))}

              {/* Mobile Profile Section Links (Settings & Logout) */}
              <div className="border-t border-gray-100 pt-4 mt-4">
                <Link
                  href={`/${userRole}/profile`}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User size={18} />
                  Profile
                </Link>
                <Link
                  href={`/${userRole}/settings`}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Settings size={18} />
                  Settings
                </Link>
                {/* Mobile Logout Button */}
                <button
                  onClick={() => {
                    handleLogout(); // Call logout logic
                    setMobileMenuOpen(false); // Close the mobile menu
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm text-rose-600 hover:bg-rose-50"
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}