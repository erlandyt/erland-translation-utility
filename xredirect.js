// languages: ["fi", "en", "sv"],
//   tests: {
//     fi: /(fi(-..|))/i,
//     en: /(en(-..|))/i,
//     sv: /(sv(-..|))/i,
//     qqq: /(qqq)/i,
//     qqx: /(qqx)/i,
//     qqz: /(qqz)/i
//   },

let config = {
  languages: [],
  tests: {
    fi: /(fi(-..|))/i,
    en: /(en(-..|))/i,
    sv: /(sv(-..|))/i,
  },
  defaultLanguage: "en",
}

function fixlangcode(code) {
  if (code == null || code === false) return null;

  const values = Array.isArray(code) ? code : [code];

  for (const value of values) {
    const normalized = value.toString().toLowerCase();

    for (const [lang, regex] of Object.entries(config.tests)) {
      regex.lastIndex = 0;
      if (regex.test(normalized)) {
        return lang;
      }
    }
  }

  return null;
}

export function sendXRedirectConfig(newConfig) {
  config = newConfig;
}

// a handler for redirecting page/ to page/?lang=x
export default function xredirect(req, res, next) {
  // if the url already has a lang parameter, do nothing
  if (req.query.lang) {
    next();
    return;
  }
  // get user's language from accept-language header
  let acceptLanguage = req.headers["accept-language"];
  let userLang = fixlangcode(acceptLanguage);
  if (userLang === null) {
    userLang = config.defaultLanguage;
  }
  // redirect to the same url with the lang parameter set to the user's language
  let newUrl = req.originalUrl + (req.originalUrl.includes("?") ? "&" : "?") + "lang=" + userLang;
  res.redirect(302, newUrl);
}