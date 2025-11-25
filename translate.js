let config = {
  languages: [
    "fi",
    "en",
    "sv"
  ],
  tests: {
    fi: /(fi(-..|))/ig,
    en: /(en(-..|))/ig,
    sv: /(sv(-..|))/ig,
    qqq: /(qqq)/ig,
    qqx: /(qqx)/ig,
    qqz: /(qqz)/ig
  },
  languageFiles: {
    "en": "en.json",
    "fi": "fi.json",
    "sv": "sv.json",
    "qqq": null,
    "qqx": null,
    "qqz": null
  },
  defaultLanguage: "en",
  debug: false,
  disableDevLang: false,
  languageDir: "lang",
  website: "",
  addtohead: "" // Things to add to head in each page.
}
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import {decode} from 'html-entities';
import parser from 'accept-language-parser';
/*import { url } from 'inspector';*/

const __dirname = path.resolve();
let debugMode = process.argv.includes("--debug");

/*
* Translation type attributes:
* alt: Have localied alt-text. Only for <img> tags.
* src: Have localized src. Add "-alt" to the end of the translation key to translate the alt text. Only for <img> tags.
* list: Have a list of items. Only for <ul> and <ol> tags. Currently starts by removing all children, should be fixed in future.
* table: Have a table. Only for <table> tags. Doesn't remove children.
* attributeOnly: Only translate a attribute
* attributes: Translate multiple attributes. Use data-translation-attributes to define a comma-separated list of attributes to translate. Use "content" to translate inner text.
* */

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

export function translationConfig(newConfig) {
  if (newConfig) {
    config = updateModifiedValues(config, newConfig);
  }
  if (!config.disableDevLang) {
    config.languages.push("qqq");
    config.languages.push("qqx");
    config.languages.push("qqz");
    config.tests.qqq = /(qqq)/ig;
    config.tests.qqx = /(qqx)/ig;
    config.tests.qqz = /(qqz)/ig;
  }
  return config;
}

