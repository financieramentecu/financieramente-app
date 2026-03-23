# Data Model: Responsive y Correos

Este feature no modifica el modelo de datos de la base de datos. El "modelo" relevante es la estructura de las plantillas de correo.

## Email Template

### EmailTemplateOptions

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| title | string | Sí | Título del correo (ej: "Tu cuenta ha sido activada") |
| subtitle | string | No | Subtítulo (default: "Sistema Financieramente") |
| logoUrl | string | No | URL absoluta del logo |
| content | string | Sí | HTML del cuerpo del correo |
| showLogoImage | boolean | No | Mostrar imagen de logo (default: true) |

### Estructura HTML generada

```
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>...</style>
</head>
<body>
  <div class="container">
    <div class="header">[logo] [title] [subtitle]</div>
    <div class="content">[content]</div>
    <div class="footer">[copyright]</div>
  </div>
</body>
</html>
```

### Tokens de diseño

| Token | Valor | Uso |
|-------|-------|-----|
| primary | #00505C | Botones, bordes, enlaces |
| accent | #83D874 | Gradiente header |
| textPrimary | #1a1a1a | Texto principal |
| textSecondary | #333333 | Texto secundario |
| textMuted | #666666 | Footer |
| maxWidth | 600px | Contenedor |

## Responsive Breakpoints (no almacenados)

| Breakpoint | Rango | Uso en UI |
|------------|-------|-----------|
| xs | 0–639px | Mobile base |
| sm | 640–767px | Large phone |
| md | 768–1023px | Tablet |
| xl | 1280px+ | Desktop |
