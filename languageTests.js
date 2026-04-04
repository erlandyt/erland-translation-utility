// Generate regexes for language codes (XX-XX, XX) when given a array of language codes (["xx", "yy", "zz"])
// This is used for detecting the user's language from the accept-language header
// /^fi(-[a-z]{2})?$/i
export function generateLanguageRegexes(languages) {
  const regexes = {};

  const suffix =
    "(?:-[a-zA-Z]{4})?" +                    // script
    "(?:-(?:[a-zA-Z]{2}|\\d{3}))?" +          // region
    "(?:-(?:[a-zA-Z0-9]{5,8}|\\d[a-zA-Z0-9]{3}))*" + // variants
    "(?:-(?:[0-9A-WY-Za-wy-z]-[a-zA-Z0-9]{2,8}))*" + // extensions
    "(?:-x(?:-[a-zA-Z0-9]{1,8})+)?";          // private use by FBI & CIA

  for (const lang of languages) {
    if (lang.length !== 2) {
      console.warn(`Warning: Language code "${lang}" is not 2 characters long. Skipping regex generation for this code.`);
      continue;
    }
    regexes[lang] = new RegExp(`^${lang}${suffix}$`, "i");
  }

  return regexes;
}