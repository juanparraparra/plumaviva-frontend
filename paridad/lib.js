const { chromium } = require('playwright');
const PORT = process.env.PORT || 4312, URL = `http://localhost:${PORT}`;
async function login(p, etiqueta) {
  await p.goto(`${URL}/#/login`); await p.waitForSelector('.demo-users');
  await p.click(`.demo-users button:has-text("${etiqueta}")`); await p.click('button[type=submit]');
  await p.waitForSelector('[data-ci="0"]'); const code = (await p.textContent('.mailbox b:nth-of-type(2)')).trim();
  for (let k = 0; k < 6; k++) await p.fill(`[data-ci="${k}"]`, code[k]);
  await p.click('button[type=submit]'); await p.waitForSelector('.page-head h1');
}
const go = async (p, h) => { await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(250); };
function runner() {
  const ok = [], bad = [];
  return { ok, bad, paso: async (n, f) => { try { await f(); ok.push(n); } catch (e) { bad.push(n + ' → ' + e.message.split('\n')[0].slice(0, 160)); } },
    fin: (errs) => { console.log('OK:', ok.length); ok.forEach(x => console.log('  ✓', x)); console.log('FALLAN:', bad.length); bad.forEach(x => console.log('  ✗', x)); console.log('ERRORES JS:', errs.length ? [...new Set(errs)] : 'ninguno'); } };
}
async function nuevaPagina(b, ancho = 1360) {
  const p = await b.newPage({ viewport: { width: ancho, height: 900 } }), errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  p.on('console', m => m.type() === 'error' && !/ERR_TUNNEL|fonts/.test(m.text()) && errs.push(m.text().slice(0, 200)));
  return { p, errs };
}
module.exports = { chromium, URL, login, go, runner, nuevaPagina };
