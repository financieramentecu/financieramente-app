# Responsive y Correos - Checklist de Calidad de Requisitos

**Purpose**: Validar que los requisitos del feature 004-responsive-emails están completos, claros, consistentes y medibles.
**Created**: 2026-02-10
**Feature**: [spec.md](../spec.md)

**Note**: Este checklist valida la CALIDAD DE LOS REQUISITOS, no la implementación. Es un "unit test" del spec.

## Requirement Completeness

- [ ] CHK001 - ¿Están definidos requisitos de responsive para todos los flujos listados (Auth, Dashboard, Negocios, Pre-liquidación, Admin, Configuración)? [Completeness, Spec §Scope]
- [ ] CHK002 - ¿Están especificados los tres correos (nuevo usuario, activación, pre-liquidación) con requisitos individuales? [Completeness, Spec §Correos]
- [ ] CHK003 - ¿Se documentan los viewports de prueba con anchos exactos (375, 390, 428, 768, 1024px)? [Completeness, Spec §Responsive]
- [ ] CHK004 - ¿Están definidos requisitos de accesibilidad (touch targets, contraste, alt en imágenes) para responsive y correos? [Completeness, Gap]
- [ ] CHK005 - ¿Están definidos requisitos para escenarios sin imágenes (correos con imágenes bloqueadas)? [Coverage, Edge Case, Gap]

## Requirement Clarity

- [ ] CHK006 - ¿Está "touch target ≥44px" cuantificado explícitamente para evitar interpretaciones? [Clarity, Spec §REQ-R2, §REQ-R8]
- [ ] CHK007 - ¿Está "max-width 600px" del contenedor de correos especificado numéricamente? [Clarity, Spec §REQ-E3]
- [ ] CHK008 - ¿Está definido el breakpoint exacto para "móvil" vs "desktop" en correos (600px)? [Clarity, Spec §REQ-E5]
- [ ] CHK009 - ¿Se especifica la paleta de colores con valores hex (#00505C, #83D874) en lugar de términos vagos? [Clarity, Spec §REQ-E1]
- [ ] CHK010 - ¿Está "overflow horizontal controlado" definido con criterios medibles (overflow-x-auto, sin scroll en body)? [Clarity, Spec §REQ-R5]

## Requirement Consistency

- [ ] CHK011 - ¿Los requisitos de touch target (REQ-R2, REQ-R8) usan el mismo umbral (44px)? [Consistency]
- [ ] CHK012 - ¿Los requisitos de estructura de correos (header, content, footer) son consistentes entre los tres tipos? [Consistency, Spec §REQ-E2]
- [ ] CHK013 - ¿Los breakpoints usados en responsive (sm, md, lg) están alineados con la documentación de Tailwind del proyecto? [Consistency, Spec §Scope]

## Acceptance Criteria Quality

- [ ] CHK014 - ¿Puede verificarse objetivamente "sin scroll horizontal salvo en tablas"? [Measurability, Spec §Criterios]
- [ ] CHK015 - ¿Puede verificarse objetivamente que cada correo tiene versión plain text? [Measurability, Spec §REQ-E6]
- [ ] CHK016 - ¿Puede verificarse objetivamente que escapeHtml se aplica a contenido dinámico? [Measurability, Spec §REQ-E7]
- [ ] CHK017 - ¿Los criterios NFR-1 (tests Playwright) y NFR-2 (documentación) son verificables? [Measurability, Spec §NFR]

## Scenario Coverage

- [ ] CHK018 - ¿Están definidos requisitos para estado vacío/error en tablas responsive? [Coverage, Edge Case, Gap]
- [ ] CHK019 - ¿Están definidos requisitos para correos con contenido muy largo (muchas filas en pre-liquidación)? [Coverage, Edge Case, Gap]
- [ ] CHK020 - ¿Están definidos requisitos para clientes de correo con soporte limitado (Outlook)? [Coverage, Spec §REQ-E4]
- [ ] CHK021 - ¿Están definidos requisitos para modo oscuro en clientes de correo? [Coverage, Edge Case, Gap]

## Non-Functional Requirements

- [ ] CHK022 - ¿Se especifican requisitos de rendimiento para generación de HTML de correos? [NFR, Gap]
- [ ] CHK023 - ¿Se documenta la estrategia de pruebas en clientes reales (Gmail, Outlook, Apple Mail)? [NFR, Spec §NFR-2]
- [ ] CHK024 - ¿Se especifican requisitos de accesibilidad (WCAG) para la plataforma responsive? [NFR, Gap]

## Dependencies & Assumptions

- [ ] CHK025 - ¿Se documenta la dependencia de SendGrid para envío de correos? [Dependency, Gap]
- [ ] CHK026 - ¿Se valida la suposición de que la URL del logo es accesible desde clientes de correo? [Assumption, Gap]
- [ ] CHK027 - ¿Se documenta el uso de useIsMobile (768px) como fuente de verdad para responsive? [Dependency, Spec §Responsive]

## Ambiguities & Conflicts

- [ ] CHK028 - ¿Hay conflicto entre "flex-col en móvil" (REQ-R6) y definición de breakpoint móvil (sm vs md)? [Conflict, Spec §REQ-R6]
- [ ] CHK029 - ¿El término "layout cards" en REQ-E8 está definido con criterios específicos? [Ambiguity, Spec §REQ-E8]
- [ ] CHK030 - ¿Existe un esquema de trazabilidad entre requisitos y criterios de aceptación? [Traceability, Gap]

## Auditoría Responsive Completa (xs, sm, md, xl)

- [ ] CHK031 - ¿Están definidos requisitos de usabilidad específicos por breakpoint (xs, sm, md, xl)? [Completeness, Spec §Criterios UI/UX]
- [ ] CHK032 - ¿La matriz módulo × breakpoint cubre todos los módulos (Auth, Dashboard, Negocios, Pre-liquidación, Carga archivos, Admin, Categorías, Empresas, Orígenes, Productos, Config. producto, Access denied)? [Completeness, Spec §Matriz]
- [ ] CHK033 - ¿Está definido "thumb-reachable" para acciones en xs/sm con criterios medibles? [Clarity, Spec §Criterios xs]
- [ ] CHK034 - ¿Se especifica el comportamiento de transición entre breakpoints (sm como transición)? [Completeness, Spec §Criterios sm]
- [ ] CHK035 - ¿Los tests Playwright incluyen viewports 375, 640, 768 y 1280px? [Measurability, Spec §NFR-1]
- [ ] CHK036 - ¿Está documentado el estado de cumplimiento por módulo y breakpoint en la auditoría? [Traceability, Spec §NFR-4]

## Notes

- Marcar items como `[x]` al validar
- Referenciar secciones del spec cuando aplique
- Usar [Gap] cuando el requisito no está documentado
- Usar [Ambiguity] cuando el término es vago
- Usar [Conflict] cuando hay contradicción
