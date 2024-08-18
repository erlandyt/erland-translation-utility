import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import {/*encode, */decode} from 'html-entities';
import parser from 'accept-language-parser';
/*import { url } from 'inspector';*/

const __dirname = path.resolve();
let debugMode = process.argv.includes("--debug");

export function fixlangcode(code) {
  if (code === null || code === undefined) {return null;}
  if (code.toLowerCase() === "selko") {return "selko";}

  let correctCode = null;

  let tests = {
    fi: /(fi(-..|))/ig,
    en: /(en(-..|))/ig,
    et: /(et(-..|))/ig,
    se: /(se(-..|))/ig
  };
  if (debugMode) {
    console.log(typeof code);
    console.log("code", code);
  }
  if (code === null || code === undefined) {return null;} //Escape if the language code is wrong

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
  let supportedLanguages = ['sv', 'et', 'en', 'fi'];
  if (req.query.lang?.toLowerCase() === "selko") {
    return 'selko';
  }
  const language = (
    fixlangcode(req.query.lang) ||
    parser.pick(supportedLanguages, req.headers["accept-language"], {loose: true})||
    "en"
  );
  return language;
}

export function translate(req, page) {
  let supportedLanguages = ['sv', 'et', 'en', 'fi'];
  const language = (
    fixlangcode(req.query.lang) ||
    parser.pick(supportedLanguages, req.headers["accept-language"], {loose: true})||
    //fixlangcode(req.headers["accept-language"].replaceAll(/(:|;)q=.*/ig, "").split(',')) ||
    //fixlangcode(req.cookies["lang"]) ||
    "en"
  );
  console.log("Final code", language);
  let languageFiles = {
    "en": "en.json",
    "fi": "fi.json",
    "et": "et.json",
    "se": "se.json",
    "selko": "selko.json"
  };

  const translations = JSON.parse(fs.readFileSync(__dirname+"/lang/"+languageFiles[language]));
  const blank = JSON.parse(fs.readFileSync(__dirname+"/lang/bl.json"));

  let $ = cheerio.load(page);
  //For all element
  $("html").attr('lang', language);

  $("[data-translation]").each(i => {
    try {
      let element = $(i);
      if (debugMode) {
        console.log("element", typeof element);
        console.log("selector", typeof $(this));
        console.log("attr", element.attr('data-translation'));
        console.log("translation", translations[element.attr('data-translation')]);
        console.log(typeof translations[element.attr('data-translation')]);
        console.log("first");
      }
      if (translations[element.attr('data-translation')] === null ||typeof translations[element.attr('data-translation')]=== "undefined"||translations[element.attr('data-translation')]==="") {
        if (element.attr("data-translation-special") === "selko") {
          return;
        }
        if (translations[element.attr('data-translation')]==="") {
          console.log("no translation:", element.attr('data-translation'), element.html());
        } else {
          console.log("no translation in file:", element.attr('data-translation'), element.html());
        }
        if (typeof element.attr("data-translated") !== "undefined") {element.attr("data-translated", JSON.parse(fs.readFileSync(__dirname+"/lang/"+languageFiles[language]))[element.attr("data-translation")]);}
        // check if the file is in blank file
        if (!Object.keys(blank).includes(element.attr('data-translation'))) {console.log("Not in blank", element.attr('data-translation'));}
      } else {
        // Main section
        if (element.attr("data-translation-type")?.toLowerCase() === "alt") {
          element.attr('alt', translations[element.attr('data-translation')]);
        } else if (element.attr("data-translation-type")?.toLowerCase() === "list") {
          //Makes a list if the attribute matches
          element.html("");
          translations[element.attr('data-translation')].forEach(v => {
            if (v === null ||typeof v === "undefined"|| v ==="") {
              console.log("No translation:", element.attr('data-translation'));
            } else {
              element.append("<li>"+v+"</li>");
            }
          });
        } else if (element.attr("data-translation-type")?.toLowerCase() === "table") {
          /*[
            ["data", "data", "data"],
            ["data", "data", "data", "data"], etc
          ]*/
          let array = translations[element.attr('data-translation')];

          array.forEach((v, i) => {
            v.forEach((v2, i2) => {
              //console.log($(element).find("tr")[i])
              //console.log($(element).find("tr")[i].find("td")[i])
              let element2 = $(element).find("tr")[i];
              let element3 = $(element2).find("td, th")[i2];
              $(element3).html(v2);
              //$(element).find("tr")[i].find("td")[i]//.html(v)
            });
          });
        } else {
          element.html(translations[element.attr('data-translation')]);
          if (element.hasClass('hacker')||element.attr("data-value")) {
            element.attr("data-value", decode(translations[element.attr('data-translation')], {level: 'html5'}).replaceAll("<br>", "\n"));
          }
          if (typeof element.attr("data-translated") !== "undefined") {
            element.attr("data-translated", translations[element.attr('data-translation')]);
          }
        }
      }
    } catch (err) {console.log(err);}
  });
  if (req.query.lang) {
    $("a").each((i, v) => {
      if (!/(mailto:|https|http|.*\/blog\/).*/igm.test($(v).attr("href"))) {
        let url = new URL($(v).attr("href"), "https://erland.fi");
        if (!url.searchParams.get("lang")) {
          /*url.searchParams = */url.searchParams.append("lang", language);//new URLSearchParams("?lang="+language)
          $(v).attr("href", url.toString().replaceAll("https://erland.fi", ""));
        }
      }
      /*if (/#.im.test(v.attr("href"))) {} else {
        //list. "?lang="+ +"#"+rest//add language as second
      }//language
      v.attr("href")+"?lang="*/
    });
  }
  return $.html();
}
