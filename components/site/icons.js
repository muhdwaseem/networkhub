// Shared inline-SVG icon set for the homepage. Self-contained (no icon
// library dependency) — each icon accepts standard SVG props via `...p`.
const base = (p) => ({
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  ...p,
});

export const IconSwitch = (p) => (
  <svg {...base(p)}>
    <rect x="2" y="7" width="20" height="10" rx="2" />
    <path d="M6 11v2M9 11v2M12 11v2M15 11v2M18 11v2" />
  </svg>
);
export const IconRouter = (p) => (
  <svg {...base(p)}>
    <rect x="2" y="13" width="20" height="8" rx="2" />
    <path d="M6.01 17H6M10 17h.01" />
    <path d="M12 8a3 3 0 0 1 3 3M8 8a7 7 0 0 1 7 7" />
  </svg>
);
export const IconWifi = (p) => (
  <svg {...base(p)}>
    <path d="M5 12.55a11 11 0 0 1 14 0M8.5 16.05a6 6 0 0 1 7 0M2 8.82a15 15 0 0 1 20 0" />
    <circle cx="12" cy="20" r="0.9" />
  </svg>
);
export const IconServer = (p) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="18" height="7" rx="1.5" />
    <rect x="3" y="14" width="18" height="7" rx="1.5" />
    <path d="M7 6.5h.01M7 17.5h.01M11 6.5h6M11 17.5h6" />
  </svg>
);
export const IconCamera = (p) => (
  <svg {...base(p)}>
    <path d="M3 6h13l4 3v9H3z" />
    <circle cx="11" cy="13" r="3" />
  </svg>
);
export const IconCable = (p) => (
  <svg {...base(p)}>
    <path d="M4 4v4a4 4 0 0 0 4 4h8a4 4 0 0 1 4 4v4" />
    <path d="M2 4h4M2 8h4M18 16h4M18 20h4" />
  </svg>
);
export const IconRack = (p) => (
  <svg {...base(p)}>
    <rect x="4" y="3" width="16" height="18" rx="1.5" />
    <path d="M4 8h16M4 13h16M4 18h16" />
    <circle cx="7" cy="5.5" r="0.6" fill="currentColor" />
    <circle cx="7" cy="10.5" r="0.6" fill="currentColor" />
    <circle cx="7" cy="15.5" r="0.6" fill="currentColor" />
  </svg>
);
export const IconPhone = (p) => (
  <svg {...base(p)}>
    <rect x="5" y="2" width="14" height="20" rx="2" />
    <path d="M9 6h6M9 10h6M9 14h6" />
    <circle cx="12" cy="18.5" r="0.8" fill="currentColor" />
  </svg>
);

export const IconMap = {
  switch: IconSwitch,
  router: IconRouter,
  wifi: IconWifi,
  server: IconServer,
  camera: IconCamera,
  cable: IconCable,
  rack: IconRack,
  phone: IconPhone,
};

export const IconMail = (p) => (
  <svg {...base(p)}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);

export const IconPhoneCall = (p) => (
  <svg {...base(p)}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.34 1.78.66 2.62a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.46-1.23a2 2 0 0 1 2.11-.45c.84.32 1.72.54 2.62.66a2 2 0 0 1 1.72 2Z" />
  </svg>
);

export const IconArrow = (p) => (
  <svg {...base(p)}>
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
);

export const IconCheck = (p) => (
  <svg {...base(p)}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const IconShield = (p) => (
  <svg {...base(p)}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const IconTruck = (p) => (
  <svg {...base(p)}>
    <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

export const IconSpark = (p) => (
  <svg {...base(p)}>
    <path d="M12 2v6M12 16v6M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" />
  </svg>
);
