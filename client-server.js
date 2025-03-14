import fs from 'fs';
import translationConfig from './translate.js';

let clientScript = "console.error('Translation Failure')";

function generateClientScript() {
  let file = fs.readFileSync(__dirname + "/client.js").toString();
  file = file.replaceAll("[[[\"settings\"]]]", JSON.stringify(translationConfig()));
  clientScript = file;
  return 'client-server';
}

export function updateClientScript() {
  generateClientScript();
  return true;
}

// Note: The user of this library must serve the language.json files themself as this is not done automatically.
// Note: This should be placed after important middleware, consider placing this last.
export function clientServer() {
  let pattern = /^\/client.js(\?*|)$/
  return (req, res, next) => {
    if (pattern.test(req.url)) {
      res.set('Content-Type', "application/javascript");
      res.send(clientScript)
    } else {
      next()
    };
  };
}
generateClientScript();