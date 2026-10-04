// Every color, font, title and the hero photo live here so the app can be
// reskinned for another birthday by editing this one file.
// (In phase 2 the title, subtitle, age and photo become editable from Control
// settings; these values are the defaults.)

export const theme = {
  title: "Ethan's Birthday Showdown",
  shortName: 'Showdown',
  subtitle: 'Smash Bros King of the Hill',
  birthdayName: 'Ethan',
  age: 10,
  /** URL of the hero photo. Null shows the gold monogram instead. */
  heroPhotoUrl: null as string | null,
  monogram: 'E',

  colors: {
    bg: '#07051a',
    bgDeep: '#020110',
    panel: 'rgba(20, 14, 52, 0.72)',
    panelBorder: 'rgba(120, 100, 255, 0.35)',
    text: '#f6f3ff',
    textDim: '#b9b0e0',
    pink: '#ff2d95',
    blue: '#21d4fd',
    lime: '#b6ff3b',
    gold: '#ffc83d',
    danger: '#ff5a5a',
  },

  fonts: {
    display: "'Bungee', 'Luckiest Guy', system-ui, sans-serif",
    fun: "'Luckiest Guy', 'Bungee', system-ui, sans-serif",
    body: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  },

  rules: {
    koth: "Win and you stay on. Lose and you go to the back of the line. One stock, about 2–3 minutes. Most wins leads!",
    playoff:
      "The top 4 by wins make it. Semis are 1 vs 4 and 2 vs 3. Every match is best of 3. Win the final and you're the champion!",
  },
} as const;

export type Theme = typeof theme;

/** Push theme colors and fonts into CSS custom properties on :root. */
export function applyThemeToCss(t: Theme = theme): void {
  const root = document.documentElement.style;
  for (const [key, value] of Object.entries(t.colors)) {
    root.setProperty(`--c-${key}`, value);
  }
  root.setProperty('--f-display', t.fonts.display);
  root.setProperty('--f-fun', t.fonts.fun);
  root.setProperty('--f-body', t.fonts.body);
}
