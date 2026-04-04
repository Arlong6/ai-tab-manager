//#region src/content/extractor.ts
(() => {
	let e = 15e3, t = document.body.cloneNode(!0);
	t.querySelectorAll("script, style, noscript, svg, canvas").forEach((e) => e.remove());
	let n = t.innerText || "";
	return n = n.replace(/\n{3,}/g, "\n\n").replace(/[ \t]+/g, " ").trim(), n.length > e && (n = n.slice(0, e) + "\n[Content truncated...]"), n;
})();
//#endregion
