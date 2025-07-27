// browserHandler.js
import { DOMHandler } from './sharedDOM.js';

export class BrowserHandler extends DOMHandler {
  constructor(root = document) {
    super(root);
  }

  getAttr(selector, attr) {
    return this.root.querySelector(selector)?.getAttribute(attr);
  }

  setAttr(selector, attr, value) {
    const el = this.root.querySelector(selector);
    if (el) el.setAttribute(attr, value);
  }

  setHTML(selector, html) {
    const el = this.root.querySelector(selector);
    if (el) el.innerHTML = html;
  }

  getHTML(selector) {
    return this.root.querySelector(selector)?.innerHTML || '';
  }

  static async loadJSON(url) {
    const res = await fetch(url);
    return await res.json();
  }
}
