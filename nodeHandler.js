// cheerioHandler.js
import { load } from 'cheerio';
import { DOMHandler } from './sharedDOM.js';
import fs from 'fs';

export class CheerioHandler extends DOMHandler {
  constructor(html) {
    const $ = load(html);
    super($);
    this.$ = $;
  }

  forEachDataTranslate(callback) {
    this.$('[data-translate]').each((i, el) => {
      const $el = this.$(el);
      callback($el, $el.attr('data-translate'));
    });
  }

  getAttr(selector, attr) {
    return this.$(selector).attr(attr);
  }

  setAttr(selector, attr, value) {
    this.$(selector).attr(attr, value);
  }

  setHTML(selector, html) {
    this.$(selector).html(html);
  }

  getHTML(selector) {
    return this.$(selector).html();
  }

  toString() {
    return this.$.html();
  }

  static loadJSON(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
}
