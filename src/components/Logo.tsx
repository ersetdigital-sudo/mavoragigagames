import Link from "next/link";

const SUN = "#FFB703";
const SEA = "#2A9D8F";
const HAZE = "#8E7CC3";

// Huruf "M" 5x5 piksel, piksel tengah pakai warna aksen.
const PIXELS: [number, number, string][] = [
  [0, 0, SUN],
  [0, 1, SUN],
  [0, 2, SUN],
  [0, 3, SUN],
  [0, 4, SUN],
  [1, 1, SUN],
  [2, 2, SEA],
  [3, 1, SUN],
  [4, 0, SUN],
  [4, 1, SUN],
  [4, 2, SUN],
  [4, 3, SUN],
  [4, 4, HAZE],
];

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5"
      aria-label="Mavoragigagames beranda"
    >
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
        <rect width="40" height="40" rx="8" fill="#0D1B2A" />
        {PIXELS.map(([x, y, color]) => (
          <rect
            key={`${x}-${y}`}
            x={9 + x * 4.4}
            y={8 + y * 4.8}
            width="4"
            height="4.4"
            fill={color}
          />
        ))}
      </svg>
      <span className="whitespace-nowrap text-[19px] font-extrabold tracking-[-0.05em]">
        mavoragiga<span className="mut font-semibold">games</span>
        <span className="ml-[2px] inline-block h-[15px] w-[7px] translate-y-[-1px] bg-[#FFB703] shadow-[inset_0_0_0_1px_rgba(13,27,42,0.25)]" />
      </span>
    </Link>
  );
}
