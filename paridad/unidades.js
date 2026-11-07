const { chromium, URL, login, go, runner, nuevaPagina } = require('./lib');
(async () => {
  const b = await chromium.launch(), R = runner();
  const { p, errs } = await nuevaPagina(b); await login(p, 'Administrador');
  await R.paso('Lista: 3 unidades y búsqueda', async () => { await go(p, '#/unidades'); await p.waitForSelector('table tr td'); const n = await p.locator('tbody tr, table tr').count(); await p.fill('#pQ', 'Palmas'); await p.waitForTimeout(200); const f = await p.locator('table tr').count(); if (!(f < n)) throw new Error(`filtro ${f}/${n}`); await p.fill('#pQ', ''); });
  await R.paso('Ficha: 7 pestañas', async () => { await go(p, '#/unidades/1'); await p.waitForSelector('[role=tab]'); for (const t of ['Plan de mejora', 'Historial de evaluaciones', 'Datos', 'Ubicación', 'Especies', 'Galpones e inventario', 'Resumen']) { await p.click(`[role=tab]:has-text("${t}")`); await p.waitForTimeout(250); } });
  await R.paso('Ficha: Resumen muestra puntaje y atención', async () => { const t = await p.textContent('.content'); if (!/Resumen de la última evaluación/.test(t) || !/Puntos de atención/.test(t)) throw new Error('faltan bloques'); });
  await R.paso('Inhabilitar y rehabilitar unidad 3', async () => {
    await go(p, '#/unidades/3'); await p.click('button:has-text("Inhabilitar unidad")'); await p.waitForSelector('.modal');
    await p.click('.modal button:has-text("Inhabilitar unidad")'); await p.waitForTimeout(200); const e = await p.textContent('.modal'); if (!/al menos 10/.test(e)) throw new Error('no valida descripción');
    await p.fill('#mm-det', 'Suspensión sanitaria por visita ICA'); await p.click('.modal button:has-text("Inhabilitar unidad")'); await p.waitForSelector('.alert.err:has-text("Unidad inhabilitada")');
    await p.click('button:has-text("Rehabilitar unidad")'); await p.fill('#mm-det', 'Se levantó la suspensión sanitaria'); await p.click('.modal button:has-text("Rehabilitar unidad")'); await p.waitForSelector('button:has-text("Inhabilitar unidad")'); });
  await R.paso('Formulario: editar sin cambios', async () => { await go(p, '#/unidad-form/1'); await p.waitForSelector('#fU'); await p.click('#fU button[type=submit]'); await p.waitForSelector('.toast'); });
  await R.paso('Formulario: editar con cambio sensible exige motivo', async () => {
    await go(p, '#/unidad-form/1'); await p.waitForSelector('#fU'); await p.fill('#fCap', '31000'); await p.click('#fU button[type=submit]'); await p.waitForSelector('.modal');
    await p.click('.modal button:has-text("Guardar cambios")'); await p.waitForTimeout(200); if (!/al menos 10/.test(await p.textContent('.modal'))) throw new Error('no exige motivo');
    await p.fill('#cmMot', 'Ajuste de capacidad instalada'); await p.click('.modal button:has-text("Guardar cambios")'); await p.waitForSelector('.page-head h1:has-text("Granja")');
    await go(p, '#/unidades/1?t=datos'); await p.waitForSelector('table'); if (!/31\.?000/.test(await p.textContent('.content'))) throw new Error('capacidad no cambió'); });
  await R.paso('Formulario: nueva unidad con propietario nuevo + galpón', async () => {
    await go(p, '#/unidad-form'); await p.waitForSelector('#fU'); await p.fill('#fNom', 'Granja Prueba Angular'); await p.selectOption('#fProp', 'NEW');
    await p.fill('#pNom', 'Laura'); await p.fill('#pApe', 'Gómez'); await p.fill('#pDoc', '1012345678'); await p.fill('#pCor', 'laura.gomez@ejemplo.co'); await p.fill('#pTel', '3101234567');
    await p.fill('#fCap', '300'); await p.fill('#fVer', 'Vereda Nueva'); await p.locator('input[aria-label="Aves del galpón 1"]').fill('300'); await p.selectOption('#fRt', { index: 1 });
    await p.click('#fU button[type=submit]'); await p.waitForSelector('.page-head h1:has-text("Granja Prueba Angular")'); });
  await R.paso('Eliminar registro duplicado (sin historial)', async () => {
    await p.click('button:has-text("Eliminar registro duplicado")'); await p.waitForSelector('.modal'); await p.fill('#mm-det', 'Registro creado por prueba automática'); await p.click('.modal button:has-text("Eliminar duplicada")'); await p.waitForSelector('h1:has-text("Unidades productivas")'); });
  await R.paso('Validación: granja sin RT', async () => { await go(p, '#/unidad-form'); await p.waitForSelector('#fU'); await p.fill('#fNom', 'X'); await p.fill('#fCap', '500'); await p.fill('#fVer', 'v'); await p.locator('input[aria-label="Aves del galpón 1"]').fill('500'); await p.fill('#pDoc', '1010000009'); await p.fill('#pCor', 'x@x.co'); await p.fill('#pTel', '3000000000'); await p.click('#fU button[type=submit]'); await p.waitForSelector('.alert.err:has-text("responsable técnico")'); });
  await p.close();
  const prod = await nuevaPagina(b); await login(prod.p, 'Productor');
  await R.paso('Productor: lista, ficha y formulario solo con su propietario', async () => { await go(prod.p, '#/unidades'); await prod.p.waitForSelector('table tr td'); await go(prod.p, '#/unidad-form'); await prod.p.waitForSelector('#fProp'); const n = await prod.p.locator('#fProp option').count(); if (n !== 1) throw new Error('opciones propietario=' + n); });
  await prod.p.close(); const rt = await nuevaPagina(b); await login(rt.p, 'Responsable'); 
  await R.paso('RT: ficha sin botones de administración', async () => { await go(rt.p, '#/unidades'); await rt.p.waitForSelector('table tr td'); const hrefs = await rt.p.locator('table tr td a.ia').first().getAttribute('href'); await rt.p.locator('table tr td a.ia').first().click(); await rt.p.waitForSelector('[role=tab]'); if (await rt.p.locator('button:has-text("Inhabilitar")').count()) throw new Error('RT ve inhabilitar'); });
  R.fin([...errs, ...prod.errs, ...rt.errs]); await b.close();
})();
