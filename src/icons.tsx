import React from "react";

const S: React.FC<{ children: React.ReactNode; size?: number; color?: string }> = ({
  children,
  size = 40,
  color = "#0B1412",
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

export const IconCheck = () => (
  <S>
    <path d="M4 12.5l5 5L20 6.5" />
  </S>
);
export const IconFuel = () => (
  <S>
    <path d="M4 20V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v15M3 20h12M14 9h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V8l-3-3M7 8h4" />
  </S>
);
export const IconOil = () => (
  <S>
    <path d="M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11z" />
  </S>
);
export const IconBlade = () => (
  <S>
    <circle cx="12" cy="12" r="2.2" />
    <path d="M12 9.8V3M12 14.2V21M9.8 12H3M14.2 12H21" />
  </S>
);
export const IconBolt = () => (
  <S>
    <path d="M12 2l8.5 5v10L12 22l-8.5-5V7z" />
    <circle cx="12" cy="12" r="3.2" />
  </S>
);
export const IconStop = () => (
  <S>
    <circle cx="12" cy="12" r="9" />
    <rect x="8.5" y="8.5" width="7" height="7" rx="1" />
  </S>
);
export const IconKey = () => (
  <S>
    <circle cx="7.5" cy="15.5" r="4.5" />
    <path d="M10.7 12.3L20 3M16 7l3 3M14 9l2 2" />
  </S>
);
export const IconThermo = () => (
  <S>
    <path d="M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0z" />
  </S>
);
export const IconGauge = () => (
  <S>
    <path d="M4 18a9 9 0 1 1 16 0" />
    <path d="M12 14l5-5" />
  </S>
);
export const IconHelmet = () => (
  <S>
    <path d="M3 17h18M5 17v-3a7 7 0 0 1 14 0v3M10 7.5V5h4v2.5" />
  </S>
);
export const IconNoEntry = () => (
  <S>
    <circle cx="12" cy="12" r="9" />
    <path d="M5.6 5.6l12.8 12.8" />
  </S>
);
export const IconPower = () => (
  <S>
    <path d="M12 3v9M6.3 7a8 8 0 1 0 11.4 0" />
  </S>
);
export const IconWater = () => (
  <S>
    <path d="M7 3v4M5 5h4M12 9s-5 5.5-5 9a5 5 0 0 0 10 0c0-3.5-5-9-5-9z" />
  </S>
);
export const IconCalendar = () => (
  <S>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    <circle cx="12" cy="12" r="4" />
  </S>
);
export const IconLayers = () => (
  <S>
    <path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5" />
  </S>
);
export const IconCross = () => (
  <S>
    <path d="M4 8h16M4 12h16M4 16h16M8 4v16M12 4v16M16 4v16" />
  </S>
);
export const IconWave = () => (
  <S>
    <path d="M3 12c3-5 6-5 9 0s6 5 9 0" />
  </S>
);
