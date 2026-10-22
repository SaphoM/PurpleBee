/**
 * Local, deterministic avatar presets for the profile-picture picker.
 *
 * Each preset is a small self-contained SVG rendered as a
 * `data:image/svg+xml` URL — no network, no storage bucket, ~1KB each —
 * so they load instantly and render everywhere an avatar shows up (Chat,
 * Team, TopBar, project cards) exactly like an uploaded photo, persisting
 * through the same profiles.avatar update path (same precedent as the
 * data-URL project logos).
 *
 * 24 female + 24 male presets: 8 hair styles × 3 variations each; skin
 * tone, hair colour, background and shirt rotate deterministically so
 * every tile is distinct.
 */

interface AvatarParts {
  bg: string;
  skin: string;
  skinShade: string;
  hair: string;
  shirt: string;
}

const SKIN_TONES: Array<[string, string]> = [
  ['#f6d7bd', '#e8c1a1'],
  ['#f0c8a3', '#dfb184'],
  ['#dda476', '#c98f5f'],
  ['#c08151', '#a96c41'],
  ['#96603a', '#81502f'],
  ['#6b4128', '#5a3520'],
];

const HAIR_COLORS = ['#241c16', '#3d2b1c', '#5b3d22', '#7d5a2e', '#b0793a', '#8f8880'];
const BACKGROUNDS = ['#7c5cff', '#4f8ef7', '#2bb3a3', '#f2a93b', '#ef6f8f', '#9333ea'];
const SHIRTS = ['#2f3646', '#3b4252', '#545c6e', '#33415c', '#4a3f5f', '#37424e'];

interface HairStyleDef {
  /** Hair volume drawn BEHIND the head (and over the shoulders) */
  back?: (c: AvatarParts) => string;
  /** Cap/fringe drawn OVER the top of the head */
  front?: (c: AvatarParts) => string;
  /** Male facial hair, drawn over the face but under the eyes/smile */
  facialHair?: (c: AvatarParts) => string;
}

// The shared short cap most male styles build on (hairline just above the brows)
const SHORT_CAP =
  'M18.5 26 C18 14.5 24 9.5 32 9.5 C40 9.5 46 14.5 45.5 26 C45 20.5 41.5 17.5 37 17 C34.5 20 29.5 20 27 17 C22.5 17.5 19 20.5 18.5 26 Z';
// Center-part fringe used by several female styles
const CENTER_FRINGE =
  'M19 24 C19.5 14 25 10 32 10 C39 10 44.5 14 45 24 C43.5 17.5 39 15.5 32 19 C25 15.5 20.5 17.5 19 24 Z';
// Straight thin hairline (buzz / pulled-back looks)
const THIN_CAP =
  'M19 25.5 C18.5 15.5 24 10.5 32 10.5 C40 10.5 45.5 15.5 45 25.5 C44 19.5 39.5 17.5 32 17.5 C24.5 17.5 20 19.5 19 25.5 Z';

