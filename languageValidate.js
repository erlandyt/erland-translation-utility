import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
//import { error } from 'console';


let estonianEnabled = (process.argv.includes("-es") ? true: false);
console.log(estonianEnabled ? "Checking Estonian" : "Not Checking Estonian (Enable with -es)");

console.log(chalk.redBright.bold("---------------"));
const spinner = ora({
  text: "Initializing",
  spinner: {
    "interval": 180,
    "frames": [
      "🌍 ",
      "🌎 ",
      "🌏 "
    ]
  }
}
).start();
//var bar = new ProgressBar(':bar :part :elapsed', { total: 6, complete: "▰", incomplete: "▱" });


const __dirname = path.resolve();
const filePath = './translations.txt';

let now = Date();
fs.writeFileSync(filePath, "["+now.toString()+"]\nLanguageValidate.js: Supplement, Confirm, Patch\n");

let errorlist = {};

function appendToFile(language, v, testLang, content) {
  if (!errorlist[testLang]) {
    errorlist[testLang] = {};
  }
  if (!errorlist[testLang][language]) {
    errorlist[testLang][language] = {};
  }
  if (!errorlist[testLang][language][v]) {
    errorlist[testLang][language][v] = [];
  }
  errorlist[testLang][language][v].push(content);
  //fs.writeFileSync(filePath, content, { flag: 'a' });
}

function padString(str, length) {
  if (typeof str !== 'string' || typeof length !== 'number' || length < 0) {
    throw new Error('Invalid input');
  }

  if (str.length >= length) {
    return str; // No padding needed if the string is already equal to or longer than the specified length
  }

  const spacesToAdd = length - str.length;
  const paddedString = str + ' '.repeat(spacesToAdd); // Add spaces to the end of the string
  return paddedString;
}
function padStringLine(str, length) {
  if (typeof str !== 'string' || typeof length !== 'number' || length < 0) {
    throw new Error('Invalid input');
  }

  if (str.length >= length) {
    return str; // No padding needed if the string is already equal to or longer than the specified length
  }

  const spacesToAdd = length - str.length;
  const paddedString = str + '─'.repeat(spacesToAdd); // Add spaces to the end of the string
  return paddedString;
}

function toLowerCaseArray(arr) {
  return arr.map(item => item.toLowerCase());
}

