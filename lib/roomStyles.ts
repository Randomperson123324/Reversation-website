import { RoomThemeKey } from "@/types";

/**
 * Tailwind class bundles for each room theme. Classes must stay as literal
 * strings (not string-templated) so Tailwind's content scanner can find
 * them — see tailwind.config.ts `content` for why lib/ is included.
 */
export type RoomStyle = {
  badgeBg: string; // small square room-number badge (e.g. "601")
  chipBg: string; // pill/box background used for room cards & legends
  text: string; // room-colored text (name, number)
  dot: string; // small solid dot (calendar legend, equipment-style markers)
  ring: string; // selected/active border
};

const ROOM_STYLES: Record<RoomThemeKey, RoomStyle> = {
  accent: {
    badgeBg: "bg-accent-100 text-accent-700 border border-accent-200",
    chipBg: "bg-accent-50 border border-accent-200",
    text: "text-accent-700",
    dot: "bg-accent-500",
    ring: "border-accent-400",
  },
  primary: {
    badgeBg: "bg-primary-100 text-primary-700 border border-primary-200",
    chipBg: "bg-primary-50 border border-primary-200",
    text: "text-primary-700",
    dot: "bg-primary-500",
    ring: "border-primary-400",
  },
};

export const getRoomStyle = (theme: RoomThemeKey): RoomStyle => ROOM_STYLES[theme];
