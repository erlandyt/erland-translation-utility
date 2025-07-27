import { decode } from 'html-entities'
export function stripHtmlAndConvertBr(input) {
  return input
    .replace(/<br\s*\/?>/gi, '\n')  // Replace <br>, <br/>, <br /> with \n
    .replace(/<\/?[^>]+(>|$)/g, ''); // Remove all other HTML tags
}
const html = "<p>Hello<br>World</p><div>Line 2<br />Another line</div>";
const result = stripHtmlAndConvertBr(html);
console.log(result);
// Output:
// Hello
// WorldLine 2
// Another line
let text = decode(html, { level: 'html5' });
console.log(text);