function levenshtein(a, b) {
  const matrix = [];

  // Increment along the first column of each row
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // Increment each column in the first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}


function findLowestDifference(arr, target) {
  let closestMatch = null;
  let lowestDistance = Infinity;

  arr.forEach(item => {
    const distance = levenshtein(target, item);
    if (distance < lowestDistance) {
      lowestDistance = distance;
      closestMatch = item;
    }
  });

  return {"match": closestMatch, "distance": lowestDistance};
}


let blank = JSON.parse(fs.readFileSync(__dirname+"/lang/bl.json"));
let en = JSON.parse(fs.readFileSync(__dirname+"/lang/en.json"));
let fi = JSON.parse(fs.readFileSync(__dirname+"/lang/fi.json"));
let se = JSON.parse(fs.readFileSync(__dirname+"/lang/se.json"));
let et = JSON.parse(fs.readFileSync(__dirname+"/lang/et.json"));
let selko = JSON.parse(fs.readFileSync(__dirname+"/lang/selko.json"));


function isEmpty(value) {
  if (value == null) {
    return true; // null or undefined
  } else if (typeof value === 'string') {
    return value.trim().length === 0; // empty string
  } else if (Array.isArray(value)) {
    return value.length === 0 || value.every(isEmpty); // empty array or all elements are empty
  } else if (typeof value === 'object') {
    return Object.keys(value).length === 0 || Object.values(value).every(isEmpty); // empty object or all properties are empty
  }
  return false; // for other data types
}


//Original string is the string in the language that is selected and is being compared to
function checkForIssues(string, origString, reference, toCheck, language, testLang) {
  if (typeof string === "string" && typeof origString === "string") {
    if (/<a.*>/.test(string) && !/<a.*>/.test(origString)) {

      //if the new string doesn't have a "a"-element, throw an error
      appendToFile(language, /*v*/string, testLang, `Missing <a> element`);

      console.log("a");
    } else if (!/<a.*>/.test(string) && /<a.*>/.test(origString)) {
      appendToFile(language, /*v*/string, testLang, `Has <a> element unlike checked`);

    }

  } else {
    console.error("Not a string");
  }
}

function checkKeys(reference, toCheck, language, testLang) {
  let checkable = Object.keys(toCheck).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  let original = Object.keys(reference).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  original.forEach(v => {
    if (typeof toCheck[v] === "object") {
      if (toCheck[v].length !== reference[v].length) {
        appendToFile(language, v, testLang, `unusual array length | ${testLang}: ${reference[v].length}, ${language}: ${toCheck[v].length}`);
      }
      Object.values(toCheck[v]).forEach(v2=>{
        try {
          if (typeof toCheck[v] === "object") {
            /*Object.values(toCheck[v][v2]).forEach(v3=>{
              checkForIssues(toCheck[v][v2][v3], reference[v][v2][v3], reference, toCheck, language, testLang);
            });*/
          } else {
            checkForIssues(toCheck[v][v2], reference[v][v2], reference, toCheck, language, testLang);
          }
        } catch (err) {
          console.log(err.toString().trim(), Object.values(toCheck[v]));
        }
      });
    } else {
      checkForIssues(toCheck[v], reference[v]);
    }
    if (!checkable.includes(v)) {
      if (toLowerCaseArray(checkable).includes(v.toLowerCase())) {
        appendToFile(language, v, testLang, `translation key in correctly capitalized`);
        return;
      }
      if (language.toLowerCase() !== 'estonian') {
        let levenshteinResult = findLowestDifference(checkable, v);
        if (levenshteinResult.distance <= 8) {
          appendToFile(language, v, testLang, `translation key not found | Closest: "${levenshteinResult.match}" with the score: ${levenshteinResult.distance}`);
          return;
        }
      }
      appendToFile(language, v, testLang, `translation key not found`);
      return;
    } else {
      if (language.toLowerCase() !== 'blank') {
        if (toCheck[v] === null || toCheck[v] === "") {
          appendToFile(language, v, testLang, `translation value not found`);
        } else if (isEmpty(toCheck[v])) {
          appendToFile(language, v, testLang, `translation value not found (2nd attempt)`);
        }
      }
    }
  });
}


spinner.text = "Blank";
// Check keys and append to file
//appendToFile(language, v, testLang,"- Blank\n\n");
checkKeys(blank, en, 'English', 'blank');
checkKeys(blank, fi, 'Finnish', 'blank');
checkKeys(blank, se, 'Swedish', 'blank');
if (estonianEnabled) {
  checkKeys(blank, et, 'Estonian', 'blank');
}
checkKeys(blank, selko, 'Selko', 'blank');

spinner.text = "English";
//appendToFile(language, v, testLang,"\n\n- English\n\n");
checkKeys(en, blank, 'Blank', 'English');
checkKeys(en, fi, 'Finnish', 'English');
checkKeys(en, se, 'Swedish', 'English');
if (estonianEnabled) {
  checkKeys(en, et, 'Estonian', 'English');
}
checkKeys(en, selko, 'Selko', 'English');

spinner.text = "Finnish";
//appendToFile(language, v, testLang,"\n\n- Finnish\n\n");
checkKeys(fi, blank, 'Blank', 'Finnish');
checkKeys(fi, en, 'English', 'Finnish');
checkKeys(fi, se, 'Swedish', 'Finnish');
if (estonianEnabled) {
  checkKeys(fi, et, 'Estonian', 'Finnish');
}
checkKeys(fi, selko, 'Selko', 'Finnish');

spinner.text = "Swedish";
//appendToFile(language, v, testLang,"\n\n- Swedish\n\n");
checkKeys(se, blank, 'Blank', 'Swedish');
checkKeys(se, en, 'English', 'Swedish');
checkKeys(se, fi, 'Finnish', 'Swedish');
if (estonianEnabled) {
  checkKeys(se, et, 'Estonian', 'Swedish');
}
checkKeys(se, selko, 'Selko', 'Swedish');

if (estonianEnabled) {
  spinner.text = "Estonian";
  //appendToFile(language, v, testLang,"\n\n- Estonian\n\n");
  checkKeys(et, blank, 'Blank', 'Estonian');
  checkKeys(et, en, 'English', 'Estonian');
  checkKeys(et, fi, 'Finnish', 'Estonian');
  checkKeys(et, se, 'Swedish', 'Estonian');
  checkKeys(et, selko, 'Selko', 'Estonian');
}
spinner.text = "Selko";

//appendToFile(language, v, testLang,"\n\n- Estonian\n\n");
checkKeys(selko, blank, 'Blank', 'Selko');
checkKeys(selko, en, 'English', 'Selko');
checkKeys(selko, fi, 'Finnish', 'Selko');
checkKeys(selko, se, 'Swedish', 'Selko');
if (estonianEnabled) {
  checkKeys(selko, et, 'Estonian', 'Selko');
}
spinner.stop();
//console.log(errorlist)

//errorlist = {blank: {Swedish: errorlist.blank.Swedish}}
Object.keys(errorlist).forEach((v, i) => { // L1
  let l1char = "┠";
  if (i+1 === errorlist.length) {
    l1char = "";
  }
  let vb = estonianEnabled ? padStringLine(v, 8) : padStringLine(v, 7);
  fs.writeFileSync(filePath, "┠"+vb+"╮\n", { flag: 'a' });
  Object.keys(errorlist[v]).forEach((v2, i2) => { // L2
    let v2b = estonianEnabled ? padStringLine(v2, 8) : padStringLine(v2, 7);
    l1char = "┃";
    let l2char = "│";
    let indent = "";
    if (i2+1 === Object.keys(errorlist[v]).length) {
      l2char = " ";
      indent = l1char+padString("", vb.length)+"└";
    } else {
      indent = l1char+padString("", vb.length)+"├";
    }
    fs.writeFileSync(filePath, indent+v2b+"╮\n", { flag: 'a' });

    Object.keys(errorlist[v][v2]).forEach((v3, i3) => { //L3
      let v3b = padStringLine(v3, 26);
      let l3char = " ";
      let indent2 = "";
      if (i3+1 === Object.keys(errorlist[v][v2]).length) {
        l3char = "└";
        indent2 = l1char+padString("", vb.length)+l2char+padString("", v2b.length);
      } else {
        l3char = "├";
        indent2 = l1char+padString("", vb.length)+l2char+padString("", v2b.length);
      }

      fs.writeFileSync(filePath, indent2+l3char+v3b+"╮\n", { flag: 'a' });
      Object.keys(errorlist[v][v2][v3]).forEach((v4, i4) => { //L4
        //let v4b = padStringLine(errorlist[v][v2][v3][v4], 32);
        let indent3 = "";
        if (i4+1 === Object.keys(errorlist[v][v2][v3]).length) {
          l3char = "│";
          if (i3+1 === Object.keys(errorlist[v][v2]).length) {
            l3char = " ";
          }
          indent3 = l1char+padString("", vb.length)+l2char+padString("", v2b.length)+l3char+padString("", v3b.length)+"└";
        } else {
          if (i4+1 === Object.keys(errorlist[v][v2]).length) {
            l3char = "│aa";
          }
          indent3 = l1char+padString("", vb.length)+l2char+padString("", v2b.length)+l3char+padString("", v3b.length)+"├";
        }
        fs.writeFileSync(filePath, indent3+" "+errorlist[v][v2][v3][v4]+"\n", { flag: 'a' });
      });
    });
  });
});