export function fixlangcode(code) { // Necessary? Maybe use pick?
  if (code === null || code === undefined) {return null;}

  let correctCode = null;

  let tests = { // MOVE TO CONFIG!
    fi: /(fi(-..|))/ig, // Autogen?
    en: /(en(-..|))/ig,
    sv: /(sv(-..|))/ig,
    qqq: /(qqq)/ig, //Figre out support in language picker
    qqx: /(qqx)/ig
  };
  if (debugMode) {
    console.log(typeof code);
    console.log("code", code);
  }
  if (code === false) {return null;} //Escape if the language code is wrong

  if (typeof code === "object") {
    //If codes are a list, then go through them
    code.forEach(v2 /*i2*/=> {
      Object.values(tests).forEach((v, i) => { //test them agains all code options
        if (v.test(v2.toString().toLowerCase())) {
          correctCode = Object.keys(tests)[i];
          return correctCode;
        }
      });
    });
  } else {
    Object.values(tests).forEach((v, i) => {
      if (v.test(code.toString().toLowerCase())) {
        correctCode = Object.keys(tests)[i];
        return correctCode;
      }
    });
  }
  return correctCode; //null
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

export function translate(req, page, pagename) {
  let supportedLanguages = config.languages;
  const language = (
    fixlangcode(req.query.lang) ||
    parser.pick(supportedLanguages, req.headers["accept-language"], {loose: true}) ||
    config.defaultLanguage ||
    "en"
  );
  let defaultLanguageInUse = true;
  if (fixlangcode(req.query.lang)) {
    defaultLanguageInUse = false;
  }
  // Add language validation
  console.log("Final code", language);
  let languageFiles = { //MOVE TO CONFIG!
    "en": "en.json",
    "fi": "fi.json",
    "sv": "sv.json",
    "qqq": null,
    "qqx": null
  };

  let translations = {} // Empty object for qqq, qqx & qqz since we won't load any file
  if (language !== "qqq" && language !== "qqx" && language !== "qqz") {
    translations = JSON.parse(fs.readFileSync(__dirname+"/lang/"+language+".json").toString());
  }
  const blank = JSON.parse(fs.readFileSync(__dirname+"/lang/bl.json").toString());

  let $ = cheerio.load(page);
  //For all element
  $("html").attr('lang', language);
  try {
   $("head").append(config.addtohead);
  } catch (err) {console.error(err);}

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
      if (translations[element.attr('data-translation')] === null ||typeof translations[element.attr('data-translation')]=== "undefined"||translations[element.attr('data-translation')]==="") {
        if (translations[element.attr('data-translation')]==="") {
          console.log("no translation:", element.attr('data-translation'), element.html());
        } else {
          console.log("no translation in file:", element.attr('data-translation'), element.html());
        }
        if (typeof element.attr("data-translated") !== "undefined") {element.attr("data-translated", JSON.parse(fs.readFileSync(__dirname+"/lang/"+languageFiles[language]).toString())[element.attr("data-translation")]);}
        // check if the file is in blank file
        if (!Object.keys(blank).includes(element.attr('data-translation'))) {console.log("Not in blank", element.attr('data-translation'));}
      } else {
        let translationType = element.attr("data-translation-type")?.toLowerCase()||"";
        // Main section
        if (translationType === "alt") { // Alt text
          //Image alt, if source is required use "src"
          element.attr('alt', translations[element.attr('data-translation')]);
        } else if (translationType === "src") { // Image src
          // Source. Alt can be defined with "*-alt"
          element.attr('src', translations[element.attr('data-translation')])
          if (translations[element.attr('data-translation')+"-alt"]) {
            element.attr('alt', translations[element.attr('data-translation')+"-alt"])
          }
        } else if (translationType === "aria-label") {
          element.attr("aria-label", translations[element.attr('data-translation')]);
        } else if (translationType === "list") { // List
          if (!['ul', 'ol'].includes(element.prop('tagName').toLowerCase())) {
            console.error("Tried to translate a list that is not a <ul> or <ol> element: "+element.attr('data-translation'));
            return;
          }
          if (element.children().length !== translations[element.attr('data-translation')].length && element.children().length !== 0) {
            console.warn("Warning: Length mismatch:", element.attr('data-translation'), element.children().length, translations[element.attr('data-translation')].length);
          }
          //Makes a list if the attribute matches
          const existingItems = element.children('li');
          let translationsTemp = translations[element.attr('data-translation')]
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
          let array = translations[element.attr('data-translation')];
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
          array.forEach((v, i) => {
            v.forEach((v2, i2) => {
              let element2 = $(element).find("tr")[i];
              let element3 = $(element2).find("td, th")[i2];
              $(element3).html(v2);
            });
          });
        } else if (translationType === "attributenly") { // Attribute translation only
          if (!element.attr("data-translation-attribute")) {console.error("No attribute:", element.attr("data-translation")); return;}
          element.attr(element.attr("data-translation-attribute"), translations[element.attr('data-translation')])
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
                element.attr("aria-label", translationResult.replaceAll("<br>", " ").replaceAll(/ +/, " "));
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
          let translationResult = translations[element.attr('data-translation')];
          // noinspection DuplicatedCode
          element.html(translationResult);
          if (element.hasClass('hacker')||element.attr("data-value")) {
            element.attr("data-value", decode(translationResult, {level: 'html5'}).replaceAll("<br>", "\n"));
            element.attr("aria-label", translationResult.replaceAll("<br>", " ").replaceAll(/ +/, " "));
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
      if (!/(mailto:|https|http|.*\/blog\/|^#).*/igm.test(href)) {
        let url = new URL(href, config.website || "https://erland.fi");
        if (!url.searchParams.get("lang")) {
          url.searchParams.append("lang", language);//new URLSearchParams("?lang="+language)
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
  // figure this shit out later
  if (req.query.lang) {
    $("head").append('<link rel="canonical" href="'+config.website+'/'+pagename+'?lang='+language+'" />');
  } else {
    $("head").append('<link rel="canonical" href="'+config.website+'/'+pagename+'" />');
  }

  return $.html();
}
