// This file is injected on-demand via chrome.scripting.executeScript
// It extracts the visible text content from the current page

(() => {
  const CHAR_LIMIT = 15000;

  // Remove script and style elements from consideration
  const clone = document.body.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('script, style, noscript, svg, canvas').forEach((el) => el.remove());

  let text = clone.innerText || '';

  // Clean up excessive whitespace
  text = text.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();

  // Truncate to limit
  if (text.length > CHAR_LIMIT) {
    text = text.slice(0, CHAR_LIMIT) + '\n[Content truncated...]';
  }

  return text;
})();
