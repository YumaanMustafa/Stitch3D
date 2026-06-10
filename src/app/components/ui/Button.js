import React from "react";

export default function Button({
  children,
  onClick,
  variant = "solid",
  type = "button",
  disabled = false,
  className = "",
  fullWidth = false,
}) {
  const baseStyles = "inline-flex items-center justify-center font-bold text-sm tracking-wide transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl";

  const variants = {
    solid: "bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] shadow-md hover:shadow-lg hover:-translate-y-0.5 focus:ring-[var(--color-brand)]",
    outline: "bg-transparent border-2 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 focus:ring-slate-200",
    ghost: "bg-transparent text-slate-600 hover:text-[var(--color-brand)] hover:bg-slate-100 focus:ring-slate-200",
    danger: "bg-rose-500 text-white hover:bg-rose-600 shadow-md hover:shadow-lg focus:ring-rose-500",
  };

  const spacing = "px-6 py-3";
  const width = fullWidth ? "w-full" : "";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${spacing} ${width} ${className}`}
    >
      {children}
    </button>
  );
}
