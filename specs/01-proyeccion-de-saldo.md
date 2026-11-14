# SPEC 01 — Proyección de saldo a una fecha

> **Estado:** Implementado
> **Depende de:** —
> **Fecha:** 2026-11-14
> **Objetivo:** Una pantalla `/proyeccion` que estima cuánto dinero tendrás a fin de cada uno de los próximos 12 meses, o en una fecha que elijas, partiendo del balance total y aplicando los sueldos, créditos y cuotas futuros.

## Por qué existe esta spec

Hoy "Pagos fijos" solo dice cuánto sale cada mes y cuánto queda del sueldo **este mes**.
No responde "¿cuánto tendré en marzo?" ni "¿cuándo me libero de cuotas?".
La proyección reutiliza los `RecurringPlan` existentes; no agrega datos nuevos a la base de datos.

## Alcance

**Entra:**

- Ruta nueva `/proyeccion` con su pantalla.
- Punto de partida: el balance total actual (`TransactionsStore.balance`).
- Suma los sueldos futuros y resta los créditos y cuotas futuros de los planes no pausados.
- Lista de los próximos 12 meses (desde el mes actual) con el saldo estimado a fin de cada mes.
- En cada mes, aviso de los planes cuya última cuota cae ese mes ("Terminas: Notebook").
- Selector de fecha para consultar el saldo en un día concreto, hasta 36 meses adelante, con desglose.
- Interruptor "Incluir gasto habitual": resta el promedio del gasto variable de los últimos 3 meses completos.
- El interruptor se recuerda en `localStorage` (preferencia del dispositivo).
- Gráfica de barras del saldo estimado por mes; las barras negativas en otro color.
- Pestaña "Proyección" en la barra inferior, en lugar de "Metas".
- Botón "Ver proyección →" en el hero de Pagos fijos.
- Enlace "¿Cuánto tendré? →" en el hero de Inicio, bajo el balance total.

**Fuera de alcance (para futuras specs):**

- Gastos o ingresos futuros puntuales ingresados a mano ("en enero pago el permiso de circulación").
- Escenarios "qué pasa si" (simular un crédito nuevo, un aumento de sueldo).
- Restar los presupuestos mensuales como gasto esperado.
- Aportes a metas de ahorro dentro de la proyección.
- Intereses, reajustes por UF o inflación.
- Notificaciones o alertas de saldo negativo futuro.
- Rediseño de la pantalla de Metas (sigue existiendo en `/metas`, accesible desde Inicio).

## Modelo de datos

No hay tablas nuevas ni cambios en `models.ts`, IndexedDB ni el respaldo.
Se agregan tipos en memoria en `src/app/core/projection.ts`:

```ts
/** Un cargo o depósito futuro de un plan. */
export interface FutureCharge {
  planId: string;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  /** Positivo para sueldo, negativo para créditos y cuotas. */
  delta: number;
}

/** Fila de la lista mes a mes. */
export interface ProjectedMonth {
  month: string; // YYYY-MM
  income: number; // sueldos del mes
  fixedOut: number; // créditos + cuotas del mes (positivo)
  variableOut: number; // gasto habitual descontado ese mes (0 en el mes actual)
  endBalance: number; // saldo estimado al último día del mes
  finishing: RecurringPlan[]; // planes cuya última cuota cae este mes
}

/** Resultado de consultar una fecha. */
export interface ProjectionAt {
  date: string;
  start: number; // balance total hoy
  income: number;
  incomeCount: number;
  fixedOut: number;
  fixedCount: number;
  variableOut: number;
  variableMonths: number;
  total: number;
}
```

Preferencia nueva en `SettingsStore`:

```ts
readonly projectionVariable = signal<boolean>(/* lee 'cuentia.projection.variable', por defecto false */);
```

Reglas de cálculo:

- **Cargos futuros:** de cada plan no pausado, todos los meses posteriores a `lastGenerated` (o desde `startMonth` si es `null`), hasta `lastMonth(plan)` o hasta el horizonte.
  Así no se cuenta dos veces lo que ya está en el balance y no se pierde un cargo vencido que aún no se generó.
