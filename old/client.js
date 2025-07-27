// Translation utility clientside edition
function getTranslation(lang) {
  if (!lang) {
    throw new Error("Language not provided");
  }
  if (!settings.disableDevLang) {
    if (lang === "qqq") {
      return "dev";
    }
    if (lang === "qqx") {
      return "dev";
    }
  }
  console.log("/"+settings.languageDir+"/" + lang + ".json");
  console.log("Dir:", settings.languageDir, "Lang:", lang);
  return fetch("/"+settings.languageDir+"/" + lang + ".json").then((response) => {
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return response.json();
  }).then((data) => {
    return data;
  });
}

// DO NOT CHANGE LINE BELOW - BREAKS BOTH PROD AND DEV
let settings = [[["settings placeholder"]]]; //This is automatically replaced before serving. Do not modify this line. THIS MUST NOT BE AN OBJECT INITIALLY. THIS MUST THROW AN ERROR.
// DO NOT CHANGE LINE ABOVE - BREAKS BOTH PROD AND DEV

function decode(html) {
  const txt = document.createElement('textarea');
  // Replace <br> tags with newlines first
  txt.innerHTML = html.replace(/<br\s*\/?>/gi, '\n');
  return txt.value;
}

function checkLanguageValidity(lang) {
  if (!settings.languages.includes(lang)) {
    throw new Error("Language not valid");
  } else {
    return true;
  }
}



/*function updateLanguage(language) {
  if (!checkLanguageValidity(language)) {
    throw new Error("Language not found");
  }
  let translations = {};
  if (language !== "qqq" && language !== "qqx") {
    translations = getTranslation(language);
    if (translations === null || typeof translations === "undefined") {
      throw new Error("Translation not found");
    }
  }*/
function updateLanguage(language) {
  if (!checkLanguageValidity(language)) {
    throw new Error("Language not found");
  }
  let translations = {};
  if (language !== "qqq" && language !== "qqx") {
    getTranslation(language).then((result) => {
      translations = result;
      if (translations === null || typeof translations === "undefined") {
        throw new Error("Translation not found");
      }
      applyTranslations(language, translations);
    }).catch((error) => {
      console.error(error);
    });
  } else {
    applyTranslations(language, translations);
  }
}

function applyTranslations(language, translations) {
  Array.from(document.querySelectorAll("[data-translation]")).forEach((element) => {
    let translationKey = element.getAttribute('data-translation');
    let translationType = element.getAttribute('data-translation-type');
    if (language === "qqq") {
      // Show the translation key instead of the value
      element.innerHTML = translationKey;
      element.setAttribute("data-translated", translationKey);
      return;
    } else if (language === "qqx") {
      // Hide the element
      element.innerHTML = "";
      element.setAttribute("data-translated", "");
      return;
    }
    if (translations[translationKey] === null || typeof translations[translationKey] === "undefined" || translations[translationKey] === "") {
      throw new Error("Translation not found: " + translationKey);
    } else {
      // Main section
      if (translationType?.toLowerCase() === "alt") {
        //Image alt, if source is required use "src"
        element.setAttribute('alt', translations[translationKey]);
      } else if (translationType?.toLowerCase() === "src") {
        // Source. Alt can be defined with "*-alt"
        element.setAttribute('src', translations[translationKey])
        if (translations[translationKey + "-alt"]) {
          element.setAttribute('alt', translations[translationKey + "-alt"])
        }
      } else if (translationType?.toLowerCase() === "list") {
        if (!['ul', 'ol'].includes(element.tagName.toLowerCase())) {
          throw new Error("Tried to translate a list that is not a <ul> or <ol> element: " + translationKey);
        }
        if (element.children.length !== translations[translationKey].length) {
          console.warn("Warning: Length mismatch:", translationKey, element.children.length, translations[translationKey].length);
        }
        //Makes a list if the attribute matches
        const existingItems = Array.from(element.children);
        let translationsTemp = translations[translationKey]
        existingItems.forEach((element2, index) => {
          if (index < translationsTemp.length) {
            element2.innerHTML = translationsTemp[index];
          }
        });

        // Add new <li> elements if needed
        if (translationsTemp.length > existingItems.length) {
          for (let i = existingItems.length; i < translationsTemp.length; i++) {
            element.insertAdjacentHTML("beforeend", `<li>${translationsTemp[i]}</li>`);//element.append(`<li>${translationsTemp[i]}</li>`);
          }
        }
      } else if (translationType?.toLowerCase() === "table") {
        /*[
          ["data", "data", "data"],
          ["data", "data", "data", "data"], etc
        ]*/
        let array = translations[translationKey];

        array.forEach((v, i) => {
          let element2 = element.querySelectorAll("tr")[i];
          if (element2) {
            v.forEach((v2, i2) => {
              let element3 = element2.querySelectorAll("td, th")[i2];
              if (element3) {
                element3.innerHTML = v2;
              } else {
                console.warn("Warning: Element not found", i, i2);
              }
            });
          } else {
            console.warn("Warning: Element not found", i);
          }
        });
      } else {
        element.innerHTML = translations[translationKey];
        if (element.classList.contains('hacker') || element.getAttribute("data-value")) {
          element.setAttribute("data-value", decode(translations[translationKey], { level: 'html5' }).replace(/<br>/g, "\n"));
        }
        
        if (element.hasAttribute("data-translated")) {
          element.setAttribute("data-translated", translations[translationKey]);
        }
      }
    }
  })
}
window.addEventListener("languagechange", () => {
  console.log("languagechange event detected!");
});
