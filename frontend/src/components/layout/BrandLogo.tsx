import { useId } from "react";
/**
 * My Govt Jobs brand mark — bell + live dot on saffron-gold gradient.
 */
export default function BrandLogo({ size = 36, className = "" }) {
  const uid = useId().replace(/:/g, "");
  const bgId = `sa-brand-bg-${uid}`;
  const shineId = `sa-brand-shine-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`brand-logo ${className}`.trim()}
      aria-hidden
    >
      <defs>
        <linearGradient id={bgId} x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF6B00" />
          <stop offset="1" stopColor="#FFAA00" />
        </linearGradient>
        <linearGradient id={shineId} x1="8" y1="6" x2="28" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.35" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill={`url(#${bgId})`} />
      <rect width="40" height="40" rx="10" fill={`url(#${shineId})`} />
      {/* Bell body */}
      <path
        d="M20 9.5c-3.6 0-6.5 2.9-6.5 6.5v4.2c0 .8-.3 1.6-.9 2.2l-1.4 1.4c-.4.4-.1 1.2.4 1.2h17.8c.5 0 .8-.8.4-1.2l-1.4-1.4c-.6-.6-.9-1.4-.9-2.2v-4.2c0-3.6-2.9-6.5-6.5-6.5Z"
        fill="#0C1220"
      />
      {/* Bell clapper */}
      <path d="M16.2 28.8c.9 1.5 2.5 2.5 4.3 2.5s3.4-1 4.3-2.5" stroke="#0C1220" strokeWidth="1.8" strokeLinecap="round" />
      {/* Bell top */}
      <circle cx="20" cy="9" r="1.6" fill="#0C1220" />
      {/* Live alert dot */}
      <circle cx="28.5" cy="11.5" r="4.2" fill="#22C55E" stroke="#0C1220" strokeWidth="1.5" />
      {/* Tricolor accent strip */}
      <rect x="8" y="33" width="7" height="2.2" rx="1.1" fill="#138808" opacity="0.9" />
      <rect x="16.5" y="33" width="7" height="2.2" rx="1.1" fill="#FFFFFF" opacity="0.85" />
      <rect x="25" y="33" width="7" height="2.2" rx="1.1" fill="#FF6B00" opacity="0.95" />
    </svg>
  );
}
