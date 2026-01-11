// Add jsdoc definitions

/**
 * @typedef {Object<string, RegExp>} TestMap
 */

/**
 * @typedef {Object} TranslationConfigObject
 * @property {string[]} languages Array of supported language codes
 * @property {TestMap} tests Object mapping language codes to regexes
 * @property {Object} languageFiles Object mapping language codes to file names
 * @property {string} defaultLanguage Default language code
 * @property {boolean} debug Enable debug mode
 * @property {boolean} skipCache Skip caching of translations
 * @property {boolean} disableDevLang Disable development languages like qqq, qqx and qqz
 * @property {boolean} disableJokeFeatures Disable joke features like uwu translation
 * @property {string} languageDir Directory where language files are stored (e.g. "lang")
 * @property {string} website Include the full website URL, e.g. "https://erland.fi"
 * @property {string} addtohead HTML string to add to the <head> of translated pages
 * @property {string|null} excludeLinksRegex Regex string to exclude certain links from translation processing
 * @property {boolean} handleNewlinesAsBr Whether to convert newlines to <br> tags in translations
 */

/**
 * @type {TranslationConfigObject}
 */
let config = {
  languages: [/*"fi", "en", "sv"*/],
  tests: {
    fi: /(fi(-..|))/i,
    en: /(en(-..|))/i,
    sv: /(sv(-..|))/i,
    qqq: /(qqq)/i,
    qqx: /(qqx)/i,
    qqz: /(qqz)/i
  },
  languageFiles: {
    en: "en.json",
    fi: "fi.json",
    sv: "sv.json",
    qqq: null,
    qqx: null,
    qqz: null
  },
  defaultLanguage: "en",
  debug: false,
  skipCache: false,
  disableDevLang: false,
  disableJokeFeatures: false,
  languageDir: "lang",
  website: "",
  addtohead: "",
  excludeLinksRegex: null,
  handleNewlinesAsBr: false
};

import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import {decode} from 'html-entities';
import parser from 'accept-language-parser';
import { convertToUwu } from './extras/joke.js';
import Cache from "cache";

/*import { url } from 'inspector';*/

const __dirname = path.resolve();
let debugMode = process.argv.includes("--debug") || config.debug;
let pages = new Cache(2 * 60 * 60 * 1000);    // Create a cache

/*
* Translation type attributes:
* alt: Have localied alt-text. Only for <img> tags.
* src: Have localized src. Add "-alt" to the end of the translation key to translate the alt text. Only for <img> tags.
* list: Have a list of items. Only for <ul> and <ol> tags. Currently starts by removing all children, should be fixed in future.
* table: Have a table. Only for <table> tags. Doesn't remove children.
* -> data-translation-table-format: "h", "b", "f" for header, body, footer or combination. If h or f is used, there can only be one row. If both h and f are used, they must be 2 rows. If any combination with b is used, any number of rows is allowed.
* attributeOnly: Only translate a attribute
* attributes: Translate multiple attributes. Use data-translation-attributes to define a comma-separated list of attributes to translate. Use "content" to translate inner text.
* */

/*
* @param {Object} original - The original configuration object
* @param {Object} updates - The updated configuration object
* @returns {Object} - The merged configuration object
*/
function updateModifiedValues(original, updates) {
  for (const key in updates) {
    try {
      const updateValue = updates[key];
      const originalValue = original[key];

      // Handle RegExp explicitly
      if (updateValue instanceof RegExp) {
        if (!(originalValue instanceof RegExp) || originalValue.toString() !== updateValue.toString()) {
          original[key] = updateValue; // Replace only if different
        }
      } else if (typeof updateValue === 'object' && updateValue !== null) {
        if (Array.isArray(updateValue)) {
          // Ensure arrays are updated only if they differ
          if (!Array.isArray(originalValue)) {
            original[key] = updateValue; // Replace non-array with array
          } else if (JSON.stringify(originalValue) !== JSON.stringify(updateValue)) {
            original[key] = updateValue; // Replace with new array
          }
        } else {
          // Handle objects, check for empty objects
          if (typeof originalValue !== 'object' || Array.isArray(originalValue) || originalValue === null) {
            original[key] = {}; // Initialize as an object if needed
          }
          if (Object.keys(updateValue).length === 0) {
            // If the updated object is empty, replace the original
            original[key] = {};
          } else {
            updateModifiedValues(original[key], updateValue); // Recurse for nested objects
          }
        }
      } else if (typeof updateValue === 'boolean') {
        // Ensure booleans are updated only if different
        if (typeof originalValue !== 'boolean' || originalValue !== updateValue) {
          original[key] = updateValue;
        }
      } else if (typeof updateValue === 'number') {
        // Ensure numbers are updated only if different
        if (typeof originalValue !== 'number' || originalValue !== updateValue) {
          original[key] = updateValue;
        }
      } else if (typeof updateValue === 'string') {
        // Ensure strings are updated only if different
        if (typeof originalValue !== 'string' || originalValue !== updateValue) {
          original[key] = updateValue;
        }
      } else if (updateValue === null) {
        // Replace with null if needed
        original[key] = null;
      }
    } catch (err) {
      console.error(err);
    }
  }
  return original;
}