- **Gasto variable promedio:** suma de los gastos (`kind === 'expense'`) **sin** `planId` de los 3 meses completos anteriores al actual.
  Se divide por la cantidad de esos meses que tienen al menos un movimiento de cualquier tipo.
  Si ninguno tiene movimientos, el promedio es 0.
- **Gasto variable en el tiempo:** no se descuenta en el mes actual.
  Se descuenta el promedio completo por cada mes calendario posterior al actual, hasta el mes consultado inclusive.
- **Saldo a una fecha D:** `balance hoy + Σ delta de cargos con fecha ≤ D − promedio × meses posteriores al actual hasta el mes de D`.
- **Saldo a fin de mes:** igual que el anterior con D = último día del mes.
- Montos en CLP enteros; no hay redondeos intermedios.

## Plan de implementación

1. Crear `src/app/core/projection.ts` con `futureCharges(plans, horizonMonth)` y `variableAverage(txs, currentMonth)`.
   Crear `src/app/core/projection.spec.ts` con pruebas de ambas (plan pausado, plan terminado, `lastGenerated` nulo, meses sin historial).
2. Agregar a `projection.ts` las funciones `projectMonths(...)` (12 filas `ProjectedMonth`) y `projectAt(...)` (`ProjectionAt`).
   Pruebas en `projection.spec.ts`: saldo sin planes = balance, un sueldo + una cuota a 3 meses, cuota que termina a mitad del horizonte, gasto variable no descontado en el mes actual.
3. Agregar `projectionVariable` a `SettingsStore` con persistencia en `localStorage` bajo `cuentia.projection.variable`, envuelta en `try/catch` como el tema.
4. Crear `src/app/features/projection/projection.{ts,html,scss}` y registrar la ruta `/proyeccion` (título `Proyección · Cuentia`) en `app.routes.ts`.
   La pantalla muestra el encabezado, un hero con el balance de hoy y la lista de 12 meses (mes, saldo estimado, entradas, salidas, "Terminas: …").
5. Agregar el interruptor "Incluir gasto habitual" ligado a `SettingsStore.projectionVariable`.
   Muestra el promedio usado ("≈ $350.000 al mes") o "Aún no hay historial suficiente" si es 0.
6. Agregar el selector de fecha (`<input type="date">`, mínimo hoy, máximo hoy + 36 meses) y la tarjeta de desglose de `projectAt`.
   Por defecto muestra el último día del mes siguiente.
7. Crear `src/app/shared/charts/balance-bars.ts`: barras de una serie para los 12 meses, con línea base en 0 y barras negativas en color de alerta.
   Insertarla en la pantalla sobre la lista.
8. Agregar el ícono `trend` a `src/app/shared/icon.ts` y reemplazar la pestaña Metas por `{ path: '/proyeccion', label: 'Proyección', icon: 'trend' }` en `src/app/layout/tab-bar.ts`.
9. Agregar el botón "Ver proyección →" en el hero de `features/plans/plans.html` y el enlace "¿Cuánto tendré? →" en el hero de `features/home/home.html`.
10. Estado vacío: si no hay planes activos y el gasto habitual está apagado, la pantalla muestra el balance plano y un enlace "Agrega tu sueldo y tus cuotas en Pagos fijos" a `/pagos`.

## Criterios de aceptación

