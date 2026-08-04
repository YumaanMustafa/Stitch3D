"use client";
// Import React hooks for tracking state and side effects
import { useState } from "react";
// Import framer-motion for smooth drop-down animations
import { motion, AnimatePresence } from "framer-motion";
// Import icons used inside the dropdown menu
import {
  User as UserIcon,
  Settings,
  LogOut,
  AlertTriangle,
} from "lucide-react";

/**
 * File: AppUserAvatar.js
 * Description: User Profile Avatar button & Dropdown Menu.
 * Shows the user's initials or profile picture. Clicking it opens a dropdown
 * with links to Profile, Settings, and Logout.
 * Includes a confirmation popup when the user tries to logout.
 */

// UserAvatarMenu component
// initials: letters to show if no image is available
// profileImage: URL of user's uploaded profile picture
// isOpen: boolean controlling if the dropdown is currently open
// onToggle: function called when the avatar button is clicked
// onLogout: function called when the user confirms they want to logout
export default function UserAvatarMenu({
  initials,
  profileImage,
  isOpen,
  onToggle,
  onLogout,
}) {
  // State to control whether the logout confirmation popup is visible
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Called when user clicks the "Logout" option in the dropdown menu
  const handleLogoutClick = () => {
    // Show the confirmation popup instead of logging out immediately
    setShowLogoutConfirm(true);
  };

  // Called when user clicks "Cancel" in the logout popup
  const handleCancelLogout = () => {
    // Hide the confirmation popup
    setShowLogoutConfirm(false);
  };

  // Called when user clicks "Logout" in the confirmation popup
  const handleConfirmLogout = () => {
    // Hide the popup and call the actual logout function passed from parent
    setShowLogoutConfirm(false);
    onLogout();
  };

  return (
    <>
      {/* Avatar Button & Dropdown Menu Container */}
      <div className="relative">
        {/* The clickable avatar button */}
        <motion.button
          onClick={onToggle}
          whileTap={{ scale: 0.96 }}
          className="p-2 rounded-lg bg-white border border-slate-300 shadow-sm flex items-center justify-center hover:border-slate-400 transition-colors"
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold overflow-hidden">
            {/* If user has a profile image, show it, otherwise show their initials */}
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
        </motion.button>

        {/* AnimatePresence handles the smooth slide-in and fade-out of the dropdown */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className="absolute right-0 mt-3 w-44 bg-white rounded-lg shadow-xl border border-slate-200 z-40 overflow-hidden"
            >
              {/* Profile Link */}
              <a
                href="/customer/profile"
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <UserIcon className="w-4 h-4 text-indigo-600" />
                Profile
              </a>

              {/* Settings Link */}
              <a
                href="/customer/settings"
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Settings className="w-4 h-4 text-slate-600" />
                Settings
              </a>

              {/* Logout Button inside the dropdown */}
              <button
                onClick={handleLogoutClick}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors text-left"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Logout Confirmation Modal Overlay */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Dark background overlay behind the modal */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={handleCancelLogout}
            />

            {/* The white confirmation box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-slate-100"
            >
              <div className="flex flex-col items-center text-center">
                {/* Warning icon */}
                <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-6 h-6 text-rose-600" />
                </div>

                <h3 className="text-lg font-bold text-slate-900">
                  Logout
                </h3>

                <p className="mt-2 text-slate-600">
                  Are you sure you want to logout?
                </p>

                {/* Cancel and Confirm buttons side by side */}
                <div className="mt-6 flex gap-3 w-full">
                  <button
                    onClick={handleCancelLogout}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleConfirmLogout}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 transition-colors shadow-lg shadow-rose-500/30"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