/**
 * 
 * @param {TranslationConfigObject} newConfig - New configuration values to update. You have to explicitly set values to null to disable them.
 * @returns {TranslationConfigObject} The updated configuration object
 */
export function translationConfig(newConfig) {
  if (newConfig) {
    config = updateModifiedValues(config, newConfig);
  } else if (debugMode) {
    console.log("No new config provided, using default.");
  }
  if (!config.disableDevLang) {
    if (!config.languages.includes("qqq")) {
      config.languages.push("qqq");
    }
    if (!config.languages.includes("qqx")) {
      config.languages.push("qqx");
    }
    if (!config.languages.includes("qqz")) {
      config.languages.push("qqz");
    }
    config.tests.qqq = /(qqq)/i;
    config.tests.qqx = /(qqx)/i;
    config.tests.qqz = /(qqz)/i;
  } else {
    config.languages = config.languages.filter(lang => !["qqq", "qqx", "qqz"].includes(lang));
    delete config.tests.qqq;
    delete config.tests.qqx;
    delete config.tests.qqz;
  }
  return config;
}

export function fixlangcode(code) {
  if (code == null || code === false) return null;

  const tests = config.tests;

  const values = Array.isArray(code) ? code : [code];

  for (const value of values) {
    const normalized = value.toString().toLowerCase();

    for (const [lang, regex] of Object.entries(tests)) {
      regex.lastIndex = 0;
      if (regex.test(normalized)) {
        return lang;
      }
    }
  }

  return null;
}


export function languageSelected(req) {
  let supportedLanguages = config.languages;
  return (
    fixlangcode(req.query.lang) ||
    parser.pick(supportedLanguages, req.headers["accept-language"], {loose: true}) ||
    config.defaultLanguage ||
    "en"
  );
}

/**
 * 
 * @param {Req} req The express request
 * @param {String} page Page HTML content
 * @param {String} pagename Directory address of the page without the starting slash
 * @returns {String} Translated HTML content
 */
