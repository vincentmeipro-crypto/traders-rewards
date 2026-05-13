export default function Logo({ size = 40, full = false }: { size?: number; full?: boolean }) {
  const w = full ? 280 : size;
  const h = full ? 320 : size;

  return (
    <svg width={w} height={h} viewBox={full ? "0 0 280 320" : "0 0 100 100"} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"  stopColor="#6B4A10" />
          <stop offset="30%" stopColor="#C9A84C" />
          <stop offset="60%" stopColor="#FFD770" />
          <stop offset="100%" stopColor="#A07830" />
        </linearGradient>
        <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"  stopColor="#8B6010" />
          <stop offset="50%" stopColor="#E8C96C" />
          <stop offset="100%" stopColor="#C9A84C" />
        </linearGradient>
        <radialGradient id="sparkGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"  stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="30%" stopColor="#FFE88A" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#C9A84C" stopOpacity="0" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {full ? (
        /* ── FULL LOGO (emblem + ELYSIUM FUNDED text) ── */
        <g>
          {/* Circle — open at top-right for sparkle */}
          <path
            d="M 140 18 A 72 72 0 1 0 197 33"
            stroke="url(#g1)" strokeWidth="2.5" fill="none" strokeLinecap="round"
          />

          {/* ── COLUMN (left side) ── */}
          {/* Base plate */}
          <rect x="62" y="145" width="38" height="5" rx="1" fill="url(#g1)" />
          {/* Plinth */}
          <rect x="65" y="140" width="32" height="5" rx="1" fill="url(#g1)" />
          {/* Shaft with fluting (7 lines) */}
          {[0,1,2,3,4,5,6].map(i => (
            <rect key={i} x={67 + i * 3.8} y={78} width={2.2} height={62} rx="1" fill="url(#g2)" />
          ))}
          {/* Echine (neck) */}
          <rect x="65" y="73" width="32" height="5" rx="1" fill="url(#g1)" />
          {/* Capital curved */}
          <path d="M63 73 Q81 63 99 73" stroke="url(#g1)" strokeWidth="3" fill="none" />
          {/* Abacus (top plate) */}
          <rect x="61" y="60" width="40" height="6" rx="1" fill="url(#g1)" />

          {/* ── LETTER E ── */}
          {/* Top bar */}
          <rect x="98" y="60" width="50" height="9" rx="2" fill="url(#g1)" />
          {/* Middle bar */}
          <rect x="98" y="93" width="38" height="8" rx="2" fill="url(#g1)" />
          {/* Bottom bar */}
          <rect x="98" y="136" width="50" height="9" rx="2" fill="url(#g1)" />
          {/* Right vertical serif top */}
          <rect x="143" y="60" width="5" height="5" rx="1" fill="url(#g1)" />
          <rect x="143" y="144" width="5" height="5" rx="1" fill="url(#g1)" />

          {/* ── SPARKLE (top-right of circle) ── */}
          <g filter="url(#glow)">
            <circle cx="199" cy="34" r="5" fill="url(#sparkGlow)" opacity="0.9" />
            <line x1="199" y1="20" x2="199" y2="48" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="185" y1="34" x2="213" y2="34" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="189" y1="24" x2="209" y2="44" stroke="#FFE88A" strokeWidth="0.8" strokeLinecap="round" />
            <line x1="209" y1="24" x2="189" y2="44" stroke="#FFE88A" strokeWidth="0.8" strokeLinecap="round" />
          </g>

          {/* ── TEXT: ELYSIUM ── */}
          <text x="140" y="198" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif"
            fontSize="36" fontWeight="700" letterSpacing="8" fill="url(#g1)">
            ELYSIUM
          </text>

          {/* ── TEXT: — FUNDED — ── */}
          <line x1="52" y1="218" x2="100" y2="218" stroke="url(#g1)" strokeWidth="1" />
          <text x="140" y="224" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif"
            fontSize="16" fontWeight="400" letterSpacing="6" fill="url(#g1)">
            FUNDED
          </text>
          <line x1="180" y1="218" x2="228" y2="218" stroke="url(#g1)" strokeWidth="1" />
        </g>
      ) : (
        /* ── EMBLEM ONLY (navbar / small) ── */
        <g>
          {/* Circle */}
          <path d="M 50 6 A 44 44 0 1 0 79 15" stroke="url(#g1)" strokeWidth="2" fill="none" strokeLinecap="round" />

          {/* Column */}
          <rect x="18" y="86" width="24" height="3.5" rx="1" fill="url(#g1)" />
          <rect x="20" y="82" width="20" height="4" rx="1" fill="url(#g1)" />
          {[0,1,2,3,4].map(i => (
            <rect key={i} x={21 + i * 3.2} y={48} width={2} height={34} rx="1" fill="url(#g2)" />
          ))}
          <rect x="19" y="44" width="22" height="4" rx="1" fill="url(#g1)" />
          <path d="M17 44 Q30 37 43 44" stroke="url(#g1)" strokeWidth="2" fill="none" />
          <rect x="16" y="36" width="26" height="4" rx="1" fill="url(#g1)" />

          {/* E */}
          <rect x="41" y="36" width="32" height="6" rx="1.5" fill="url(#g1)" />
          <rect x="41" y="56" width="24" height="5.5" rx="1.5" fill="url(#g1)" />
          <rect x="41" y="83" width="32" height="6" rx="1.5" fill="url(#g1)" />

          {/* Sparkle */}
          <g filter="url(#glow)">
            <circle cx="80" cy="16" r="3.5" fill="url(#sparkGlow)" />
            <line x1="80" y1="8" x2="80" y2="24" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="72" y1="16" x2="88" y2="16" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="74" y1="10" x2="86" y2="22" stroke="#FFE88A" strokeWidth="0.7" strokeLinecap="round" opacity="0.7" />
            <line x1="86" y1="10" x2="74" y2="22" stroke="#FFE88A" strokeWidth="0.7" strokeLinecap="round" opacity="0.7" />
          </g>
        </g>
      )}
    </svg>
  );
}