- [ ] `npm test` pasa, incluidas las pruebas nuevas de `projection.spec.ts`.
- [ ] `npm run build` termina sin errores.
- [ ] Abrir `/proyeccion` muestra 12 meses empezando por el mes actual.
- [ ] Sin planes y con el interruptor apagado, los 12 meses muestran el mismo saldo que el balance total de Inicio.
- [ ] Con un sueldo de $1.000.000 (día 30) y una cuota de $100.000 (día 28), ambos con fecha posterior a hoy, el fin del mes actual muestra balance + $900.000.
- [ ] Una compra con 3 cuotas restantes deja de restar a partir del cuarto mes, y el mes de su última cuota muestra "Terminas: <nombre>".
- [ ] Un plan pausado no afecta ninguna cifra de la proyección.
- [ ] Un cargo ya generado como movimiento no se resta una segunda vez.
- [ ] Con el interruptor encendido, el mes actual no cambia y cada mes siguiente baja exactamente el promedio mostrado.
- [ ] Recargar la app conserva el estado del interruptor.
- [ ] El selector de fecha no permite fechas anteriores a hoy ni posteriores a 36 meses.
- [ ] El desglose de la fecha cumple: inicio + entradas − salidas fijas − gasto habitual = total.
- [ ] Los meses con saldo negativo se ven en la gráfica bajo la línea base y en color de alerta.
- [ ] La barra inferior muestra Inicio, Historial, +, Presupuesto, Proyección; el + sigue centrado.
- [ ] `/metas` sigue abriendo desde los enlaces de Inicio.
- [ ] El botón de Pagos fijos y el enlace de Inicio llevan a `/proyeccion`.
- [ ] La pantalla no tiene scroll horizontal a 375 px de ancho, en modo claro y oscuro.

## Decisiones

- **Sí:** partir del balance total. Responde "cuánta plata tendré", no solo cuánto sobra.
- **No:** partir de cero o de un monto ingresado a mano. Lo primero ignora lo que ya tienes; lo segundo duplica un dato que la app ya conoce.
- **Sí:** gasto variable opcional con promedio de 3 meses. Sin él la proyección es demasiado optimista; con interruptor el usuario ve ambas versiones.
- **No:** usar los presupuestos como gasto esperado. Un presupuesto es un tope, no una predicción.
- **Sí:** no descontar gasto variable en el mes actual. Lo gastado este mes ya está en el balance y evita estimar lo que falta.
- **No:** prorrateo por días restantes ni "promedio menos lo gastado". Más complejo de explicar en pantalla.
- **Sí:** dividir el promedio solo por meses con movimientos. Un usuario nuevo no ve un promedio artificialmente bajo.
- **Sí:** contar todo cargo posterior a `lastGenerated`, aunque su fecha ya pasó. Cubre el caso en que `sync()` aún no corrió sin contar doble.
- **Sí:** horizonte de 36 meses en el selector. Cubre créditos de consumo y compras en cuotas sin cálculos absurdos.
- **No:** horizonte ilimitado. Hipotecarios quedan fuera; si se necesitan, se amplía en otra spec.
- **Sí:** pantalla propia `/proyeccion`. Lista, gráfica y selector no caben bien dentro de Pagos fijos.
- **Sí:** reemplazar la pestaña Metas. Mantiene la barra 2 + botón + 2 simétrica; Metas sigue en Inicio.
- **No:** una quinta pestaña. Descentra el + y aprieta las etiquetas en iPhone.
- **Sí:** cálculo en funciones puras (`core/projection.ts`). Se prueban sin Angular ni IndexedDB.
- **No:** un store nuevo. La pantalla compone `TransactionsStore`, `PlansStore` y `SettingsStore` con `computed`.
- **Sí:** interruptor en `localStorage` vía `SettingsStore`. Es una preferencia del dispositivo, como el tema, y no va en el respaldo.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El balance total incluye movimientos antiguos o incompletos y la proyección hereda el error. | La pantalla muestra el balance de partida explícito en el hero y en el desglose. |
| `lastGenerated` desfasado si `sync()` falló. | Se cuentan todos los cargos posteriores a `lastGenerated`, no solo los de fecha futura. |
| Días de pago 29–31 en meses cortos. | Se reutiliza `dateInMonth`, que ya usa el último día del mes. |
| Un mes atípico (vacaciones) infla el promedio variable. | El monto del promedio se muestra junto al interruptor; el usuario puede apagarlo. |
| Quitar Metas de la barra reduce su descubrimiento. | Inicio ya tiene la sección "Metas de ahorro" con "Ver todas →". |

## Lo que **no** está en esta spec

- Movimientos futuros puntuales ingresados a mano.
- Escenarios "qué pasa si".
- Presupuestos como gasto esperado.
- Metas de ahorro dentro de la proyección.
- Intereses, UF o inflación.
- Alertas de saldo negativo.

Cada uno de esos, si llega, va en su propia spec.
