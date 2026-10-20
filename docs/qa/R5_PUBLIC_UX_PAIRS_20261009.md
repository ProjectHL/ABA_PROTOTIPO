# QA004 — pares públicos landing/login

2026-10-09T16:35:05.296Z. Inspección real view_image de8PNG (4pares), hashes/dimensiones y evidencia vinculada en JSON compañero. SinAuth/browser/cambio producto/canon. Carpeta currentV10 tiene nombre histórico: safes public-support-v10-*-v11-safe-20261009 acreditan buildV11 mZeZnMMBZ4vYp1uE31Kon; root indica fuentes públicas sin cambiosV12 y hashes actuales incluidos.

**Landing:** conserva brand/header, hero centrado con badge/textos/CTA, tres cards en fila/columna, banda oscura y footer. Copy técnica demo pasa aABA local, CTAlogin/soporte/consulta comercial/conocer más y docs locales; enlaces externos sin destino se presentan no configurados. Adaptación coherente con spec24 (tickets locales, noIA/no24/7) y accionesSOPORTE008–012/015–018.

**Login:** conserva tarjeta centrada400px, email/password/eye y submitazul. Español yAuth real; recuperación ahora acción visible debajo, OAuthdeshabilitado, retirado acceso rápido ficticio, términos/privacidad reales. Coherente con IDENTIDAD001/003/009–014. Formularios/submit/recovery legibles y dentro delviewport móvil390×844; providerlabels disabled se truncancosméticamente. No restaurar login simulado ni fingir proveedores.

## Hallazgos que requieren reserva

Desktoplanding cuatroCTA se ven casi transparentes, mientras móvil y fuente no muestran disabled/opacity; safes clicksPASS no prueban contraste. Root debe recapturar frameestable/estilos y confirmar si persiste antes aprobarvisibilidad. Mobilelanding PNGancho396 contra390; baseline402. Herofont60px generaoverflow/clipping ligero heredado: medir scrollWidth/rects ytriage, no declarar nuevo fallo funcional ni ausenciaoverflow. Providerlabels truncados son candidato cosmético, mantener nombre accesible yestado unavailable.

No se aprueban otrasrutas, todos404controles niQA004global. Comparación pública estructural/Auth documentada; cierre visual landing pendiente de reservas anteriores.

## Reserva CTA resuelta — frame estable V12

Inspeccionadas desktop/mobile-landing-stable.png y respectivosdiagnostic.json de ux-current-v12-public, build 0Ehm1gKf372lHuuQ0KjeM. LoscuatroCTA se ven legibles: primarioazul, soporteborde, consulta/conocermás textoazul. Ochomuestras porviewport opacity1, ancestros1, enabled, fondorgb34/139/230 ytexto blanco. Desktopviewport/scroll1440. **No persiste el desvanecimiento en el frameestable; reserva resuelta focalmente sin cambio de producto.** El frameanterior tenue permanecehistórico, sininventar causatécnica.

Mobile solicitado390 pero innerWidth/scroll396; hero x-6,015625,width402,046875,right396,03125. BaselinePNGwidth402. LoscuatroCTA/logo se observan completos dentrodelcontenido390 y prueba previa de navegaciónPASS; diagnóstico no incluye rectánguloindividual de cadaCTA, porloque ésa es inspecciónvisual, no certificación geométricatotal. Overflowligero texto/decoración sigueexistiendo; **cosmético diferido segúnalcanceusuario**, documentado, no bloqueauncontrolobservado. No decir queelviewport está libredeoverflow.

Parespúblicos landing/login completos enalcancefocal conadaptacionesAuth/locales ylímites cosméticos; no aprobaciónglobal QA004 niotrasrutas. HashesPNG/diagnósticos incorporadosalJSON.
