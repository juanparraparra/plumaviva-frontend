/* Recorre todas las rutas con los 6 perfiles: la pantalla debe dibujarse (o mostrar "Sin permiso") y no puede haber errores de JS. */
const { chromium, login, go, runner, nuevaPagina } = require('./lib');
const RUTAS = ['#/inicio', '#/usuarios', '#/roles', '#/auditoria', '#/unidades', '#/unidades/1', '#/unidad-form/1', '#/unidad-form', '#/parametrizacion', '#/evaluaciones', '#/seguimiento',
  '#/evaluacion-nueva', '#/evaluacion/1/resultado', '#/evaluacion/1/plan', '#/evaluacion/1/cierre', '#/evaluacion/2/apertura', '#/evaluacion/2/muestreo', '#/evaluacion/2/MBR', '#/evaluacion/2/MBA', '#/evaluacion/2/MBG',
  '#/evaluacion/2/revision', '#/plan/T-2026-0007', '#/evaluacion/3/resultado'];
(async () => {
  const b = await chromium.launch(), R = runner(), todos = [];
  for (const rol of ['Administrador', 'Coordinador', 'Inspector', 'Productor', 'Responsable', 'Consultor']) {
    const { p, errs } = await nuevaPagina(b); await login(p, rol); const vistas = [];
    for (const h of RUTAS) {
      await R.paso(`${rol} · ${h}`, async () => {
        await go(p, h); await p.waitForTimeout(450);
        const url = p.url().split('#')[1], t = (await p.innerText('.content')).trim();
        if (t.length < 20) throw new Error('pantalla vacía');
        vistas.push((url.startsWith('/sin-permiso') ? '✗' : '✓') + h.slice(2));
      });
    }
    console.log(rol.padEnd(14), vistas.join(' ')); todos.push(...errs); await p.close();
  }
  R.fin(todos); await b.close();
})();
