const { chromium, URL, login, go, runner, nuevaPagina } = require('./lib');
(async () => {
  const b = await chromium.launch(), R = runner();
  const { p, errs } = await nuevaPagina(b); await login(p, 'Administrador');
  const txt = () => p.textContent('.content');

  await R.paso('Lista: abiertas, evaluadas, filtro por unidad en la URL', async () => {
    await go(p, '#/evaluaciones'); await p.waitForSelector('text=Evaluaciones abiertas');
    if (!/V-2026-0302/.test(await txt())) throw new Error('falta V-2026-0302');
    await p.selectOption('#ef-u', { label: 'Granja Las Palmas · Lebrija' }); await p.waitForTimeout(300);
    if (!/u=2/.test(p.url())) throw new Error('el filtro no viaja en la URL: ' + p.url());
    if (!/Resumen de la unidad · Granja Las Palmas/.test(await txt())) throw new Error('sin resumen de la unidad');
    await p.click('button:has-text("Limpiar")'); await p.waitForTimeout(300); });
  await R.paso('Lista: filtro por nivel y estado', async () => {
    await p.selectOption('#ef-n', 'ALTO'); await p.waitForTimeout(300); if (!/Granja Demostración/.test(await txt())) throw new Error('nivel ALTO');
    await p.click('button:has-text("Limpiar")'); await p.selectOption('#ef-e', 'ANULADA'); await p.waitForTimeout(300); await p.click('button:has-text("Limpiar")'); });
  await R.paso('Lista: historial de la unidad (modal)', async () => {
    await p.locator('button.ia[aria-label="Historial de evaluaciones"]').first().click(); await p.waitForSelector('.modal'); if (!/V-2026-030/.test(await p.textContent('.modal'))) throw new Error('sin códigos');
    await p.click('.modal button:has-text("Cerrar")'); await p.waitForTimeout(200); });
  await R.paso('Seguimiento: 5 columnas y resaltado por URL', async () => {
    await go(p, '#/seguimiento'); await p.waitForSelector('.kanban .kcol'); if ((await p.locator('.kcol').count()) !== 5) throw new Error('columnas');
    await go(p, '#/seguimiento?u=2'); await p.waitForSelector('.kcard.hl'); await p.fill('#sg-q', 'palmas'); await p.waitForTimeout(250);
    if ((await p.locator('.kcard').count()) !== 1) throw new Error('búsqueda'); });

  await R.paso('Evaluación en curso (V-2026-0302): fases, captura y avance', async () => {
    await go(p, '#/evaluaciones'); await p.waitForSelector('text=V-2026-0302'); await p.locator('a:has-text("Continuar")').first().click();
    await p.waitForSelector('.steps .step'); if ((await p.locator('.steps .step').count()) < 7) throw new Error('pasos');
    await p.locator('.steps .step', { hasText: 'Muestreo' }).first().click(); await p.waitForSelector('text=Selección del galpón');
    await p.locator('.steps .step', { hasText: 'Recursos' }).first().click(); await p.waitForSelector('.ind');
    const antes = await p.textContent('.statusbar');
    // todas las unidades en 2 del primer indicador de rejilla
    const btn = p.locator('.ind button:has-text("Todas en 2")').first(); if (await btn.count()) { await btn.click(); await p.waitForTimeout(300); }
    const filtros = await p.locator('.filtro-bar button').count(); if (filtros < 3) throw new Error('filtros');
    await p.locator('.ind-tools button:has-text("Ayuda")').first().click(); await p.waitForSelector('.modal'); await p.click('.modal button:has-text("Entendido")'); });
  await R.paso('Fase animal: puntos de muestreo (pp) editables', async () => {
    await p.locator('.steps .step', { hasText: 'Animal' }).first().click(); await p.waitForSelector('table.pp');
    const inp = p.locator('table.pp tr').nth(1).locator('input').nth(1); await inp.fill('10'); await inp.dispatchEvent('change'); await p.waitForTimeout(250);
    await p.locator('.ind button:has-text("Todas en 2")').first().click(); await p.waitForTimeout(250);
    if (!/100 %/.test(await p.locator('table.pp').first().textContent())) throw new Error('total pp'); });

  await R.paso('Programar evaluación nueva (Granja Las Palmas) → apertura → iniciar → demo → revisión → finalizar → validar', async () => {
    await go(p, '#/evaluacion-nueva?u=2'); await p.waitForSelector('#en-u');
    await p.click('button[type=submit]'); await p.waitForSelector('.steps .step');
    if (!/Fase I/.test(await txt())) throw new Error('no abrió apertura');
    await p.click('button:has-text("Iniciar evaluación en campo")'); await p.waitForTimeout(200); if (!/Registre quién atiende/.test(await txt())) throw new Error('no valida apertura');
    await p.fill('#ap-atiende', 'Mario López'); await p.check('input[type=checkbox]'); await p.click('button:has-text("Iniciar evaluación en campo")');
    await p.waitForSelector('text=Selección del galpón (Tabla 3)'); await p.click('button:has-text("Demo: completar valores")'); await p.waitForTimeout(400);
    await p.locator('.steps .step', { hasText: 'Revisión' }).click(); await p.waitForSelector('text=Revisión de completitud');
    await p.click('button:has-text("Finalizar evaluación y calcular resultado")'); await p.waitForSelector('.modal'); await p.click('.modal button:has-text("Finalizar")');
    await p.waitForSelector('text=Resultado total'); await p.click('button:has-text("Validar resultado")'); await p.waitForSelector('text=Validada por coordinación'); });
  await R.paso('Resultado: importancia, plan y comparación; plan y acta', async () => {
    const t = await txt(); for (const k of ['Resultado por grupo de medidas', 'Cumplimiento por importancia', 'Comparación con la calificación anterior', 'Diagnóstico por indicador']) if (!t.includes(k)) throw new Error('falta ' + k);
    await p.locator('.steps .step', { hasText: 'Plan de mejora' }).click(); await p.waitForSelector('text=Plan de mejora ·'); 
    await p.locator('.steps .step', { hasText: 'Acta' }).click(); await p.waitForSelector('text=Acta de evaluación de bienestar animal');
    if (!/Clasificación de indicadores por importancia/.test(await txt())) throw new Error('acta sin clasificación'); });
  await R.paso('Unidad con evaluación abierta: no deja crear otra', async () => {
    await go(p, '#/evaluacion-nueva?u=1'); await p.waitForSelector('#en-u'); if (!/ya tiene una evaluación abierta/.test(await txt())) throw new Error('sin aviso'); if (!(await p.locator('button[type=submit]').isDisabled())) throw new Error('crear habilitado'); });
  await R.paso('Plan histórico (T-2026-0007) y evaluación anulada', async () => {
    await go(p, '#/plan/T-2026-0007'); await p.waitForSelector('text=Plan de mejora ·'); if (!/T-2026-0007/.test(await txt())) throw new Error('plan hist'); });
  await R.paso('Anular evaluación abierta desde la lista', async () => {
    await go(p, '#/evaluaciones'); await p.waitForSelector('button:has-text("Anular")'); await p.locator('button:has-text("Anular")').first().click(); await p.waitForSelector('.modal');
    await p.fill('#mm-det', 'Prueba automática de anulación'); await p.click('.modal button:has-text("Anular")'); await p.waitForTimeout(300); });

  await R.paso('Traspatio: programar, iniciar y revisar (Cap. II)', async () => {
    await go(p, '#/evaluacion-nueva?u=3'); await p.waitForSelector('#en-u'); await p.click('button[type=submit]'); await p.waitForSelector('.steps .step');
    await p.fill('#ap-atiende', 'Doña Rosa'); await p.check('input[type=checkbox]'); await p.click('button:has-text("Iniciar evaluación en campo")');
    await p.waitForSelector('text=Grupos de aves y muestreo'); await p.click('button:has-text("Demo: completar valores")'); await p.waitForTimeout(300);
    await p.locator('.steps .step', { hasText: 'Animal' }).click(); await p.waitForSelector('.grp-block');
    await p.locator('.steps .step', { hasText: 'Revisión' }).click(); await p.waitForSelector('text=Revisión de completitud'); });
  await p.close();

  for (const [rol, rutas] of [['Coordinador', ['#/evaluaciones', '#/inicio']], ['Inspector', ['#/evaluaciones', '#/seguimiento']], ['Productor', ['#/evaluaciones', '#/inicio']], ['Responsable', ['#/evaluaciones', '#/inicio']], ['Consultor', ['#/inicio']]]) {
    const o = await nuevaPagina(b); await login(o.p, rol);
    await R.paso(rol + ': recorrido de evaluaciones sin errores', async () => { for (const h of rutas) { await go(o.p, h); await o.p.waitForSelector('.page-head h1'); }
      if (rol !== 'Consultor') { await go(o.p, '#/evaluacion/2/resultado'); await o.p.waitForTimeout(400); } });
    if (rol === 'Productor') await R.paso('Productor: asistente IA responde', async () => {
      await o.p.click('#chatFab'); await o.p.waitForSelector('#chatPanel:not(.hidden)'); await o.p.fill('#chatTxt', '¿Cómo voy?'); await o.p.click('#chatForm button, .chat-in button'); await o.p.waitForSelector('.chat-log .me'); await o.p.waitForSelector('.chat-log .bot .bub:has-text("Fuente"), .chat-log .bot .bub'); });
    if (rol === 'Productor') await R.paso('Productor: no ve fases de captura', async () => { await go(o.p, '#/evaluacion/1/apertura'); await o.p.waitForTimeout(400); if (await o.p.locator('.steps .step').count()) throw new Error('ve pasos'); });
    errs.push(...o.errs); await o.p.close();
  }
  R.fin(errs); await b.close();
})();
