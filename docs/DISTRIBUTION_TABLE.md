#Tabla de distribución por nivel

Cada línea de esta tabla se persiste como porcentaje del receptor (`porcentaje_distribucion`, en fracción: 60% = 0.6). No hay una fila aparte para totales.

## Qué no se persiste

**Override 17%** no es una regla guardada. Es la suma de las cinco líneas de override de NIVEL_0 (MS Junior): 0,85 + 1,70 + 2,55 + 3,40 + 8,50 = 17. Esas cinco líneas sí se guardan.

El **77% al pie de cada columna** de la ruta de liderazgo tampoco se guarda. Es la suma de las líneas persistidas de esa columna.

## Qué sí se persiste, incluidos los resaltados

Los porcentajes resaltados son la parte del propio nivel y se guardan como una línea normal, no como un acumulado calculado al leer:

- 60,00% → NIVEL_0 recibe NIVEL_0 (MS Junior)
- 60,85% → NIVEL_1 recibe NIVEL_1 (MS Senior)
- 62,55% → NIVEL_2 recibe NIVEL_2 (Team Leader)
- 65,10% → NIVEL_3 recibe NIVEL_3 (Performance Leader)
- 68,50% → NIVEL_4 recibe NIVEL_4 (Business Leader)
- 77,00% → NIVEL_5 recibe NIVEL_5 (Partner)

## NIVEL_0

- NIVEL_5->0.85 %
- NIVEL_4->1.70 %
- NIVEL_3->2.55 %
- NIVEL_2->3.40 %
- NIVEL_1->8.50 %
- NIVEL_0->60.00 %

## NIVEL_1

- NIVEL_5->1.70 %
- NIVEL_4->2.55 %
- NIVEL_3->3.40 %
- NIVEL_2->8.50 %
- NIVEL_1->60.85 %

## NIVEL_2

- NIVEL_5->2.55 %
- NIVEL_4->3.40 %
- NIVEL_3->8.50 %
- NIVEL_2->62.55 %

## NIVEL_3

- NIVEL_5->3.40 %
- NIVEL_4->8.50 %
- NIVEL_3->65.10 %

## NIVEL_4

- NIVEL_5->8.50 %
- NIVEL_4->68.50 %

## NIVEL_5

- NIVEL_5->77.00 %