const FEMALE_STYLES: HairStyleDef[] = [
  // 1. Bob — chin-length with a full fringe
  {
    back: (c) => `
      <ellipse cx="32" cy="26" rx="15.5" ry="15.5" fill="${c.hair}"/>
      <rect x="16.5" y="26" width="7.5" height="17" rx="3.75" fill="${c.hair}"/>
      <rect x="40" y="26" width="7.5" height="17" rx="3.75" fill="${c.hair}"/>`,
    front: (c) =>
      `<path d="M19.5 25 C20.5 15.5 25.5 11.5 32 11.5 C38.5 11.5 43.5 15.5 44.5 25 C40 19.5 24 19.5 19.5 25 Z" fill="${c.hair}"/>`,
  },
  // 2. Long — centre part, hair falling past the shoulders
  {
    back: (c) => `
      <ellipse cx="32" cy="27" rx="16" ry="16" fill="${c.hair}"/>
      <rect x="14.5" y="27" width="8.5" height="27" rx="4.25" fill="${c.hair}"/>
      <rect x="41" y="27" width="8.5" height="27" rx="4.25" fill="${c.hair}"/>`,
    front: (c) => `<path d="${CENTER_FRINGE}" fill="${c.hair}"/>`,
  },
  // 3. Ponytail — sleek sweep-back with a side tail
  {
    back: (c) => `
      <ellipse cx="32" cy="26" rx="14.5" ry="14.5" fill="${c.hair}"/>
      <ellipse cx="48.5" cy="31" rx="4.5" ry="9" transform="rotate(14 48.5 31)" fill="${c.hair}"/>`,
    front: (c) =>
      `<path d="M18.5 26 C18 14 24 9 32 9 C40 9 46 14 45.5 26 C45 19.5 40.5 16 33.5 15.5 C27 18 21.5 21.5 18.5 26 Z" fill="${c.hair}"/>`,
  },
  // 4. Bun — pulled back tight with a top knot
  {
    back: (c) => `
      <ellipse cx="32" cy="26" rx="14.5" ry="14.5" fill="${c.hair}"/>
      <circle cx="32" cy="7.5" r="5.5" fill="${c.hair}"/>`,
    front: (c) =>
      `<path d="M18.5 25 C18.5 13 24 8.5 32 8.5 C40 8.5 45.5 13 45.5 25 C45 18.5 40 16 32 16 C24 16 19 18.5 18.5 25 Z" fill="${c.hair}"/>`,
  },
  // 5. Curly — cloud of curls around the head
  {
    back: (c) => `
      <circle cx="32" cy="19" r="16" fill="${c.hair}"/>
      <circle cx="18.5" cy="15" r="6" fill="${c.hair}"/>
      <circle cx="45.5" cy="15" r="6" fill="${c.hair}"/>
      <circle cx="13.5" cy="24" r="5.5" fill="${c.hair}"/>
      <circle cx="50.5" cy="24" r="5.5" fill="${c.hair}"/>`,
    front: (c) => `
      <path d="M20 24 C21 15 26 11.5 32 11.5 C38 11.5 43 15 44 24 C40.5 18.5 23.5 18.5 20 24 Z" fill="${c.hair}"/>
      <circle cx="24.5" cy="16.5" r="3.4" fill="${c.hair}"/>
      <circle cx="32" cy="14.5" r="3.6" fill="${c.hair}"/>
      <circle cx="39.5" cy="16.5" r="3.4" fill="${c.hair}"/>`,
  },
  // 6. Braids — two long braids with tie bands
  {
    back: (c) => `
      <ellipse cx="32" cy="26" rx="15" ry="15" fill="${c.hair}"/>
      <rect x="14" y="27" width="7" height="24" rx="3.5" fill="${c.hair}"/>
      <rect x="43" y="27" width="7" height="24" rx="3.5" fill="${c.hair}"/>
      <rect x="14" y="44.5" width="7" height="2.6" rx="1.3" fill="${c.bg}"/>
      <rect x="43" y="44.5" width="7" height="2.6" rx="1.3" fill="${c.bg}"/>`,
    front: (c) => `
      <path d="${CENTER_FRINGE}" fill="${c.hair}"/>
      <path d="M32 10.5 L32 19" stroke="${c.bg}" stroke-width="1.3" opacity="0.55" stroke-linecap="round"/>`,
  },
  // 7. Wavy — shoulder-length with soft wave tips
  {
    back: (c) => `
      <ellipse cx="32" cy="26.5" rx="16" ry="15.5" fill="${c.hair}"/>
      <ellipse cx="18.5" cy="30" rx="4.8" ry="12" fill="${c.hair}"/>
      <ellipse cx="45.5" cy="30" rx="4.8" ry="12" fill="${c.hair}"/>
      <circle cx="17.2" cy="40" r="4.1" fill="${c.hair}"/>
      <circle cx="20" cy="45.5" r="3.7" fill="${c.hair}"/>
      <circle cx="46.8" cy="40" r="4.1" fill="${c.hair}"/>
      <circle cx="44" cy="45.5" r="3.7" fill="${c.hair}"/>`,
    front: (c) => `<path d="${CENTER_FRINGE}" fill="${c.hair}"/>`,
  },
  // 8. Pixie — short cropped cut with a side sweep
  {
    front: (c) =>
      `<path d="M18.5 26 C18 14.5 24 9.5 32 9.5 C40.5 9.5 46 14.5 45.5 26 C45 20.5 41.5 17 35.5 16.5 C31 21 25 23 20.5 23.5 C19.5 24.2 18.8 25 18.5 26 Z" fill="${c.hair}"/>`,
  },
];

