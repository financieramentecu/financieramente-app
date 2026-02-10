# Checklist: Calidad de requisitos — Email resumen pre-liquidación

**Purpose**: Validar que los requisitos del spec 003 (email con resumen de pre-liquidación por usuario) estén completos, claros, consistentes y medibles antes de implementación o revisión.
**Created**: 2026-02-05
**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md) | [contract](../contracts/resumen-preliquidacion-email.md)

**Note**: Este checklist fue generado por el comando `/speckit.checklist` para validar la calidad de los requisitos, no el comportamiento del código.

---

## Completitud de requisitos

- [ ] CHK001 - ¿Está definido de forma explícita que el envío de correos solo se orquesta cuando `procesarPreLiquidacion` finaliza correctamente (y no en fallo o cancelación)? [Completeness, Spec §Requisitos funcionales 1]
- [ ] CHK002 - ¿Están documentados todos los campos obligatorios y opcionales del payload de envío por usuario (to, nombreUsuario, archivoNombre, periodo, filas)? [Completeness, Contract]
- [ ] CHK003 - ¿Está especificado si el "valor de comisión" por negocio debe ser bruta, final o según criterio de negocio en todos los casos? [Completeness, Spec §Req 4]
- [ ] CHK004 - ¿Están definidos los requisitos de formato del periodo (ej. rango de fechas vs mes único) para el correo y el asunto? [Completeness, Contract §Asunto sugerido / periodo]
- [ ] CHK005 - ¿Está documentada la dependencia explícita con `sendEmail` o `sendTemplatedEmail` del feature email? [Completeness, Spec §Req 5, Plan]

## Claridad de requisitos

- [ ] CHK006 - ¿Está definido de forma no ambigua qué se considera "misma ejecución" / "mismo flujo" para agrupar por usuario? [Clarity, Spec §Resumen]
- [ ] CHK007 - ¿Está claro si "una fila por negocio" significa una fila por negocio con totales agregados o una fila por línea de comisión? [Clarity, Spec §Req 4]
- [ ] CHK008 - ¿Está cuantificado o acotado "no bloquear la respuesta" (ej. envío asíncrono antes de devolver HTTP)? [Clarity, Spec §Requisitos no funcionales]
- [ ] CHK009 - ¿El término "valor de comisión (bruta/final según criterio de negocio)" tiene criterio definido por tipo de negocio o producto? [Clarity, Spec §Req 4]

## Consistencia de requisitos

- [ ] CHK010 - ¿Los requisitos de "un correo por usuario" y "fire-and-forget" son consistentes entre spec, plan y contrato? [Consistency, Spec §Req 3, Plan, Contract]
- [ ] CHK011 - ¿El uso de "agente", "usuario" e "idUser" es consistente en spec y contrato? [Consistency]
- [ ] CHK012 - ¿Está alineado el spec ("tabla (o lista)") con el contrato ("tabla con columnas: Negocio, Valor comisión, Categoría")? [Consistency, Spec §Req 4, Contract §Cuerpo]

## Calidad de criterios de aceptación

- [ ] CHK013 - ¿Puede verificarse de forma objetiva "cada usuario con al menos una distribución recibe exactamente un correo"? [Measurability, Spec §Criterios de aceptación]
- [ ] CHK014 - ¿Los criterios de aceptación del contenido del correo (archivo/periodo + filas por negocio) son comprobables sin ambigüedad? [Measurability, Spec §Criterios de aceptación]
- [ ] CHK015 - ¿Está definido un criterio verificable para "el envío no bloquea la respuesta HTTP"? [Measurability, Spec §CA]

## Cobertura de escenarios

- [ ] CHK016 - ¿Están especificados los requisitos cuando no hay usuarios con distribuciones en la ejecución (zero usuarios)? [Coverage, Gap]
- [ ] CHK017 - ¿Están definidos los requisitos o exclusiones cuando la pre-liquidación procesa cero registros (archivo sin registros en rango)? [Coverage, Spec §Req 1]
- [ ] CHK018 - ¿Está documentado el flujo o requisito cuando un usuario tiene distribuciones pero no tiene email en el sistema? [Coverage, Gap]
- [ ] CHK019 - ¿Se especifica el comportamiento esperado cuando falla el envío (SendGrid error, timeout) para uno o varios destinatarios? [Coverage, Exception flow, Gap]
- [ ] CHK020 - ¿Está definida la condición de "pre-liquidación exitosa" de forma operativa (ej. todos los registros del rango procesados)? [Coverage, Spec §Req 1]

## Cobertura de casos límite

- [ ] CHK021 - ¿Hay requisitos o exclusiones para ejecuciones concurrentes de pre-liquidación (mismo archivo/rango)? [Edge case, Gap]
- [ ] CHK022 - ¿Está especificado qué ocurre si la consulta de resumen por usuario devuelve lista vacía tras una ejecución exitosa? [Edge case, Gap]
- [ ] CHK023 - ¿Están acotados requisitos de volumen (ej. decenas/cientos de usuarios por ejecución) para coherencia con "asíncrono aceptable"? [Edge case, Plan §Scale/Scope]

## Requisitos no funcionales

- [ ] CHK024 - ¿El requisito de no bloquear la API está redactado de forma medible (asíncrono, fire-and-forget o equivalente)? [NFR, Spec §Requisitos no funcionales]
- [ ] CHK025 - ¿Está documentado el requisito de no exponer datos sensibles en logs (o equivalente)? [NFR, Plan §Constraints]
- [ ] CHK026 - ¿El objetivo de rendimiento "respuesta API < 3s" está referenciado o trazable desde requisitos funcionales? [NFR, Plan §Performance Goals]
- [ ] CHK027 - ¿Están especificados requisitos de reutilización de tipos/servicios existentes de forma comprobable? [NFR, Spec §Requisitos no funcionales]

## Dependencias y suposiciones

- [ ] CHK028 - ¿Están documentadas las dependencias entre pre-liquidación (orquestación + datos) y email (notificación)? [Dependency, Contract §Dependencias]
- [ ] CHK029 - ¿Está explícita o acotada la suposición de que los usuarios (agentes) tienen email válido en BD? [Assumption, Gap]
- [ ] CHK030 - ¿Está documentada la dependencia de SendGrid (o proveedor) como requisito de entorno/despliegue? [Dependency, Plan §Technical Context]

## Ambigüedades y conflictos

- [ ] CHK031 - ¿Existe ambigüedad entre "valor de comisión bruta/final según criterio de negocio" y el contrato (valorComision en filas)? [Ambiguity, Spec §Req 4, Contract]
- [ ] CHK032 - ¿Hay conflicto entre "opcional integración con el servicio de email (mock)" en tests y el requisito de usar el feature email en producción? [Consistency, Spec §NFR vs §Req 5]
- [ ] CHK033 - ¿Está resuelto si el "pie con nombre de la aplicación" del contrato es requisito funcional o solo sugerencia? [Clarity, Contract §Cuerpo]

---

## Notes

- Marcar ítems como completados con `[x]`.
- Añadir comentarios o hallazgos inline cuando se revise.
- Enlazar a secciones del spec/plan/contrato cuando sea útil.
- Los ítems validan la calidad y completitud de los requisitos escritos, no la implementación.
