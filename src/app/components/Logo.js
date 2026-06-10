"use client";
import Image from "next/image";
import { useState } from "react";

/**
 * @file Logo.js
 * @description Brand Logo component.
 * Displays the application logo with optional fallback.
 */

export default function Logo({ width = 140, height = 40, priority = false }) {
  const [src, setSrc] = useState("/uploads/logo.png");

  return (
    <Image
      src={src}
      alt="Application Logo"
      width={width}
      height={height}
      priority={priority}
      //   onError={() => setSrc("/uploads/logos/logo-fallback.png")}
      className="object-contain"
    />
  );
}
