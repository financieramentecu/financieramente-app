# Servicio de Email con SendGrid

## Configuración

### Variables de Entorno

Agregar a `.env.local`:

```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@financieramente.com
SENDGRID_FROM_NAME=Financieramente
SENDGRID_TEMPLATE_ID=d-7bddba2ac2ba49ff952c4c2c689d55b7
```

### Setup en SendGrid

1. **Crear API Key**: https://app.sendgrid.com/settings/api_keys
   - Permisos: "Full Access" o "Mail Send"
2. **Verificar Sender**: https://app.sendgrid.com/settings/sender_auth/senders/new
   - Email debe estar verificado antes de enviar

---

## 🧪 Pruebas y Validación

### 1. Verificar Configuración

**Endpoint de Verificación** (solo desarrollo):

```bash
curl http://localhost:3000/api/email/test-email
```

**Respuesta esperada**:
```json
{
  "configured": true,
  "apiKeyPresent": true,
  "fromEmailPresent": true,
  "fromEmail": "tu-email@ejemplo.com",
  "fromName": "Financieramente"
}
```

### 2. Enviar Email de Prueba (Endpoint)

**Email Tradicional**:
```bash
curl -X POST http://localhost:3000/api/email/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "tu-email@ejemplo.com",
    "type": "traditional"
  }'
```

**Email con Template**:
```bash
curl -X POST http://localhost:3000/api/email/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "tu-email@ejemplo.com",
    "type": "templated",
    "templateId": "d-xxxxxxxx"
  }'
```

### 3. Script de Prueba Interactivo

**Uso básico**:
```bash
npm run test:email tu-email@ejemplo.com
```

**Email con template**:
```bash
npm run test:email tu-email@ejemplo.com templated d-xxxxxxxx
```

### 4. Tests Automatizados

**Tests de Integración**:
```bash
npm run test:email:integration
```

**Tests Unitarios**:
```bash
npm run test:unit -- src/infrastructure/email
```

---

## 📝 Uso del API

### Endpoint: `POST /api/email/send`

#### Email con Template Dinámico

```json
{
	"type": "templated",
	"to": "usuario@example.com",
	"templateId": "d-7bddba2ac2ba49ff952c4c2c689d55b7",
	"dynamicTemplateData": {
		"nombre": "Juan Pérez",
		"mensaje": "Bienvenido"
	}
}
```

#### Email Tradicional

```json
{
	"type": "traditional",
	"to": "usuario@example.com",
	"subject": "Asunto",
	"text": "Texto plano",
	"html": "<p>HTML</p>"
}
```

### Respuestas

**Éxito**:
```json
{
	"success": true,
	"messageId": "xxxxx",
	"message": "Email enviado exitosamente"
}
```

**Error**:
```json
{
	"success": false,
	"error": "Descripción del error"
}
```

---

## 🔧 Troubleshooting

### Error: "Sender Identity not verified"

**Solución**:
1. Ir a: https://app.sendgrid.com/settings/sender_auth/senders
2. Verificar que tu email aparece en la lista
3. Si no está, agregar nuevo sender y verificar el email

### Error: "Unauthorized" o "403 Forbidden"

**Solución**:
1. Verificar que `SENDGRID_API_KEY` está correctamente configurada
2. Verificar que la API Key tiene permisos de "Mail Send"
3. Regenerar API Key si es necesario

### Error: "Template ID inválido"

**Solución**:
1. Verificar formato: debe ser `d-` seguido de 32 caracteres hexadecimales
2. Verificar que el template existe en SendGrid
3. Ejemplo válido: `d-7bddba2ac2ba49ff952c4c2c689d55b7`

### Error: "Variables de entorno faltantes"

**Solución**:
1. Crear archivo `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Agregar las variables requeridas
3. Reiniciar el servidor de desarrollo

---

## 📚 Arquitectura

- **Domain**: Value Objects (`EmailAddress`, `EmailSubject`, `EmailTemplate`) y Entidad `Email`
- **Application**: Casos de uso (`SendTemplatedEmailUseCase`, `SendEmailUseCase`)
- **Infrastructure**: `SendGridEmailService` implementa `IEmailRepository`
- **API**: Endpoint Next.js en `/api/email/send`

---

## 🚀 Recursos Adicionales

- **Documentación de SendGrid**: https://docs.sendgrid.com/
- **Dynamic Templates**: https://docs.sendgrid.com/ui/sending-email/how-to-send-an-email-with-dynamic-templates
- **API Reference**: https://docs.sendgrid.com/api-reference/mail-send/mail-send
