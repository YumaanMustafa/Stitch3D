"use client";
// Import Image component from Next.js for optimized image loading
import Image from "next/image";
// Import useState to track if the logo image fails to load
import { useState } from "react";

/**
 * File: Logo.js
 * Description: Brand Logo component.
 * Displays the application logo image.
 * Accepts width, height, and priority props to control display size and loading behavior.
 */

// Logo component displays the site logo image
// width: how wide the logo should be in pixels (default 140)
// height: how tall the logo should be in pixels (default 40)
// priority: if true, tells Next.js to load this image first before others
export default function Logo({ width = 140, height = 40, priority = false }) {
  // src stores the path to the logo image file
  const [src, setSrc] = useState("/uploads/logo.png");

  return (
    // Next.js Image component with optimized loading and correct dimensions
    <Image
      src={src}
      alt="Application Logo"
      width={width}
      height={height}
      priority={priority}
      // onError callback (currently commented out) would switch to a fallback logo if the main one fails to load
      //   onError={() => setSrc("/uploads/logos/logo-fallback.png")}
      className="object-contain"
    />
  );
}
