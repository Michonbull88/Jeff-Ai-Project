export type Playground = { html: string; css: string; javascript: string };
export const starter: Playground = {
  html: `<main>\n  <p class="eyebrow">MADE WITH JEFF</p>\n  <h1>Small ideas.<br>Great websites.</h1>\n  <p>Change the code and make this page your own.</p>\n  <section class="cards" aria-label="Services">\n    <article class="card"><h2>Design</h2><p>Start with the person using it.</p></article>\n    <article class="card"><h2>Build</h2><p>Make one complete task work.</p></article>\n    <article class="card"><h2>Improve</h2><p>Test, learn and refine.</p></article>\n  </section>\n  <button id="greet">Say hello</button>\n  <p id="message" role="status"></p>\n</main>`,
  css: `* { box-sizing: border-box; }\nbody { margin: 0; padding: 2rem; font-family: system-ui, sans-serif; color: #182b35; background: #f4f6fa; }\nmain { max-width: 900px; margin: auto; }\nh1 { font-size: clamp(2rem, 6vw, 3.5rem); line-height: 1.05; letter-spacing: -0.06em; }\np { line-height: 1.7; }\n.eyebrow { font-size: .7rem; letter-spacing: .2em; color: #5352a3; }\n.cards { display: flex; flex-wrap: wrap; gap: 1rem; margin: 2rem 0; }\n.card { flex: 1 1 12rem; padding: 1.4rem; border-radius: 12px; background: white; border: 1px solid #dedfec; }\n.card h2 { font-size: 1.1rem; }\nbutton { padding: .8rem 1rem; border: 0; border-radius: 6px; background: #424185; color: white; cursor: pointer; }\nbutton:focus-visible { outline: 3px solid #a04700; outline-offset: 4px; }\n@media (max-width: 480px) { .cards { flex-direction: column; } }`,
  javascript: `const button = document.querySelector('#greet');\nconst message = document.querySelector('#message');\nbutton?.addEventListener('click', () => {\n  if (message) message.textContent = 'Hello! You made this work.';\n});`,
};
// Opaque iframe origin and restrictive CSP isolate practice code from the app.
// User code still runs on the browser main thread; this is not a server sandbox.
export function previewDocument(code: Playground) {
  const css = code.css.replace(/<\/style/gi, "<\\/style");
  const javascript = code.javascript.replace(/<\/script/gi, "<\\/script");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; connect-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${code.html}<script>${javascript}</script></body></html>`;
}
export function downloadDocument(code: Playground) {
  return `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>My JEFF practice project</title>\n<style>\n${code.css.replace(/<\/style/gi, "<\\/style")}\n</style>\n</head>\n<body>\n${code.html}\n<script>\n${code.javascript.replace(/<\/script/gi, "<\\/script")}\n</script>\n</body>\n</html>`;
}
