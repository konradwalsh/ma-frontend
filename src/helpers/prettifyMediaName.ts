/**
 * Cosmetic prettifier for track/album/artist names that bled through
 * from raw filenames. Applied at display layer ONLY — doesn't mutate
 * api/store data so backend metadata fixes still propagate cleanly.
 *
 * Heuristics applied (in order):
 * 1. Strip leading track-number prefixes: "04-foo" / "04 foo" / "04_foo"
 *    → "foo". Detect via /^\d{1,3}[-_ ]+/. Bail if the rest is empty.
 * 2. If the artist field is provided AND the name starts with that
 *    artist (case-insensitive, hyphen/underscore insensitive),
 *    strip that prefix too.
 * 3. Replace `_` with ` ` (always safe — underscores aren't a normal
 *    title character).
 * 4. Collapse multiple spaces into one.
 * 5. If the entire string is lowercase AND has no apostrophes / mixed
 *    case markers, title-case each word (preserve common acronyms:
 *    USA, UK, USSR, NYC, DJ, MC, etc.).
 * 6. Preserve everything inside parens/brackets verbatim (e.g.,
 *    `(2022 remaster)` → `(2022 Remaster)` is OK because we apply
 *    title-casing globally only when the whole input was lowercase, but
 *    we never mutate the punctuation of those wrappers).
 *
 * Returns the original string unchanged if it doesn't look like a
 * filename-derived name (no underscores, no leading number prefix).
 */

// Acronyms preserved as upper-case during the title-case pass. Lowercase
// keys for case-insensitive lookup; values are the canonical render.
const ACRONYMS: Record<string, string> = {
  usa: "USA",
  uk: "UK",
  ussr: "USSR",
  nyc: "NYC",
  dj: "DJ",
  mc: "MC",
  ep: "EP",
  lp: "LP",
  ok: "OK",
  tv: "TV",
  fm: "FM",
  am: "AM",
  uv: "UV",
  ufo: "UFO",
};

const NUMBER_PREFIX_RE = /^\d{1,3}[-_ ]+/;
const HAS_UNDERSCORE_RE = /_/;
// Matches words to title-case. Hyphenated tokens are split so each
// segment is title-cased ("only-way" → "Only-Way"). Apostrophes/quotes
// are kept inside the word so "don't" stays "Don't".
const WORD_BOUNDARY_RE = /([\s\-/])/;

/**
 * Strip a known artist prefix from `name` if present (case- and
 * separator-insensitive). Returns the trimmed remainder or the
 * original `name` if no match. Hyphens / underscores between words
 * are normalized to spaces during comparison only.
 */
function stripArtistPrefix(name: string, artist: string): string {
  if (!artist) return name;
  // Build a permissive prefix matcher: each non-alphanumeric run in the
  // artist string can match any non-alphanumeric run (or none) in the
  // name. Case-insensitive throughout. This lets "Graham Coxon" match
  // "graham_coxon", "graham-coxon", "grahamcoxon", etc.
  const escapeForRegex = (s: string) =>
    s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tokens = artist
    .split(/[^A-Za-z0-9]+/)
    .filter((t) => t.length > 0)
    .map(escapeForRegex);
  if (tokens.length === 0) return name;
  // Allow any non-alphanumeric separator (including none) between
  // tokens, AND require at least one separator after the matched
  // prefix so we don't chop into the next word.
  const pattern = new RegExp(
    `^[^A-Za-z0-9]*${tokens.join("[^A-Za-z0-9]*")}[^A-Za-z0-9]+`,
    "i",
  );
  const stripped = name.replace(pattern, "");
  return stripped.length > 0 ? stripped : name;
}

/**
 * Title-case a single token, preserving acronyms.
 */
function titleCaseWord(word: string): string {
  if (!word) return word;
  const lower = word.toLowerCase();
  if (ACRONYMS[lower]) return ACRONYMS[lower];
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Title-case a full string while leaving anything inside parentheses
 * or square brackets fully alone (so `(2022 remaster)` retains its
 * casing exactly as-is — title-case is applied to the OUTER text only).
 */
function titleCaseOutsideBrackets(input: string): string {
  // Scan, accumulating either "outside" or "inside-bracket" runs.
  let out = "";
  let depth = 0;
  let buf = "";

  const flushOutside = () => {
    if (!buf) return;
    const parts = buf.split(WORD_BOUNDARY_RE);
    out += parts
      .map((p) => (WORD_BOUNDARY_RE.test(p) ? p : titleCaseWord(p)))
      .join("");
    buf = "";
  };

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (depth === 0 && (ch === "(" || ch === "[")) {
      flushOutside();
      out += ch;
      depth++;
    } else if (depth > 0 && (ch === ")" || ch === "]")) {
      out += ch;
      depth--;
    } else if (depth > 0) {
      out += ch;
    } else {
      buf += ch;
    }
  }
  flushOutside();
  return out;
}

export function prettifyMediaName(
  name: string | undefined | null,
  context?: { artist?: string },
): string {
  if (name == null) return "";
  if (typeof name !== "string") return String(name);

  const original = name;

  // Quick exit: if the name doesn't carry filename-shaped tells, leave
  // it alone. This protects deliberately-stylized titles ("iLuminate",
  // "MGMT") and any name the backend already returned cleanly.
  const hasNumberPrefix = NUMBER_PREFIX_RE.test(original);
  const hasUnderscore = HAS_UNDERSCORE_RE.test(original);
  if (!hasNumberPrefix && !hasUnderscore) return original;

  // 1. Strip leading track-number prefix.
  let working = original;
  if (NUMBER_PREFIX_RE.test(working)) {
    const stripped = working.replace(NUMBER_PREFIX_RE, "");
    if (stripped.length > 0) {
      working = stripped;
    }
  }

  // 2. Strip artist prefix if provided.
  if (context?.artist) {
    working = stripArtistPrefix(working, context.artist);
  }

  // 3. Underscores → spaces.
  working = working.replace(/_/g, " ");

  // 4. Collapse repeated whitespace.
  working = working.replace(/\s+/g, " ").trim();

  if (!working) return original;

  // 5. Title-case only when the whole working string is lowercase AND
  //    has no apostrophes / mixed-case signal. Title-casing happens
  //    OUTSIDE bracketed groups so "(2022 remaster)" stays as-is for
  //    the parens-preservation guarantee.
  const hasUpper = /[A-Z]/.test(working);
  const hasApostrophe = /['']/.test(working);
  if (!hasUpper && !hasApostrophe) {
    working = titleCaseOutsideBrackets(working);
  }

  return working;
}
