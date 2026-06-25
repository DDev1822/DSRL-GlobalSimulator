# Lista de verificación — Etapa 2

Ejecutar después de `npm run verify:stage2` y `npm run dev`.

## Drawer

- [ ] El botón `CONTROL DECK` abre el drawer.
- [ ] El drawer cerrado no cubre el pit ni la curva.
- [ ] El botón de flecha cierra el drawer.
- [ ] El drawer mantiene contraste y legibilidad en pantalla completa.
- [ ] En resoluciones menores, el drawer permite desplazamiento interno.

## Parámetros

- [ ] Precio del metal modifica VAN y cut-off de equilibrio.
- [ ] Recurso máximo modifica tonelaje y escala de la curva.
- [ ] WACC modifica VAN.
- [ ] Producción modifica vida de mina.
- [ ] Strip ratio modifica OPEX y cut-off.
- [ ] Costo de mina modifica OPEX y VAN.
- [ ] Costo de planta modifica OPEX y VAN.
- [ ] Ley base modifica la curva de ley y el rango evaluado.
- [ ] Los sliders y las entradas numéricas permanecen sincronizados.
- [ ] La ley de corte no aparece como entrada editable.

## Integración

- [ ] La curva conserva línea y puntos móviles.
- [ ] Las escalas de tonelaje, ley y cut-off cambian con el escenario.
- [ ] Los KPI laterales se actualizan sin recargar la página.
- [ ] Las capas económicas del pit reciben los valores actualizados.
- [ ] Zoom, órbita, wireframe y F1–F6 continúan funcionando.

## Persistencia

- [ ] `SAVE SCENARIO` guarda los valores actuales.
- [ ] Después de recargar, el escenario guardado reaparece.
- [ ] `RESET DEFAULT` restaura los valores base.
- [ ] Después de restablecer y recargar, no reaparece el escenario anterior.

## Cierre

- [ ] `npm run verify:stage2` finaliza sin errores.
- [ ] No hay errores rojos en la consola del navegador.
- [ ] La validación visual fue aprobada antes de iniciar la Etapa 3.
