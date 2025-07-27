// main-node.js
import fs from 'fs';
import { CheerioHandler } from './nodeHandler.js';
import { updateElements } from './translator.js';

const html = fs.readFileSync('./example.html', 'utf8');
const handler = new CheerioHandler(html);
const data = CheerioHandler.loadJSON('./testLang.json');

updateElements(handler, data);
console.log(handler.toString());