export function translate(req, page, pagename) {
  try {
    let supportedLanguages = config.languages;
    const language = (
      fixlangcode(req.query.lang) ||
      parser.pick(supportedLanguages, req.headers["accept-language"], {loose: true}) ||
      config.defaultLanguage ||
      "en"
    );
    // Add language validation
    console.log("Final code", language);
    if (!config.skipCache && typeof pagename === "string" && req.query.uwu !== "true") {
      let cachedPage = pages.get(pagename + "@" + language);
      if (cachedPage) {
        console.log("Cache hit for page:", pagename, "language:", language);
        return cachedPage;
      }
    }
    let languageFiles = config.languageFiles;

    let translations = {} // Empty object for qqq, qqx & qqz since we won't load any file
    if (language !== "qqq" && language !== "qqx" && language !== "qqz") {
      translations = JSON.parse(fs.readFileSync(__dirname+"/lang/"+languageFiles[language]).toString());
    }
    const blank = JSON.parse(fs.readFileSync(__dirname+"/lang/bl.json").toString());

    let $ = cheerio.load(page);
    //For all element
    $("html").attr('lang', language);
    try {
      $("head").append(config.addtohead);
    } catch (err) {console.error(err);}

    let uwuMode = false;
    if (req.query.uwu === "true" && !config.disableJokeFeatures) {uwuMode = true;}
    $("[data-translation]").each((i, v) => {
      try {
        let element = $(v);

        if (debugMode) {
          console.log("element", typeof element);
          console.log("selector", typeof $(this));
          console.log("attr", element.attr('data-translation'));
          console.log("translation", translations[element.attr('data-translation')]);
          console.log(typeof translations[element.attr('data-translation')]);
          console.log("first");
        }

        if (language === "qqq") {
          const translationKey = element.attr('data-translation');
          // Show the translation key instead of the value
          element.html(translationKey);
          element.attr("data-translated", translationKey);
          return;
        } else if (language === "qqx") {
          // Hide the element
          element.html("");
          element.attr("data-translated", "");
          return;
        } else if (language === "qqz") {
          return;
        }

        let translationType = element.attr("data-translation-type")?.toLowerCase()||"";
        if ((translations[element.attr('data-translation')] === null ||typeof translations[element.attr('data-translation')]=== "undefined"||translations[element.attr('data-translation')]==="")&&translationType !== "attributes") {
          if (translations[element.attr('data-translation')]==="") {
            console.log("no translation:", element.attr('data-translation'), element.html());
          } else {
            console.log("no translation in file:", element.attr('data-translation'), element.html());
          }
          if (typeof element.attr("data-translated") !== "undefined") {element.attr("data-translated", JSON.parse(fs.readFileSync(__dirname+"/lang/"+languageFiles[language]).toString())[element.attr("data-translation")]);}
          // check if the file is in blank file
          if (!Object.keys(blank).includes(element.attr('data-translation'))) {console.log("Not in blank", element.attr('data-translation'));}
        } else {
          let translationValue = translations[element.attr('data-translation')];
          if (config.handleNewlinesAsBr) {
            if (typeof translationValue === "string") {
              translationValue = translationValue.replaceAll("\n", "<br>");
            } else if (Array.isArray(translationValue)) { // may be 1 or 2 layers
              translationValue = translationValue.map(v => {
                if (typeof v === "string") {
                  return v.replaceAll("\n", "<br>");
                } else if (Array.isArray(v)) {
                  return v.map(v2 => {
                    if (typeof v2 === "string") {
                      return v2.replaceAll("\n", "<br>");
                    } else {
                      return v2;
                    }
                  });
                } else {
                  return v;
                }
              });
            }
          }
          if (uwuMode) {
            if (typeof translationValue === "string") {
              translationValue = convertToUwu(translationValue);
            } else if (Array.isArray(translationValue)) { // may be 1 or 2 layers
              translationValue = translationValue.map(v => {
                if (typeof v === "string") {
                  return convertToUwu(v);
                } else if (Array.isArray(v)) {
                  return v.map(v2 => {
                    if (typeof v2 === "string") {
                      return convertToUwu(v2);
                    } else {
                      return v2;
                    }
                  });
                } else {
                  return v;
                }
              });
            }
          }
          // Main section
          if (translationType === "alt") { // Alt text
            //Image alt, if source is required use "src"
            element.attr('alt', translationValue);
          } else if (translationType === "src") { // Image src
            // Source. Alt can be defined with "*-alt"
            element.attr('src', translationValue)
            if (translations[element.attr('data-translation')+"-alt"]) {
              element.attr('alt', translations[element.attr('data-translation')+"-alt"])
            }
          } else if (translationType === "aria-label") {
            element.attr("aria-label", translationValue);
          } else if (translationType === "list") { // List
            if (!['ul', 'ol'].includes(element.prop('tagName').toLowerCase())) {
              console.error("Tried to translate a list that is not a <ul> or <ol> element: "+element.attr('data-translation'));
              return;
            }
            if (element.children().length !== translationValue.length && element.children().length !== 0) {
              console.warn("Warning: Length mismatch:", element.attr('data-translation'), "Element has", element.children().length, "JSON has", translationValue.length);
            }
            //Makes a list if the attribute matches
            const existingItems = element.children('li');
            let translationsTemp = translationValue
            existingItems.each((index, element) => {
              if (index < translationsTemp.length) {
                $(element).html(translationsTemp[index]);
              }
            });

            // Add new <li> elements if needed
            if (translationsTemp.length > existingItems.length) {
              for (let i = existingItems.length; i < translationsTemp.length; i++) {
                element.append(`<li>${translationsTemp[i]}</li>`);
              }
            }
          } else if (translationType === "table") { // Table
            /*[
              ["data", "data", "data"],
              ["data", "data", "data", "data"], etc
            ]*/
            let tableFormat = element.attr("data-translation-table-format")?.toLowerCase()||"b";
            let array = translationValue;
            let failed = false  
            if (!Array.isArray(array)) {console.error("Not an array"); return;}
            array.forEach(v => {
              if (typeof v === "string") {
                console.error("Did you mean to set the type to 'list'?");
                failed = true
              } else if (!Array.isArray(v)) {
                console.error("Not an inner array");
                failed = true
              } else {
                v.forEach(v2 => {
                  if (typeof v2 !== "string") {
                    console.error("Not a string in inner array.");
                    failed = true
                  }
                });
              }
            });
            if (failed === true) {console.error("Failed to translate array: \""+element.attr('data-translation')+"\""); return;}
            // New version with support for thead, tbody and tfoot. Simply, the first row is thead if h is used, the last row is tfoot if f is used, and the rest is tbody.
            // DO NOT CLEAR! element.html(""); // Clear existing content
            // ─────────────────────────────
            // Helpers (preserve attributes)
            // ─────────────────────────────
            function ensureRow(section, rowIndex) {
              let rows = section.children("tr");
              if (rows.eq(rowIndex).length) return rows.eq(rowIndex);

              const template = rows.last().length
                ? rows.last().clone(true)
                : $("<tr>");

              section.append(template);
              return section.children("tr").last();
            }

            function ensureCell(row, cellIndex, tagName) {
              let cells = row.children(tagName);
              if (cells.eq(cellIndex).length) return cells.eq(cellIndex);

              const template = cells.last().length
                ? cells.last().clone(true)
                : $(`<${tagName}>`);

              row.append(template);
              return row.children(tagName).last();
            }

            function fillSection(section, data, cellTag) {
              data.forEach((rowData, r) => {
                const row = ensureRow(section, r);
                rowData.forEach((value, c) => {
                  const cell = ensureCell(row, c, cellTag);
                  cell.text(value); // replaces content, keeps attributes
                });
              });
            }

            // ─────────────────────────────
            // Layout calculation
            // ─────────────────────────────
            let startIndex = 0;
            let endIndex = array.length;

            const hasHead = tableFormat.includes("h");
            const hasFoot = tableFormat.includes("f");

            if (hasHead) startIndex = 1;
            if (hasFoot) endIndex = array.length - 1;

            // ─────────────────────────────
            // THEAD
            // ─────────────────────────────
            if (hasHead && array.length > 0) {
              let thead = element.children("thead");
              if (!thead.length) {
                thead = $("<thead><tr><th></th></tr></thead>");
                element.prepend(thead);
              }
              fillSection(thead, [array[0]], "th");
            }

            // ─────────────────────────────
            // TBODY
            // ─────────────────────────────
            let tbody = element.children("tbody");
            if (!tbody.length) {
              tbody = $("<tbody><tr><td></td></tr></tbody>");
              element.append(tbody);
            }

            fillSection(tbody, array.slice(startIndex, endIndex), "td");

            // ─────────────────────────────
            // TFOOT
            // ─────────────────────────────
            if (hasFoot && array.length > 0) {
              let tfoot = element.children("tfoot");
              if (!tfoot.length) {
                tfoot = "<tfoot><tr><td></td></tr></tfoot>";
                element.append(tfoot);
              }
              fillSection(tfoot, [array[array.length - 1]], "td");
            }
          } else if (translationType === "attributeonly") { // Attribute translation only
            if (!element.attr("data-translation-attribute")) {console.error("No attribute:", element.attr("data-translation")); return;}
            element.attr(element.attr("data-translation-attribute"), translationValue)
          } else if (translationType === "attributes") {
            // Get all attributes with data-translation-attributes ("attribute1,attribute2") Found in json with data-translation combined with "-name" as key.
            if (!element.attr("data-translation-attributes")) {console.error("No attributes:", element.attr("data-translation")); return;}
            let attrs = element.attr("data-translation-attributes").split(",").map(attr => attr.trim()); // "content" is a special case that means inner text
            attrs.forEach(attr => {
              if (attr.trim().toLowerCase() === "content") {
                let translationResult = translations[element.attr('data-translation') + "-content"];
                // noinspection DuplicatedCode
                element.html(translationResult);
                if (element.hasClass('hacker') || element.attr("data-value")) {
                  element.attr("data-value", decode(translationResult, {level: 'html5'}).replaceAll("<br>", "\n"));
                  element.attr("aria-label", translationResult.replaceAll("<br>", " ").replaceAll(/ +/gmi, " "));
                }
                if (typeof element.attr("data-translated") !== "undefined") {
                  element.attr("data-translated", translationResult);
                }
              } else {
                let key = element.attr('data-translation')+"-"+attr.trim();
                if (typeof translations[key] === "undefined") {
                  console.error("No translation for attribute:", key);
                } else {
                  element.attr(attr.trim(), translations[key]);
                }
              }
            });
          } else { // Normal translation
            let translationResult = translationValue;
            // noinspection DuplicatedCode
            element.html(translationResult);
            if (element.hasClass('hacker')||element.attr("data-value")) {
              element.attr("data-value", decode(translationResult, {level: 'html5'}).replaceAll("<br>", "\n"));
              element.attr("aria-label", translationResult.replaceAll("<br>", " ").replaceAll(/ +/gmi, " "));
            }
            if (typeof element.attr("data-translated") !== "undefined") {
              element.attr("data-translated", translationResult);
            }
          }
        }
      } catch (err) {console.log(err);}
    });
    if (req.query.lang) {
      $("a").each((i, v) => {
        let href = $(v).attr("href");
        if (!/(mailto:|https|http|^#).*/igm.test(href)) {
          // config exclusions
          if (config.excludeLinksRegex) {
            let excludeRegex = new RegExp(config.excludeLinksRegex, "igm");
            if (excludeRegex.test(href)) {
              return; // skip this link
            }
          }
          let url = new URL(href, config.website || "https://erland.fi");
          if (!url.searchParams.get("lang")) {
            url.searchParams.append("lang", language);//new URLSearchParams("?lang="+language)
            $(v).attr("href", url.toString().replaceAll(config.website || "https://erland.fi", ""));
          }
        }
      });
    }
    if (req.query.uwu === "true") {
      $("a").each((i, v) => {
        let href = $(v).attr("href");
        if (!/(mailto:|^https|^http|^#).*/igm.test(href)) {
          // config exclusions
          if (config.excludeLinksRegex) {
            let excludeRegex = new RegExp(config.excludeLinksRegex, "igm");
            if (excludeRegex.test(href)) {
              return; // skip this link
            }
          }
          let url = new URL(href, config.website || "https://erland.fi");
          if (!url.searchParams.get("uwu")) {
            url.searchParams.append("uwu", "true");//new URLSearchParams("?lang="+language)
            $(v).attr("href", url.toString().replaceAll(config.website || "https://erland.fi", ""));
          }
        }
      });
    }
    config.languages.forEach(e => {
      if (/(qqq|qqx|qqz)/gmi.test(e)) {return;}
      $("head").append('<link rel="alternate" hreflang="'+e+'" href="'+config.website+'/'+pagename+'?lang='+e+'" />');
    })
    $("head").append('<link rel="alternate" hreflang="x-default" href="'+config.website+'/'+pagename+'" />');
    $("head").append('<link rel="canonical" href="'+config.website+'/'+pagename+'?lang='+language+'" />');

    if (!config.skipCache && typeof pagename === "string" && req.query.uwu !== "true") {
      pages.put(pagename + "@" + language, $.html());
    }
    return $.html();
  } catch (e) {
    console.error(e);
    return page;
  }
}
