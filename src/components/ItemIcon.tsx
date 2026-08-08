// ============ 黑市拍卖行 · 手绘 SVG 美术 ============
// 为 8 个藏品类别提供统一的"古董细密画"风插画，
// 以及排行榜奖章、王冠、首页印章与钱币图标。
// 纯展示组件，无状态、无外部依赖。
import type { Category } from "@/game/types";
import type { ReactElement } from "react";

export type ItemIconSize = "lg" | "md" | "sm";

/* ---------------- 绘画：金色画框 + 月下山水的夜航图 ---------------- */
function PaintingArt(): ReactElement {
  return (
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="pt-frame" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f5d97a" />
          <stop offset="0.5" stopColor="#d4af37" />
          <stop offset="1" stopColor="#7c621f" />
        </linearGradient>
        <linearGradient id="pt-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b2340" />
          <stop offset="0.62" stopColor="#2c2a52" />
          <stop offset="1" stopColor="#3a2f5c" />
        </linearGradient>
        <radialGradient id="pt-moon" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff6d8" />
          <stop offset="1" stopColor="#e8c55c" />
        </radialGradient>
        <linearGradient id="pt-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a2f5c" />
          <stop offset="1" stopColor="#171225" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="108" height="108" rx="11" fill="none" stroke="url(#pt-frame)" strokeWidth="5" />
      <rect x="13.5" y="13.5" width="93" height="93" rx="6" fill="#101020" stroke="url(#pt-frame)" strokeWidth="2" />
      <rect x="19" y="19" width="82" height="82" rx="3" fill="url(#pt-sky)" />
      <circle cx="78" cy="36" r="11" fill="url(#pt-moon)" opacity="0.95" />
      <circle cx="81" cy="33" r="2.6" fill="#fff6d8" opacity="0.8" />
      <path d="M19 78 L42 46 L58 66 L70 52 L101 78 Z" fill="#0d0b18" />
      <path d="M19 83 L44 57 L60 75 L74 59 L101 83 Z" fill="#141126" />
      <rect x="19" y="82" width="82" height="19" fill="url(#pt-water)" />
      <path d="M26 88 h20 M56 90 h26 M30 96 h34" stroke="#f5d97a" strokeWidth="1.2" opacity="0.35" strokeLinecap="round" />
      <path d="M6 16 v-6 h6" stroke="url(#pt-frame)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M114 16 v-6 h-6" stroke="url(#pt-frame)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M6 104 v6 h6" stroke="url(#pt-frame)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M114 104 v6 h-6" stroke="url(#pt-frame)" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------- 珠宝：金戒 + 泣血红宝石 ---------------- */
function JewelryArt(): ReactElement {
  return (
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="jwl-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f5d97a" />
          <stop offset="0.5" stopColor="#d4af37" />
          <stop offset="1" stopColor="#7c621f" />
        </linearGradient>
        <radialGradient id="jwl-gem" cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#ff9d92" />
          <stop offset="0.45" stopColor="#e04a3f" />
          <stop offset="1" stopColor="#6e1410" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="66" rx="30" ry="18" fill="none" stroke="url(#jwl-gold)" strokeWidth="7" />
      <ellipse cx="60" cy="66" rx="30" ry="18" fill="none" stroke="#fff3cf" strokeWidth="1.4" opacity="0.45" />
      <path d="M44 52 L46 44 L52 48 Z" fill="url(#jwl-gold)" />
      <path d="M76 52 L74 44 L68 48 Z" fill="url(#jwl-gold)" />
      <path d="M60 20 L76 44 L60 58 L44 44 Z" fill="url(#jwl-gem)" stroke="#ffb3aa" strokeWidth="1" />
      <path d="M60 20 L60 58 M44 44 L76 44 M60 20 L44 44 M60 20 L76 44 M44 44 L60 58 M76 44 L60 58"
        stroke="#ffd2cc" strokeWidth="0.9" opacity="0.6" />
      <path d="M78 26 l2.2 5.2 5.2 2.2 -5.2 2.2 -2.2 5.2 -2.2 -5.2 -5.2 -2.2 5.2 -2.2 Z" fill="#fff6d8" opacity="0.9" />
      <path d="M34 50 l3 5 -3 5 -3 -5 Z" fill="url(#jwl-gold)" opacity="0.7" />
      <path d="M86 50 l3 5 -3 5 -3 -5 Z" fill="url(#jwl-gold)" opacity="0.7" />
    </svg>
  );
}

/* ---------------- 古币：蟠龙方孔金饼 ---------------- */
function CoinArt(): ReactElement {
  const ticks = Array.from({ length: 16 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 16;
    return { x: 60 + Math.cos(a) * 41.5, y: 60 + Math.sin(a) * 41.5, key: i };
  });
  return (
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <radialGradient id="coin-face" cx="0.4" cy="0.35" r="0.85">
          <stop offset="0" stopColor="#f5d97a" />
          <stop offset="0.6" stopColor="#d4af37" />
          <stop offset="1" stopColor="#8a6d1f" />
        </radialGradient>
        <linearGradient id="coin-edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f5d97a" />
          <stop offset="1" stopColor="#6e5518" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="42" fill="url(#coin-edge)" />
      <circle cx="60" cy="60" r="37" fill="url(#coin-face)" />
      <circle cx="60" cy="60" r="42" fill="none" stroke="#7c621f" strokeWidth="2" />
      {ticks.map((t) => <circle key={t.key} cx={t.x} cy={t.y} r="1.6" fill="#f5d97a" opacity="0.85" />)}
      <path d="M60 30 c10 4 14 12 10 20 c-3 7 -12 8 -16 3 c-5 -6 -2 -13 6 -14" fill="none" stroke="#6e5518" strokeWidth="3" strokeLinecap="round" />
      <path d="M74 30 c8 2 12 9 9 16 c-3 7 -10 9 -14 6" fill="none" stroke="#6e5518" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="72" cy="28" r="2" fill="#6e5518" />
      <path d="M46 52 c-6 4 -8 12 -4 18 c4 6 12 8 18 4" fill="none" stroke="#6e5518" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M48 62 l-4 -6 M52 66 l-3 -7 M58 70 l-2 -8" stroke="#6e5518" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="52" y="52" width="16" height="16" rx="2" fill="#171225" stroke="#6e5518" strokeWidth="1.5" />
    </svg>
  );
}

/* ---------------- 武器：交叉的古董刀剑 ---------------- */
function WeaponArt(): ReactElement {
  return (
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="wpn-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f5d97a" />
          <stop offset="0.5" stopColor="#d4af37" />
          <stop offset="1" stopColor="#7c621f" />
        </linearGradient>
        <linearGradient id="wpn-steel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f2f4f8" />
          <stop offset="0.5" stopColor="#b9c0cc" />
          <stop offset="1" stopColor="#7d8696" />
        </linearGradient>
      </defs>
      <g transform="rotate(38 60 60)">
        <path d="M52 96 L96 52" stroke="url(#wpn-steel)" strokeWidth="7" strokeLinecap="round" />
        <path d="M52 96 L96 52" stroke="#ffffff" strokeWidth="1.4" opacity="0.6" />
        <path d="M46 102 L52 96 L58 102 Z" fill="url(#wpn-gold)" />
        <rect x="40" y="100" width="6" height="14" rx="2" fill="url(#wpn-gold)" />
        <circle cx="43" cy="116" r="4" fill="url(#wpn-gold)" />
        <path d="M48 92 c-6 -3 -6 -9 0 -12 M60 98 c4 -3 10 -3 14 0" stroke="url(#wpn-gold)" strokeWidth="4" strokeLinecap="round" fill="none" />
      </g>
      <g transform="rotate(-38 60 60)">
        <path d="M58 20 L100 62" stroke="url(#wpn-steel)" strokeWidth="6" strokeLinecap="round" />
        <path d="M58 20 L100 62" stroke="#ffffff" strokeWidth="1.2" opacity="0.55" />
        <path d="M52 18 L58 12 L64 18 Z" fill="url(#wpn-gold)" />
        <rect x="50" y="10" width="5" height="12" rx="2" fill="url(#wpn-gold)" />
        <circle cx="52.5" cy="8" r="3.6" fill="url(#wpn-gold)" />
        <path d="M58 24 c-6 -3 -6 -9 0 -12" stroke="url(#wpn-gold)" strokeWidth="3.4" strokeLinecap="round" fill="none" />
      </g>
      <path d="M30 30 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2 Z" fill="#f5d97a" opacity="0.85" />
      <path d="M92 88 l1.6 3.4 3.4 1.6 -3.4 1.6 -1.6 3.4 -1.6 -3.4 -3.4 -1.6 3.4 -1.6 Z" fill="#f5d97a" opacity="0.7" />
    </svg>
  );
}

/* ---------------- 拍品图标组件 ---------------- */
const CATEGORY_ART: Record<Category, ReactElement> = {
  绘画: <PaintingArt />,
  珠宝: <JewelryArt />,
  古币: <CoinArt />,
  武器: <WeaponArt />,
  酒: <WineArt />,
  手稿: <ManuscriptArt />,
  雕塑: <SculptureArt />,
  奇物: <CurioArt />,
};

export function ItemIcon({
  category,
  size = "md",
  className,
}: {
  category: Category;
  size?: ItemIconSize;
  className?: string;
}): ReactElement {
  return (
    <span className={`item-icon ${size}${className ? ` ${className}` : ""}`} aria-hidden="true">
      {CATEGORY_ART[category]}
    </span>
  );
}

/* ---------------- 酒：蜡封陈酿 + 藤蔓 ---------------- */
function WineArt(): ReactElement {
  return (
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="wine-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2a1a14" />
          <stop offset="0.25" stopColor="#4a2c1e" />
          <stop offset="0.55" stopColor="#5d3a26" />
          <stop offset="1" stopColor="#241610" />
        </linearGradient>
        <linearGradient id="wine-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f5d97a" />
          <stop offset="1" stopColor="#8a6d1f" />
        </linearGradient>
        <radialGradient id="wine-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#f0a04c" stopOpacity="0.32" />
          <stop offset="1" stopColor="#f0a04c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="58" r="42" fill="url(#wine-glow)" />
      <path d="M49 22 h22 v14 h4 c0 8 0 10 -4 10 h-22 c-4 0 -4 -2 -4 -10 h4 Z" fill="url(#wine-body)" stroke="#7a4a2e" strokeWidth="1.2" />
      <path d="M45 46 h30 v42 c0 10 -8 16 -15 16 s-15 -6 -15 -16 Z" fill="url(#wine-body)" stroke="#7a4a2e" strokeWidth="1.2" />
      <path d="M49 50 c0 10 1 16 2 22 l4 0 c-1 -8 -1 -14 -1 -22 Z" fill="#e8b27a" opacity="0.26" />
      <path d="M50 16 a6 6 0 0 1 12 0 v4 h-12 Z" fill="#a3322a" stroke="#c44a40" strokeWidth="1" />
      <rect x="50" y="62" width="20" height="16" rx="2" fill="#f3e3c0" stroke="#8a6d1f" strokeWidth="1.2" />
      <rect x="53" y="66" width="14" height="8" rx="1" fill="none" stroke="#8a6d1f" strokeWidth="0.8" />
      <path d="M56 72 h8" stroke="#8a6d1f" strokeWidth="1" />
      <path d="M30 84 c-6 -8 -4 -20 2 -26 c5 -5 12 -4 15 0" fill="none" stroke="#3e8f5a" strokeWidth="2" strokeLinecap="round" />
      <path d="M36 74 l-3 -8 9 2 Z" fill="#3e8f5a" opacity="0.85" />
      <path d="M44 66 l-2 -8 8 3 Z" fill="#3e8f5a" opacity="0.7" />
      <circle cx="33" cy="80" r="3.4" fill="#7a4a2e" />
    </svg>
  );
}

/* ---------------- 手稿：摊开的信笺 + 火漆印 + 羽毛笔 ---------------- */
function ManuscriptArt(): ReactElement {
  return (
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="ms-paper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6ecd4" />
          <stop offset="1" stopColor="#e3d2a8" />
        </linearGradient>
        <radialGradient id="ms-seal" cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#c44a40" />
          <stop offset="1" stopColor="#7a1f18" />
        </radialGradient>
      </defs>
      <path d="M20 30 c14 -6 30 -6 42 0 v62 c-12 -6 -28 -6 -42 0 Z" fill="url(#ms-paper)" stroke="#b39a62" strokeWidth="1.4" />
      <path d="M58 30 c14 -6 30 -6 42 0 v62 c-12 -6 -28 -6 -42 0 Z" fill="url(#ms-paper)" stroke="#b39a62" strokeWidth="1.4" />
      <line x1="58" y1="30" x2="58" y2="92" stroke="#b39a62" strokeWidth="1.6" />
      <path d="M26 42 h24 M26 52 h20 M26 62 h24 M26 72 h18 M26 82 h22" stroke="#7a6840" strokeWidth="1.1" opacity="0.5" />
      <path d="M64 42 h24 M64 52 h20 M64 62 h24 M64 72 h18 M64 82 h22" stroke="#7a6840" strokeWidth="1.1" opacity="0.5" />
      <path d="M92 26 c-6 -8 -18 -6 -22 2 c-3 6 2 10 8 8 c4 -1 8 -5 6 -10" fill="#f2f4f8" stroke="#b9c0cc" strokeWidth="1" />
      <path d="M82 30 l-10 18" stroke="#c9a86a" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="58" cy="96" r="8" fill="url(#ms-seal)" stroke="#8a2a20" strokeWidth="1" />
      <path d="M53 96 l4 -4 4 4 -4 4 Z" fill="none" stroke="#f0a04c" strokeWidth="0.9" opacity="0.8" />
    </svg>
  );
}

/* ---------------- 雕塑：大理石半身像 ---------------- */
function SculptureArt(): ReactElement {
  return (
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="scp-marble" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4f1ea" />
          <stop offset="0.55" stopColor="#d9d2c4" />
          <stop offset="1" stopColor="#a99f8e" />
        </linearGradient>
        <linearGradient id="scp-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f5d97a" />
          <stop offset="1" stopColor="#8a6d1f" />
        </linearGradient>
      </defs>
      <rect x="32" y="86" width="56" height="8" rx="2" fill="url(#scp-gold)" />
      <rect x="38" y="94" width="44" height="10" rx="2" fill="#8a6d1f" />
      <path d="M40 86 c0 -12 6 -16 20 -16 s20 4 20 16 Z" fill="url(#scp-marble)" stroke="#8f8675" strokeWidth="1" />
      <path d="M55 62 h10 v8 h-10 Z" fill="url(#scp-marble)" />
      <ellipse cx="60" cy="44" rx="15" ry="18" fill="url(#scp-marble)" stroke="#8f8675" strokeWidth="1" />
      <path d="M54 40 h12 M53 48 h14 M56 54 c1 2 4 3 8 3 s6 -1 7 -3" stroke="#8f8675" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M45 40 c0 -10 6 -16 15 -16 s15 6 15 16" fill="none" stroke="#8f8675" strokeWidth="1.4" opacity="0.7" />
      <path d="M46 44 c-3 2 -5 5 -6 9" stroke="#8f8675" strokeWidth="1.2" fill="none" opacity="0.6" />
      <ellipse cx="60" cy="98" rx="30" ry="4" fill="#000000" opacity="0.3" />
    </svg>
  );
}

/* ---------------- 奇物：发光星盘 ---------------- */
function CurioArt(): ReactElement {
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 12;
    return {
      x1: 60 + Math.cos(a) * 40, y1: 60 + Math.sin(a) * 40,
      x2: 60 + Math.cos(a) * 34, y2: 60 + Math.sin(a) * 34,
      key: i,
    };
  });
  return (
    <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="cur-brass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f5d97a" />
          <stop offset="0.5" stopColor="#d4af37" />
          <stop offset="1" stopColor="#7c621f" />
        </linearGradient>
        <radialGradient id="cur-core" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#e0e8ff" />
          <stop offset="0.35" stopColor="#a06bff" />
          <stop offset="1" stopColor="#3a2a66" />
        </radialGradient>
        <radialGradient id="cur-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#c79bff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#c79bff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="44" fill="url(#cur-halo)" />
      <circle cx="60" cy="60" r="40" fill="none" stroke="url(#cur-brass)" strokeWidth="5" />
      <circle cx="60" cy="60" r="34" fill="none" stroke="url(#cur-brass)" strokeWidth="1.6" opacity="0.8" />
      {ticks.map((t) => (
        <line key={t.key} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#f5d97a" strokeWidth="1.6" />
      ))}
      <ellipse cx="60" cy="60" rx="24" ry="14" fill="none" stroke="url(#cur-brass)" strokeWidth="1.6" transform="rotate(24 60 60)" />
      <path d="M60 60 L78 42" stroke="url(#cur-brass)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M60 60 L46 76" stroke="url(#cur-brass)" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
      <circle cx="60" cy="60" r="13" fill="url(#cur-core)" stroke="#c79bff" strokeWidth="1.2" />
      <path d="M60 50 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z" fill="#e0e8ff" opacity="0.85" />
      <path d="M30 30 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" fill="#f5d97a" opacity="0.9" />
    </svg>
  );
}

/* ---------------- 排行榜奖章 ---------------- */
const MEDAL_GRADIENTS: Record<number, string[]> = {
  1: ["#fff3cf", "#d4af37", "#8a6d1f"],
  2: ["#f4f6fa", "#b9c0cc", "#6a7180"],
  3: ["#ffe2c0", "#d78a4c", "#8a4a1f"],
};

export function RankMedal({ rank }: { rank: number }): ReactElement {
  if (rank < 1 || rank > 3) {
    return <span className="rank-badge">{rank}</span>;
  }
  const [light, mid, dark] = MEDAL_GRADIENTS[rank];
  const id = `rk-${rank}`;
  return (
    <span className={`rank-badge r${rank}`} title={`第 ${rank} 名`}>
      <svg viewBox="0 0 30 30" width="19" height="19" aria-hidden="true">
        <defs>
          <radialGradient id={id} cx="0.4" cy="0.35" r="0.85">
            <stop offset="0" stopColor={light} />
            <stop offset="0.55" stopColor={mid} />
            <stop offset="1" stopColor={dark} />
          </radialGradient>
        </defs>
        <circle cx="15" cy="15" r="14" fill={`url(#${id})`} />
        <circle cx="15" cy="15" r="13" fill="none" stroke={light} strokeWidth="0.9" opacity="0.7" />
        <circle cx="15" cy="15" r="10" fill="none" stroke={dark} strokeWidth="0.6" opacity="0.6" />
        <path d="M15 6.5 l2.1 4.3 4.7 0.7 -3.4 3.3 0.8 4.7 -4.2 -2.2 -4.2 2.2 0.8 -4.7 -3.4 -3.3 4.7 -0.7 Z" fill="#ffffff" opacity="0.92" />
      </svg>
    </span>
  );
}

/* ---------------- 王冠 ---------------- */
export function CrownIcon({ className }: { className?: string }): ReactElement {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="cr-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f5d97a" />
          <stop offset="1" stopColor="#8a6d1f" />
        </linearGradient>
      </defs>
      <path d="M3 8 l4.5 4 L12 4 l4.5 8 L21 8 l-1.5 10 h-15 Z" fill="url(#cr-gold)" stroke="#6e5518" strokeWidth="0.8" />
      <circle cx="6" cy="8" r="1.4" fill="#fff3cf" />
      <circle cx="12" cy="4.5" r="1.6" fill="#fff3cf" />
      <circle cx="18" cy="8" r="1.4" fill="#fff3cf" />
      <rect x="5.5" y="18" width="13" height="1.6" rx="0.8" fill="#8a6d1f" opacity="0.7" />
    </svg>
  );
}

/* ---------------- 首页火漆印章 ---------------- */
export function EmblemMark({ className }: { className?: string }): ReactElement {
  const dots = Array.from({ length: 12 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 12 + Math.PI / 12;
    return { x: 60 + Math.cos(a) * 46, y: 60 + Math.sin(a) * 46, key: i };
  });
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="em-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f5d97a" />
          <stop offset="0.5" stopColor="#d4af37" />
          <stop offset="1" stopColor="#7c621f" />
        </linearGradient>
        <radialGradient id="em-wax" cx="0.38" cy="0.32" r="0.85">
          <stop offset="0" stopColor="#b33d35" />
          <stop offset="0.6" stopColor="#8a2620" />
          <stop offset="1" stopColor="#591410" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="56" fill="#141021" stroke="url(#em-gold)" strokeWidth="4" />
      <circle cx="60" cy="60" r="50" fill="none" stroke="url(#em-gold)" strokeWidth="1.2" opacity="0.7" />
      {dots.map((d) => <circle key={d.key} cx={d.x} cy={d.y} r="1.8" fill="#f5d97a" opacity="0.85" />)}
      <circle cx="60" cy="60" r="36" fill="url(#em-wax)" stroke="#f0a04c" strokeWidth="1" opacity="0.95" />
      <circle cx="60" cy="60" r="31" fill="none" stroke="#f0a04c" strokeWidth="0.8" opacity="0.7" />
      <path d="M60 32 l2.2 4.6 5 0.7 -3.6 3.5 0.85 5 -4.45 -2.35 -4.45 2.35 0.85 -5 -3.6 -3.5 5 -0.7 Z" fill="#f5d97a" opacity="0.95" />
      <g transform="rotate(-12 60 66)">
        <rect x="56.5" y="48" width="7" height="24" rx="3" fill="#5d3a26" stroke="#8a5a34" strokeWidth="0.8" />
        <rect x="48" y="46" width="24" height="6.5" rx="3" fill="#c9a86a" stroke="#8a6d1f" strokeWidth="0.8" />
      </g>
      <circle cx="66" cy="70" r="9" fill="url(#em-gold)" stroke="#6e5518" strokeWidth="0.8" />
      <rect x="63.4" y="67.4" width="5.2" height="5.2" rx="1" fill="#171225" />
    </svg>
  );
}

/* ---------------- 钱币（HUD / 通用） ---------------- */
export function CoinIcon({ className }: { className?: string }): ReactElement {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="cn-gold" cx="0.4" cy="0.35" r="0.85">
          <stop offset="0" stopColor="#f5d97a" />
          <stop offset="0.6" stopColor="#d4af37" />
          <stop offset="1" stopColor="#8a6d1f" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="10.5" fill="url(#cn-gold)" stroke="#6e5518" strokeWidth="1" />
      <circle cx="12" cy="12" r="7.5" fill="none" stroke="#fff3cf" strokeWidth="0.8" opacity="0.6" />
      <text x="12" y="15.4" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#201803" fontFamily="'Noto Sans SC','PingFang SC',sans-serif">
        ¥
      </text>
    </svg>
  );
}
