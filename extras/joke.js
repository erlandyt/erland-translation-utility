import face from "./faces.js";
import { random, replaceRegexMatchCase, addCharToRegexMatch } from "./util.js";

/**
 * @param {string} message - The message to convert
 * @param {Object} options - Options for converting the message
 */
export function convertToUwu(
  message = null,
  options = { stutter: true, tilde: true }
) {
  if (typeof message !== "string") return message;

  const opts = {
    stutter: true,
    tilde: true,
    ...options,
  };

  // Split into HTML tags and text
  const parts = message.split(/(<[^>]+>)/g);

  const processed = parts.map((part) => {
    // Leave HTML tags unchanged
    if (part.startsWith("<") && part.endsWith(">")) {
      return part;
    }

    // ---- original uwu logic applied only to text ----

    const inputArray = part.split(/\s+/);
    const inputArrayURLRemoved = inputArray.filter(
      (word) =>
        !word.match(
          /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()!@:%_\+.~#?&\/\/=]*)/
        )
    );

    if (inputArrayURLRemoved.length <= 0) return part;

    let edited = inputArrayURLRemoved.join(" ");

    edited = edited.replace(/[lr]/g, "w");
    edited = edited.replace(/[LR]/g, "W");
    edited = replaceRegexMatchCase(/ock/gi, edited, "awk");
    edited = replaceRegexMatchCase(/uck/gi, edited, "ek");
    edited = replaceRegexMatchCase(/qu/gi, edited, "qw");
    edited = addCharToRegexMatch(/(?<=n)[oaui]/gi, edited, "y");
    edited = edited.replace(/o(?=u)/gi, "");
    edited = replaceRegexMatchCase(/qu/gi, edited, "kw");
    edited = replaceRegexMatchCase(/c(?=[eiy])/gi, edited, "s");
    edited = replaceRegexMatchCase(/c(?!h)/gi, edited, "k");
    edited = replaceRegexMatchCase(/(?<=[aeiou])x/gi, edited, "ks");
    edited = replaceRegexMatchCase(/x(?=[aeiou])/gi, edited, "z");
    edited = addCharToRegexMatch(/(?<=ex)[aiu]/gi, edited, "z");

    if (opts.stutter) {
      edited = edited
        .split(" ")
        .map((x) => {
          if (x.length > 2 && /[a-z]{2,}.*/ && random(5)) {
            let charInsert = x[0];
            if (x[1] === "h") charInsert += "h";
            return charInsert + "-" + x;
          }
          return x;
        })
        .join(" ");
    }

    if (opts.tilde) edited += "~";
    //if (Math.random() < 0.5) edited += " " + face();

    return edited;
  });

  return processed.join("");
}
