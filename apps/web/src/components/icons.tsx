import type { ReactNode } from "react";
import type { OfferFilter } from "@/lib/offers";

function Svg({ children, size = 24 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const WAVE = "M3 19c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1";

export function OfferIcon({ offer, size }: { offer: OfferFilter; size?: number }) {
  switch (offer) {
    case "cabana":
      return (
        <Svg size={size}>
          <path d="M4 20V10l8-6 8 6v10" />
          <path d="M9 20v-6h6v6" />
        </Svg>
      );
    case "loungers":
      return (
        <Svg size={size}>
          <path d="M4 10a8 4 0 0 1 16 0z" />
          <path d="M12 10v10" />
          <path d="M8 20h8" />
        </Svg>
      );
    case "jet_ski":
      return (
        <Svg size={size}>
          <path d="M3 15h13l4-3h-6l-2-2H8l-2 3H3z" />
          <path d={WAVE} />
        </Svg>
      );
    case "sup_kayak":
      return (
        <Svg size={size}>
          <path d="M12 3v11" />
          <path d="M9 3h6" />
          <path d="M4 15h16" />
          <path d={WAVE} />
        </Svg>
      );
    case "pedalo":
      return (
        <Svg size={size}>
          <circle cx="12" cy="9" r="3" />
          <path d="M5 15h14" />
          <path d={WAVE} />
        </Svg>
      );
    case "aquapark":
      return (
        <Svg size={size}>
          <path d="M6 4v12" />
          <path d="M6 7h4c4 0 6 3 6 6v2" />
          <path d={WAVE} />
        </Svg>
      );
    case "massage":
      return (
        <Svg size={size}>
          <circle cx="7" cy="9" r="2" />
          <path d="M3 15h18" />
          <path d="M10 12h9" />
          <path d="M5 15v4M19 15v4" />
        </Svg>
      );
    case "diving":
      return (
        <Svg size={size}>
          <rect x="4" y="6" width="16" height="8" rx="4" />
          <path d="M12 6v8" />
          <path d={WAVE} />
        </Svg>
      );
  }
}

export function PinIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </Svg>
  );
}

export function SearchIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg size={size}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </Svg>
  );
}

export function LocateIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </Svg>
  );
}

export function ListIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </Svg>
  );
}

export function MapIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="m9 4-6 2v14l6-2 6 2 6-2V4l-6 2z" />
      <path d="M9 4v14M15 6v14" />
    </Svg>
  );
}

export function CloseIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}

export function BackIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M15 5l-7 7 7 7" />
    </Svg>
  );
}
