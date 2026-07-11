import type { ReactNode } from "react";

const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const P2 = { ...P, strokeWidth: 2 } as const;

export const ICONS: Record<string, ReactNode> = {
  run: (<><rect x="3" y="8" width="18" height="8" rx="4" {...P} /><path d="M9 8v8M15 8v8" {...P} /></>),
  swim: (<><circle cx="17.5" cy="6.5" r="1.6" {...P} /><path d="M4 10.5l4.5-2.5 3 2.5 3-1.5" {...P} /><path d="M3 15c1.7 0 1.7-1.6 3.4-1.6S8.1 15 9.8 15s1.7-1.6 3.4-1.6S14.9 15 16.6 15s1.7-1.6 3.4-1.6" {...P} /><path d="M3 19c1.7 0 1.7-1.6 3.4-1.6S8.1 19 9.8 19s1.7-1.6 3.4-1.6S14.9 19 16.6 19s1.7-1.6 3.4-1.6" {...P} /></>),
  bike: (<><circle cx="6" cy="17" r="3.3" {...P} /><circle cx="18" cy="17" r="3.3" {...P} /><path d="M6 17l4-7h5M9.5 10h5.5l2.5 7M14 7h2.5" {...P} /></>),
  gym: (<path d="M4 8v8M7 6.5v11M17 6.5v11M20 8v8M7 12h10" {...P} />),
  walk: (<><circle cx="13" cy="4.5" r="1.6" {...P} /><path d="M12 8l-2 4 3 2 1 5M10 12l-3 1M13 14l2 3" {...P} /></>),
  check: (<path d="M5 12l4 4 10-11" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />),
  plus: (<path d="M12 5v14M5 12h14" {...P2} />),
  x: (<path d="M6 6l12 12M18 6L6 18" {...P2} />),
  left: (<path d="M15 5l-7 7 7 7" {...P2} />),
  right: (<path d="M9 5l7 7-7 7" {...P2} />),
  chev: (<path d="M9 5l7 7-7 7" {...P2} />),
  cal: (<><rect x="3" y="5" width="18" height="16" rx="2" {...P} /><path d="M3 9h18M8 3v4M16 3v4" {...P} /></>),
  today: (<><circle cx="12" cy="12" r="9" {...P} /><path d="M12 7v5l3 2" {...P} /></>),
  chart: (<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" {...P} />),
  feed: (<path d="M3 12h4l2.5-7 5 15 2.5-8H21" {...P} />),
  sun: (<><circle cx="12" cy="12" r="4" {...P} /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" {...P} /></>),
  moon: (<path d="M20 14.5A8 8 0 019.5 4a7 7 0 108.5 10.5z" {...P} />),
  down: (<path d="M12 4v11M7 11l5 5 5-5M5 20h14" {...P} />),
  up: (<path d="M12 20V9M7 13l5-5 5 5M5 4h14" {...P} />),
  logout: (<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" {...P} /><path d="M16 17l5-5-5-5M21 12H9" {...P} /></>),
  cloud: (<path d="M7 18a4 4 0 01-.5-7.97A5 5 0 0116 9a3.5 3.5 0 011 6.86" {...P} />),
  mail: (<><rect x="3" y="5" width="18" height="14" rx="2" {...P} /><path d="M3 7l9 6 9-6" {...P} /></>),
  camera: (<><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" {...P} /><circle cx="12" cy="13" r="3.2" {...P} /></>),
  mdot: (<><path d="M4 18.5 8 7l4 5.5L16 7l4 11.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="5" r="2.1" fill="currentColor" /></>),
};

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}
