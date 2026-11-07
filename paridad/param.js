const { chromium } = require('playwright');
const PORT = process.env.PORT || 4312;
async function login(p, etiqueta) {
  await p.goto(`http://localhost:${PORT}/#/login`); await p.waitForSelector('.demo-users');
  await p.click(`.demo-users button:has-text("${etiqueta}")`); await p.click('button[type=submit]');
  await p.waitForSelector('[data-ci="0"]'); const code = (await p.textContent('.mailbox b:nth-of-type(2)')).trim();
  for (let k = 0; k < 6; k++) await p.fill(`[data-ci="${k}"]`, code[k]);
  await p.click('button[type=submit]'); await p.waitForSelector('.page-head h1');
}
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const rol of ['Administrador', 'Coordinador']) {
    const p = await b.newPage({ viewport: { width: 1360, height: 900 } }); p.on('pageerror', e => errs.push(e.message.slice(0, 200))); p.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 200)));
    await login(p, rol); await p.goto(`http://localhost:${PORT}/#/parametrizacion`); await p.waitForSelector('[role=tablist]');
    const r = { rol };
    r.lista = await p.locator('tbody tr, table tr').count();
    await p.click('[role=tab]:has-text("Ponderaciones")'); await p.waitForSelector('input.peso, .tabs');await p.waitForTimeout(200);
    r.guardarDeshab = await p.locator('button:has-text("Guardar pesos")').count() ? await p.locator('button:has-text("Guardar pesos")').isDisabled() : 'sin botón';
    if (rol === 'Administrador') {
      const ins = p.locator('input.peso'); await ins.nth(0).fill('40'); r.suma = await p.locator('b.err').count(); r.guardarInvalido = await p.locator('button:has-text("Guardar pesos")').isDisabled();
      await ins.nth(2).fill('30'); r.guardarValido = !(await p.locator('button:has-text("Guardar pesos")').isDisabled());
      await p.click('button:has-text("Guardar pesos")'); await p.waitForSelector('.toast'); r.toast = (await p.textContent('.toast')).slice(0, 60);
      await p.locator('input.peso').nth(0).fill('35'); await p.locator('input.peso').nth(2).fill('35'); await p.click('button:has-text("Guardar pesos")');
      await p.click('[role=tab]:has-text("Importancia")'); await p.selectOption('select[aria-label^="Importancia de"] >> nth=0', '1'); await p.waitForSelector('.toast');
      await p.selectOption('#oblDesde', '2'); await p.selectOption('#oblDesde', '3');
      await p.click('td .btn.sm:has-text("Acciones") >> nth=0'); await p.waitForSelector('.modal'); r.modal = (await p.textContent('.modal h2')).slice(0, 60); await p.click('.modal button:has-text("Cerrar")');
    } else { await p.click('[role=tab]:has-text("Importancia")'); r.selects = await p.locator('select[aria-label^="Importancia de"]').count(); }
    await p.click('[role=tab]:has-text("Clasificación")'); await p.waitForSelector('.lvl'); r.niveles = await p.locator('.lvl').allTextContents();
    await p.click('[role=tab]:has-text("Muestreo")'); await p.waitForSelector('.list-clean'); r.muestreo = await p.locator('.list-clean li').count();
    await p.screenshot({ path: `paridad/param_${rol}.png` }); console.log(JSON.stringify(r)); await p.close();
  }
  console.log('ERRORES:', errs.length ? [...new Set(errs)] : 'ninguno'); await b.close();
})();
