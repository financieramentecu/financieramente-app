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

## Uso

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

## Arquitectura

- **Domain**: Value Objects (`EmailAddress`, `EmailSubject`, `EmailTemplate`) y Entidad `Email`
- **Application**: Casos de uso (`SendTemplatedEmailUseCase`, `SendEmailUseCase`)
- **Infrastructure**: `SendGridEmailService` implementa `IEmailRepository`
- **API**: Endpoint Next.js en `/api/email/send`

## Respuestas

### Éxito

```json
{
	"success": true,
	"messageId": "xxxxx",
	"message": "Email enviado exitosamente"
}
```

### Error

```json
{
	"success": false,
	"error": "Descripción del error"
}
```

## Troubleshooting

- **"Sender Identity not verified"**: Verificar email en SendGrid
- **"Unauthorized"**: Verificar API Key y permisos
- **"Template ID inválido"**: Verificar que el template exista en SendGrid
