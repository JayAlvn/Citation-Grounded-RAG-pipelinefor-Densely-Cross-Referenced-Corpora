export interface ThemeColors {
  bg: string;
  panelBg: string;
  cardBg: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  accentText: string;
  fontWeight: number;
}

export const THEMES: { name: string; colors: ThemeColors }[] = [
  {
    name: 'Midnight Dark',
    colors: {
      // Neutral near-black with no blue undertone; separation comes from hairline borders.
      bg: '#0A0A0A',        // app background — the gutter between panels
      panelBg: '#111111',   // panels
      cardBg: '#1C1C1C',    // cards, chat bubbles, meter tracks — one visible step above panels
      text: '#EDEDED',      // primary text — off-white, softer than pure white on black
      textMuted: '#8C8C8C', // secondary text — neutral grey, still AA on cards
      border: '#2A2A2A',    // hairline borders & bar tracks
      accent: '#3B82F6',
      accentText: '#FFFFFF',
      fontWeight: 400
    }
  },
  {
    name: 'Daylight',
    colors: {
      // Monochrome editorial palette: off-white ground, warm charcoal ink.
      // Border stays lighter than the accent so bar tracks remain visible under a filled bar.
      bg: '#E4E4E1',        // app background — a step below the panels, for the gutters
      panelBg: '#F2F2F2',   // panels — off-white ground
      cardBg: '#E9E9E6',    // cards & chart tracks — warm grey, one step below the panels
      text: '#2C2C29',      // primary text — warm charcoal
      textMuted: '#5E5E59', // secondary text — warm mid grey
      border: '#BDBDB7',    // borders & bar tracks — soft warm grey
      accent: '#2C2C29',    // charcoal — filled buttons and active states, as on the reference
      accentText: '#FFFFFF',
      fontWeight: 500       // medium — charcoal on off-white reads thin at regular weight
    }
  }
];