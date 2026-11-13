/**
 * ARMS - Intercom Logo Component
 * Guaranteed crisp SVG rendering with explicit dimensions and high contrast.
 */

import React from 'react';

interface IntercomLogoProps {
  className?: string;
  variant?: 'white' | 'color' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const IntercomLogo: React.FC<IntercomLogoProps> = ({
  className = '',
  variant = 'dark',
  size = 'md',
  showText = true,
}) => {
  const pixelSizes = {
    sm: { w: 20, h: 20 },
    md: { w: 28, h: 28 },
    lg: { w: 36, h: 36 },
  };

  const { w, h } = pixelSizes[size];
  const isWhite = variant === 'white';

  return (
    <div className={`flex items-center gap-2 select-none shrink-0 ${className}`}>
      {/* Intercom Symbol Icon */}
      <svg
        width={w}
        height={h}
        viewBox="0 0 32 32"
        className="shrink-0"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {isWhite ? (
          <>
            <rect width="32" height="28" rx="6" fill="#FFFFFF" />
            <path d="M7 28L14 28L5 33L7 28Z" fill="#FFFFFF" />
            {/* 4 vertical bars */}
            <rect x="6.5" y="9.5" width="3" height="11" rx="1.5" fill="#000000" />
            <rect x="11.5" y="6.5" width="3" height="17" rx="1.5" fill="#000000" />
            <rect x="16.5" y="6.5" width="3" height="17" rx="1.5" fill="#000000" />
            <rect x="21.5" y="9.5" width="3" height="11" rx="1.5" fill="#000000" />
          </>
        ) : (
          <>
            {/* Crisp background badge */}
            <rect width="32" height="28" rx="6" fill="#0F172A" className="dark:fill-white" />
            <path d="M7 28L14 28L5 33L7 28Z" fill="#0F172A" className="dark:fill-white" />
            {/* 4 vertical bars */}
            <rect x="6.5" y="9.5" width="3" height="11" rx="1.5" fill="#FFFFFF" className="dark:fill-slate-900" />
            <rect x="11.5" y="6.5" width="3" height="17" rx="1.5" fill="#FFFFFF" className="dark:fill-slate-900" />
            <rect x="16.5" y="6.5" width="3" height="17" rx="1.5" fill="#FFFFFF" className="dark:fill-slate-900" />
            <rect x="21.5" y="9.5" width="3" height="11" rx="1.5" fill="#FFFFFF" className="dark:fill-slate-900" />
          </>
        )}
      </svg>

      {/* Typography */}
      {showText && (
        <span
          className={`font-extrabold tracking-tight text-base sm:text-lg lowercase leading-none ${
            isWhite ? 'text-white' : 'text-slate-900 dark:text-white'
          }`}
          style={{ letterSpacing: '-0.04em' }}
        >
          intercom
        </span>
      )}
    </div>
  );
};
