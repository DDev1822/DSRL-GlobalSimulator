# Lista de verificación visual — Etapa 0

Marcar cada elemento después de ejecutar `npm run verify:baseline` y `npm run dev`.

## Carga inicial

- [ ] El dashboard abre sin pantalla negra.
- [ ] La geometría Datamine carga sin quedar en estado infinito.
- [ ] Se muestran 7,995 puntos y 15,683 triángulos.
- [ ] No aparece ningún botón o panel de modelo conceptual.

## Curva económica

- [ ] La curva Ton–Grade–VAN se renderiza completa.
- [ ] Al mover el mouse aparece la línea vertical móvil.
- [ ] Se mueven los marcadores de tonelaje, ley y VAN.
- [ ] La lectura lateral cambia con cut-off, tonelaje, ley, VAN, TIR y LOM.
- [ ] Al retirar el mouse, la lectura vuelve al punto óptimo.
- [ ] Los sliders laterales recalculan la curva sin errores.

## Visor Datamine

- [ ] El pit se ve completo y no está cubierto por tooltips.
- [ ] Zoom con rueda funciona.
- [ ] Órbita con arrastre funciona.
- [ ] Pan con botón derecho funciona.
- [ ] Wireframe activa y desactiva correctamente.
- [ ] La lectura del cursor aparece en el panel lateral.

## Evolución F1–F6

- [ ] Los botones F1 a F6 cambian el avance visual.
- [ ] La barra de evolución cambia el avance visual.
- [ ] Play reproduce F1–F6.
- [ ] Pausa detiene la reproducción.
- [ ] Reinicio vuelve a F1.
- [ ] Anterior y siguiente funcionan.
- [ ] El selector de velocidad modifica la reproducción.

## Capas

- [ ] Componente.
- [ ] Fase visual.
- [ ] Elevación.
- [ ] VAN acumulado.
- [ ] VAN incremental.
- [ ] Reservas.
- [ ] Ley media.
- [ ] Strip ratio.

## Layout y estabilidad

- [ ] Curva arriba y pit abajo son los protagonistas.
- [ ] Rails izquierdo y derecho permanecen legibles.
- [ ] No existen cuadros negros ni superposiciones.
- [ ] Pantalla completa funciona.
- [ ] Salir de pantalla completa devuelve el layout correctamente.
- [ ] No aparecen errores rojos en la consola del navegador.

## Cierre

- [ ] `npm run validate:data` pasa.
- [ ] `npm run audit:baseline` pasa.
- [ ] `npm run typecheck` pasa.
- [ ] `npm run build` pasa.
- [ ] Las seis capturas de evidencia fueron generadas.
- [ ] La revisión visual fue aprobada antes de iniciar la Etapa 1.
