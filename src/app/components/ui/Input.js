import React from "react";

export default function Input({
  label,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  touched,
  className = "",
  textarea = false,
  rows = 4,
  ...props
}) {
  const baseStyles = "w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 transition-all duration-200 ease-in-out focus:outline-none focus:border-[var(--color-accent-orange)] focus:ring-4 focus:ring-[var(--color-accent-orange)]/10";
  const errorStyles = (touched && error) ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20 bg-rose-50/30" : "";

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={name} className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">
          {label}
        </label>
      )}

      {textarea ? (
        <textarea
          id={name}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          rows={rows}
          className={`${baseStyles} ${errorStyles} resize-y`}
          {...props}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          className={`${baseStyles} ${errorStyles}`}
          {...props}
        />
      )}

      {touched && error && (
        <p className="mt-1.5 text-xs font-bold text-rose-500 ml-1 animate-fade-in flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
