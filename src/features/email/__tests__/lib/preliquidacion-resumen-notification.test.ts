import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    buildResumenPreliquidacionHtml,
    sendResumenPreliquidacionEmail,
} from '../../lib/preliquidacion-resumen-notification'
import { sendEmail } from '../../lib/email-service'

vi.mock('../../lib/email-service', () => ({
    sendEmail: vi.fn().mockResolvedValue({ success: true }),
}))

describe('preliquidacion-resumen-notification', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('buildResumenPreliquidacionHtml', () => {
        it('incluye saludo, archivo, periodo y tabla con filas', () => {
            const html = buildResumenPreliquidacionHtml(
                {
                    to: 'user@test.com',
                    nombreUsuario: 'Juan Pérez',
                    archivoNombre: 'Carga Enero.xlsx',
                    periodo: '2024-01-01 - 2024-01-31',
                    filas: [
                        {
                            nombreNegocio: 'Contrato CT-001',
                            valorComision: 150.5,
                            categoriaConcepto: 'Agencia',
                        },
                        {
                            nombreNegocio: 'Contrato CT-002',
                            valorComision: 200,
                            categoriaConcepto: 'General',
                        },
                    ],
                },
                'https://example.com'
            )

            expect(html).toContain('Hola Juan Pérez,')
            expect(html).toContain('Carga Enero.xlsx')
            expect(html).toContain('2024-01-01 - 2024-01-31')
            expect(html).toContain('Contrato CT-001')
            expect(html).toContain('Contrato CT-002')
            expect(html).toContain('Agencia')
            expect(html).toContain('General')
            expect(html).toContain('<table')
            expect(html).toContain('Negocio')
            expect(html).toContain('Valor comisión')
            expect(html).toContain('Categoría')
            expect(html).toContain('Financieramente')
        })

        it('escapa HTML en nombres para evitar XSS', () => {
            const html = buildResumenPreliquidacionHtml(
                {
                    to: 'u@t.com',
                    archivoNombre: '<script>alert(1)</script>',
                    periodo: '2024-01',
                    filas: [{ nombreNegocio: 'A & B', valorComision: 0 }],
                },
                'https://example.com'
            )
            expect(html).not.toContain('<script>')
            expect(html).toContain('&lt;script&gt;')
            expect(html).toContain('A &amp; B')
        })
    })

    describe('sendResumenPreliquidacionEmail', () => {
        it('llama a sendEmail con subject, to, html y text', async () => {
            await sendResumenPreliquidacionEmail({
                to: 'agente@test.com',
                nombreUsuario: 'María',
                archivoNombre: 'Archivo.xlsx',
                periodo: '2024-01',
                filas: [
                    { nombreNegocio: 'N1', valorComision: 100 },
                ],
            })

            expect(sendEmail).toHaveBeenCalledTimes(1)
            const [params] = vi.mocked(sendEmail).mock.calls[0]
            expect(params.to).toBe('agente@test.com')
            expect(params.subject).toContain('Resumen de pre-liquidación')
            expect(params.subject).toContain('Archivo.xlsx')
            expect(params.subject).toContain('2024-01')
            expect(params.html).toBeDefined()
            expect(params.text).toBeDefined()
            expect(params.html).toContain('N1')
            expect(params.text).toContain('N1')
        })
    })
})
