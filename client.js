// Translation utility clientside edition

let settings = [[["settings"]]];

function checkLanguageValidity(lang) {
  if (!settings.languages.includes(lang)) {
    throw new Error("Language not found");
  } else {
    return true;
  }
}

function getTranslation(lang) {
  if (!lang) {
    throw new Error("Language not provided");
  }
  fetch("/language/" + lang + ".json").then((response) => {
    return response.json();
  }).then((data) => {
    return data;
  });
}

function updateLanguage(language) {
  if (!checkLanguageValidity(language)) {
    throw new Error("Language not found");
  }
  let translations = {};
  if (language !== "qqq" && language !== "qqx") {
    translations = getTranslation(language);
    if (translations === null || typeof translations === "undefined") {
      throw new Error("Translation not found");
    }
  }
  document.querySelectorAll("[data-translate]").forEach((element) => {
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
        if (!['ul', 'ol'].includes(element.prop('tagName').toLowerCase())) {
          throw new Error("Tried to translate a list that is not a <ul> or <ol> element: " + translationKey);
        }
        if (element.children().length !== translations[translationKey].length) {
          console.warn("Warning: Length mismatch:", translationKey, element.children().length, translations[translationKey].length);
        }
        //Makes a list if the attribute matches
        const existingItems = element.children('li');
        let translationsTemp = translations[translationKey]
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
      } else if (translationType?.toLowerCase() === "table") {
        /*[
          ["data", "data", "data"],
          ["data", "data", "data", "data"], etc
        ]*/
        let array = translations[translationKey];

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
        element.html(translations[translationKey]);
        if (element.hasClass('hacker') || element.attr("data-value")) {
          element.setAttribute("data-value", decode(translations[translationKey], {level: 'html5'}).replaceAll("<br>", "\n"));
        }
        if (typeof element.attr("data-translated") !== "undefined") {
          element.setAttribute("data-translated", translations[translationKey]);
        }
      }
    }
  })
}
window.addEventListener("languagechange", () => {
  console.log("languagechange event detected!");
});
