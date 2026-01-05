console.time("Full test duration");
console.time("Setup duration");
import { translate, fixlangcode, translationConfig } from './../translate.js';
import fs from 'fs';
import chalk from 'chalk';

let logs = [];
let levels = {
  "gen": {command: console.log, color: chalk.grey},
  "log": {command: console.log, color: chalk.white},
  "info": {command: console.info, color: chalk.blue},
  "warn": {command: console.warn, color: chalk.yellow},
  "error": {command: console.error, color: chalk.red, bold: true},
}
function print(level = "log", ...args) {
  level = level.toLowerCase(); // Use lowercase when calling anyways.
  /*if (levels[level]) {
    levels[level](...args);
  } else {
    console.log(...args);
  }*/
  if (levels[level]) {
    logs.push(level+": "+args.map(x => x.toString()).join(" "));
    let msg = args.map(x => x.toString()).join(" ");
    if (levels[level].bold) {
      msg = levels[level].color.bold(level+": "+msg);
    } else {
      msg = levels[level].color(level+": "+msg);
    }
    levels[level].command(msg);
  } else {
    console.log(...args);
    logs.push(args.map(x => x.toString()).join(" "));
  }
}


let testConfig = {
  languageToTest: "en",
  expectedLanguageCode: "en",
  testUWUmode: undefined,
}
if (!testConfig.languageToTest || testConfig.languageToTest === "" || testConfig.expectedLanguageCode === "") {
  print("error", "Please set testConfig.languageToTest and testConfig.expectedLanguageCode to valid values before running the tests.");
  process.exit(1);
}
if (testConfig.testUWUmode === undefined) {
  testConfig.testUWUmode = false;
  print("info", "testConfig.testUWUmode not set, defaulting to false.");
}


/**
 * @typedef {import('./../translate.js').TranslationConfigObject} config
 */
let config = {
  languages: ["en", "fi", "sv"],
  defaultLanguage: "en",
  languageFiles: {
    "en": "en.json",
    "fi": "fi.json",
    "sv": "sv.json"
  },
  tests: {
    fi: /(fi(-..|))/ig,
    en: /(en(-..|))/ig,
    sv: /(sv(-..|))/ig
  },
  debug: false,
  disableDevLang: false,
  disableJokeFeatures: false,
  languageDir: "lang",
  website: "https://test.example",
  addtohead: "<meta data-test='true'>",
  excludeLinksRegex: null
}
print("log", "Setting config.");
let returnedConfig;
try {
  returnedConfig = translationConfig(config);
} catch (e) {
  console.error("Error setting config:", e);
}
print("log", "Config set.");
print("log", "Test config integrity.");
let integrityErrors = "";
try {
  // Test that all of the config values we set are present and identical.
  for (let key in config) {
    try {
      print("gen", "Testing config key:", key);
      // Handle objects and arrays and check that the set keys and values are present.
      if (typeof config[key] === "object" && config[key] !== null) { // Do not compare as strings as script adds more keys.
        let testObj = config[key];
        let returnedObj = returnedConfig[key];
        for (let subKey in testObj) {
          print("gen", `Testing config subkey: ${key}.${subKey}`); // Regexes don't automatically compare correctly.
          if (testObj[subKey] instanceof RegExp) {
            if (testObj[subKey].toString() !== returnedObj[subKey].toString()) {
              print("error", `Config value mismatch for key "${key}.${subKey}": expected regex "${testObj[subKey].toString()}", got "${returnedObj[subKey].toString()}"`);
              integrityErrors += `Config value mismatch for key "${key}.${subKey}": expected regex "${testObj[subKey].toString()}", got "${returnedObj[subKey].toString()}"\n`;
            } else {
              print("gen", `Config value for key "${key}.${subKey}" is correct: "${testObj[subKey].toString()}"`);
            }
            continue;
          }
          if (testObj[subKey] !== returnedObj[subKey]) {
            print("error", `Config value mismatch for key "${key}.${subKey}": expected "${testObj[subKey]}" of type "${typeof testObj[subKey]}", got "${returnedObj[subKey]}" of type "${typeof returnedObj[subKey]}"`);
            integrityErrors += `Config value mismatch for key "${key}.${subKey}": expected "${testObj[subKey]}" of type "${typeof testObj[subKey]}", got "${returnedObj[subKey]}" of type "${typeof returnedObj[subKey]}"\n`;
          } else {
            print("gen", `Config value for key "${key}.${subKey}" is correct: "${testObj[subKey]}"`);
          }
        }
        continue;
      }
      if (config[key] !== returnedConfig[key]) {
        print("error", `Config value mismatch for key "${key}": expected "${config[key]}", got "${returnedConfig[key]}"`);
        integrityErrors += `Config value mismatch for key "${key}": expected "${config[key]}", got "${returnedConfig[key]}"\n`;
      } else {
        print("gen", `Config value for key "${key}" is correct: "${config[key]}"`);
      }
    } catch (e) {
      print("error", `Error testing config key "${key}":`, e);
    }
  }
  /*print("log", "Config integrity test complete.");*/
} catch (e) {
  print("error", "Error during config integrity test:", e);
}
if (integrityErrors !== "") {
  print("error", "Config integrity test failed with the following errors:\n"+integrityErrors);
} else {
  print("info", "Config integrity test passed without errors.");
}
print("log", "Config integrity test complete.");

let reqImitation = {
  query: {
    lang: testConfig.languageToTest,
    uwu: testConfig.testUWUmode ? "true" : "false"
  },
}
let reqImitationDevQQQ = {query: {lang: "qqq"}}
let reqImitationDevQQX = {query: {lang: "qqx"}}
let reqImitationDevQQZ = {query: {lang: "qqz"}}
console.timeEnd("Setup duration");

console.time("Translation test duration");
print("log","Starting translation test.");

let samplePage = fs.readFileSync("./tests/test.html").toString();
let translatedPage = translate(reqImitation, samplePage, "test-page.html");
print("log", "Basic translation done.");
print("log", "Testing dev languages translation.");
let translatedPageDevQQQ = translate(reqImitationDevQQQ, samplePage, "test-page.html");
let translatedPageDevQQX = translate(reqImitationDevQQX, samplePage, "test-page.html");
let translatedPageDevQQZ = translate(reqImitationDevQQZ, samplePage, "test-page.html");
print("log", "Dev languages translation done.");

print("log", "Saving test results.");
// Save the result to a file for manual inspection.
try {
  fs.writeFileSync("./tests/test-result.html", translatedPage);
} catch (e) {
  print("error", "Error saving test result file:", e);
}
try {
  fs.writeFileSync("./tests/test-result-dev-qqq.html", translatedPageDevQQQ);
} catch (e) {
  print("error", "Error saving dev qqq test result file:", e);
}
try {
  fs.writeFileSync("./tests/test-result-dev-qqx.html", translatedPageDevQQX);
} catch (e) {
  print("error", "Error saving dev qqx test result file:", e);
}
try {
  fs.writeFileSync("./tests/test-result-dev-qqz.html", translatedPageDevQQZ);
} catch (e) {
  print("error", "Error saving dev qqz test result file:", e);
}
print("log", "Test results saved.");

print("log", "End of translation test.");
print("info", "Human operator must check test-result.html as automation is not implemented at this moment.");
console.timeEnd("Translation test duration");
console.timeEnd("Full test duration");
fs.writeFileSync("test.log", logs.join("\n"));