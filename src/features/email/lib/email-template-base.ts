/**
 * Sistema de diseño unificado para correos de notificación.
 * Paleta: #00505C (primary), #83D874 (accent), #1a1a1a, #333333, #666666.
 */

export const EMAIL_DESIGN_TOKENS = {
	primary: '#00505C',
	primaryHover: '#003d47',
	accent: '#83D874',
	textPrimary: '#1a1a1a',
	textSecondary: '#333333',
	textMuted: '#666666',
	bgBody: '#f5f5f5',
	bgCard: '#ffffff',
	bgMuted: '#f8f9fa',
	borderMuted: '#e9ecef',
	maxWidth: '600px',
} as const

export const EMAIL_BASE_STYLES = `
	* { -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; }
	html, body { margin: 0 !important; padding: 0 !important; height: 100% !important; width: 100% !important; }
	table, td { mso-table-lspace: 0pt !important; mso-table-rspace: 0pt !important; }
	table { border-spacing: 0 !important; border-collapse: collapse !important; table-layout: fixed !important; margin: 0 auto !important; }
	img { -ms-interpolation-mode:bicubic; }
	a { text-decoration: none; }
	
	body {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
		line-height: 1.6;
		color: ${EMAIL_DESIGN_TOKENS.textPrimary};
		max-width: ${EMAIL_DESIGN_TOKENS.maxWidth};
		margin: 0 auto;
		padding: 20px;
		background-color: ${EMAIL_DESIGN_TOKENS.bgBody};
	}
	.container {
		background: ${EMAIL_DESIGN_TOKENS.bgCard};
		border-radius: 12px;
		overflow: hidden;
		box-shadow: 0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06);
	}
	.header {
		background: ${EMAIL_DESIGN_TOKENS.primary};
		color: #ffffff;
		padding: 40px 30px;
		text-align: center;
	}
	.logo-container { margin-bottom: 20px; }
	.logo {
		max-width: 180px;
		height: auto;
		display: block;
		margin: 0 auto;
	}
	.header h1 {
		margin: 0;
		font-size: 26px;
		font-weight: 700;
		color: #ffffff;
		text-shadow: 0 2px 4px rgba(0,0,0,0.2);
	}
	.header p {
		margin: 8px 0 0 0;
		font-size: 14px;
		color: #ffffff;
		opacity: 0.95;
	}
	.content {
		padding: 35px 30px;
		background: ${EMAIL_DESIGN_TOKENS.bgCard};
	}
	.greeting {
		font-size: 18px;
		font-weight: 600;
		color: ${EMAIL_DESIGN_TOKENS.textPrimary};
		margin-bottom: 16px;
	}
	.message {
		font-size: 16px;
		color: ${EMAIL_DESIGN_TOKENS.textSecondary};
		margin-bottom: 24px;
		line-height: 1.7;
	}
	.info-box {
		background: ${EMAIL_DESIGN_TOKENS.bgMuted};
		padding: 24px;
		border-left: 5px solid ${EMAIL_DESIGN_TOKENS.primary};
		margin: 24px 0;
		border-radius: 6px;
		box-shadow: 0 1px 3px rgba(0,0,0,0.05);
	}
	.info-box h3 {
		margin: 0 0 16px 0;
		font-size: 18px;
		font-weight: 600;
		color: ${EMAIL_DESIGN_TOKENS.primary};
	}
	.info-box p { margin: 10px 0; font-size: 15px; color: ${EMAIL_DESIGN_TOKENS.textPrimary}; line-height: 1.6; }
	.info-box strong { color: ${EMAIL_DESIGN_TOKENS.textSecondary}; font-weight: 600; }
	.info-box a {
		color: ${EMAIL_DESIGN_TOKENS.primary};
		text-decoration: none;
		font-weight: 500;
	}
	.cta-container { text-align: center; margin: 32px 0; }
	.cta-button {
		display: inline-block;
		background: ${EMAIL_DESIGN_TOKENS.primary};
		color: #ffffff !important;
		padding: 16px 32px;
		text-decoration: none !important;
		border-radius: 8px;
		font-weight: 700;
		font-size: 16px;
		box-shadow: 0 4px 6px rgba(0,80,92,0.3);
		letter-spacing: 0.3px;
	}
	.cta-button:hover { background: ${EMAIL_DESIGN_TOKENS.primaryHover}; }
	.link-alternative {
		color: ${EMAIL_DESIGN_TOKENS.textMuted};
		font-size: 14px;
		margin-top: 24px;
		line-height: 1.6;
	}
	.link-alternative a {
		color: ${EMAIL_DESIGN_TOKENS.primary};
		word-break: break-all;
		text-decoration: none;
		font-weight: 500;
	}
	.footer {
		text-align: center;
		color: ${EMAIL_DESIGN_TOKENS.textMuted};
		font-size: 13px;
		padding: 24px 20px;
		background: ${EMAIL_DESIGN_TOKENS.bgMuted};
		border-top: 1px solid ${EMAIL_DESIGN_TOKENS.borderMuted};
	}
	.footer p { margin: 6px 0; color: ${EMAIL_DESIGN_TOKENS.textMuted}; }
	@media only screen and (max-width: 600px) {
		body { padding: 10px; }
		.container { border-radius: 0; }
		.content { padding: 25px 20px; }
		.header { padding: 30px 20px; }
		.header h1 { font-size: 22px; }
		.cta-button { padding: 14px 28px; font-size: 15px; display: block; width: 100%; max-width: 280px; margin: 0 auto; text-align: center; box-sizing: border-box; }
	}
`

export interface EmailTemplateOptions {
	title: string
	subtitle?: string
	logoUrl?: string
	content: string
	showLogoImage?: boolean
}

/**
 * Genera la estructura HTML base de un correo con header, content y footer.
 */
export function buildEmailTemplate(options: EmailTemplateOptions): string {
	const {
		title,
		subtitle = 'Sistema Financieramente',
		logoUrl,
		content,
		showLogoImage = true,
	} = options

	const logoHtml = showLogoImage && logoUrl
		? `<div class="logo-container"><img src="${logoUrl}" alt="Financieramente" class="logo" /></div>`
		: ''

	return `<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<style>${EMAIL_BASE_STYLES}</style>
</head>
<body>
	<div class="container">
		<div class="header">
			${logoHtml}
			<h1>${escapeHtml(title)}</h1>
			${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}
		</div>
		<div class="content">
			${content}
		</div>
		<div class="footer">
			<p>Este es un correo automático del sistema Financieramente.</p>
			<p>© ${new Date().getFullYear()} Financieramente. Todos los derechos reservados.</p>
		</div>
	</div>
</body>
</html>`.trim()
}

export function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
}
