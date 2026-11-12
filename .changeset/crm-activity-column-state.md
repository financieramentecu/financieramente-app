---
'financieramente-app': patch
---

### Corregido

- CRM: al renombrar, agregar o eliminar una columna, o al mover una tarea o un caso, aparece un aviso de que el estado se actualizó.
- CRM: el nombre de la columna es el estado que se ve en la tarjeta y, al abrir el lead en el pipeline, en la tarea o el caso.

### Técnico

- Column save, add and remove toast the new state name. Dragging a card toasts `Estado actualizado` with the target column.
- `listLeadTasks` and `listLeadSupportCases` return `stateLabel` from the visible activity column.