const MALE_STYLES: HairStyleDef[] = [
  // 1. Short — classic short cut
  { front: (c) => `<path d="${SHORT_CAP}" fill="${c.hair}"/>` },
  // 2. Buzz — very close crop
  { front: (c) => `<path d="${THIN_CAP}" fill="${c.hair}"/>` },
  // 3. Curly top — tight curls above a short cut
  {
    front: (c) => `
      <path d="${THIN_CAP}" fill="${c.hair}"/>
      <circle cx="24" cy="11" r="4.6" fill="${c.hair}"/>
      <circle cx="32" cy="8.5" r="5" fill="${c.hair}"/>
      <circle cx="40" cy="11" r="4.6" fill="${c.hair}"/>
      <circle cx="28" cy="8" r="4" fill="${c.hair}"/>
      <circle cx="36" cy="8" r="4" fill="${c.hair}"/>`,
  },
  // 4. Fade — short cut with a razor-hard side part
  {
    front: (c) => `
      <path d="${SHORT_CAP}" fill="${c.hair}"/>
      <path d="M23.5 13.5 L27.5 19.5" stroke="${c.bg}" stroke-width="1.7" stroke-linecap="round"/>`,
  },
  // 5. Afro — full round shape
  {
    back: (c) => `<circle cx="32" cy="19.5" r="17" fill="${c.hair}"/>`,
    front: (c) =>
      `<path d="M20 24.5 C20.5 17 25.5 13.5 32 13.5 C38.5 13.5 43.5 17 44 24.5 C40 19.5 24 19.5 20 24.5 Z" fill="${c.hair}"/>`,
  },
  // 6. Bald + full beard
  {
    facialHair: (c) => `
      <path d="M18 28 C18 38.5 23.5 45 32 45 C40.5 45 46 38.5 46 28 C45 36.5 40 40.5 32 40.5 C24 40.5 19 36.5 18 28 Z" fill="${c.hair}"/>
      <rect x="28" y="31.2" width="8" height="2.1" rx="1.05" fill="${c.hair}"/>`,
  },
  // 7. Goatee — short cut with moustache + chin patch
  {
    front: (c) => `<path d="${SHORT_CAP}" fill="${c.hair}"/>`,
    facialHair: (c) => `
      <rect x="28" y="31.2" width="8" height="2.1" rx="1.05" fill="${c.hair}"/>
      <ellipse cx="32" cy="41.5" rx="4.6" ry="3.4" fill="${c.hair}"/>`,
  },
  // 8. Side part — combed over with a defined part
  {
    front: (c) =>
      `<path d="M18.5 26 C18 14.5 24 9.5 32 9.5 C40.5 9.5 46 14.5 45.5 26 C45 20 42 16.8 36.5 16.3 C31 19.8 24.5 21.6 19.8 21.3 C19.2 22.6 18.7 24.2 18.5 26 Z" fill="${c.hair}"/>`,
  },
];

/** Eyes, eyebrows and smile — shared face, drawn after skin/facial hair. */
const faceFeatures = (hair: string): string => `
  <path d="M24 23.4 C25.5 22.4 28 22.4 29.5 23.2" stroke="${hair}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
  <path d="M34.5 23.2 C36 22.4 38.5 22.4 40 23.4" stroke="${hair}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
  <circle cx="26.8" cy="28" r="1.8" fill="#2b2733"/>
  <circle cx="37.2" cy="28" r="1.8" fill="#2b2733"/>
  <path d="M27.5 34 Q32 37.4 36.5 34" stroke="#2b2733" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;

function makeAvatar(style: HairStyleDef, styleIndex: number, variant: number, earrings: boolean): string {
  const [skin, skinShade] = SKIN_TONES[(styleIndex * 2 + variant) % SKIN_TONES.length];
  const parts: AvatarParts = {
    bg: BACKGROUNDS[(styleIndex + variant * 2) % BACKGROUNDS.length],
    skin,
    skinShade,
    hair: HAIR_COLORS[(styleIndex * 5 + variant) % HAIR_COLORS.length],
    shirt: SHIRTS[(styleIndex * 2 + variant * 3) % SHIRTS.length],
  };
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" fill="${parts.bg}"/>` +
    // shoulders/shirt
    `<path d="M6 64 C8 52.5 18 46.5 32 46.5 C46 46.5 56 52.5 58 64 Z" fill="${parts.shirt}"/>` +
    // hair volume behind head (drapes over the shirt for long styles)
    (style.back ? style.back(parts) : '') +
    // neck
    `<path d="M27 34 h10 v9 a5 5 0 0 1 -10 0 z" fill="${parts.skinShade}"/>` +
    // head + ears
    `<ellipse cx="32" cy="27" rx="13" ry="14" fill="${parts.skin}"/>` +
    `<ellipse cx="19.2" cy="29.5" rx="2.4" ry="3.3" fill="${parts.skin}"/>` +
    `<ellipse cx="44.8" cy="29.5" rx="2.4" ry="3.3" fill="${parts.skin}"/>` +
    // facial hair (over the jaw, under the smile)
    (style.facialHair ? style.facialHair(parts) : '') +
    // brows/eyes/smile
    faceFeatures(parts.hair) +
    // earrings
    (earrings
      ? `<circle cx="18.8" cy="32.4" r="1.25" fill="#f6c945"/><circle cx="45.2" cy="32.4" r="1.25" fill="#f6c945"/>`
      : '') +
    // hairline / fringe over the top of the head
    (style.front ? style.front(parts) : '') +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function buildPresets(styles: HairStyleDef[], earringsForEvenStyles: boolean): string[] {
  return styles.flatMap((style, s) =>
    [0, 1, 2].map((v) => makeAvatar(style, s, v, earringsForEvenStyles && s % 2 === 0)),
  );
}

/** 24 female presets: bob / long / ponytail / bun / curly / braids / wavy / pixie × 3 variants */
export const FEMALE_AVATAR_PRESETS: string[] = buildPresets(FEMALE_STYLES, true);

/** 24 male presets: short / buzz / curly top / fade / afro / bald+beard / goatee / side part × 3 variants */
export const MALE_AVATAR_PRESETS: string[] = buildPresets(MALE_STYLES, false);
