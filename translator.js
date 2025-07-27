// updateElements.js
export async function updateElements(handler, jsonData) {
  handler.setAttr('#target', 'data-info', jsonData.info);
  handler.setHTML('#output', `<p>${jsonData.message}</p>`);
}
