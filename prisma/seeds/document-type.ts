import { PrismaClient } from '@prisma/client'
import { STANDARD_DOCUMENT_TYPES } from '../../src/features/document-types/lib/standard-document-types'

/**
 * Inserts the base document types when they are missing.
 * Does not overwrite an existing row: an administrator may have
 * changed lengths or deactivated a type after the initial load.
 */
export async function seedDocumentTypes(prisma: PrismaClient) {
	console.log('\n👉 Procesando Tipos de Documento...')

	for (const documentType of STANDARD_DOCUMENT_TYPES) {
		const existing = await prisma.documentType.findFirst({
			where: { code: documentType.code },
		})

		if (existing) {
			console.log(`↩️  Tipo de documento ya existe: ${documentType.code}`)
			continue
		}

		await prisma.documentType.create({
			data: {
				name: documentType.name,
				code: documentType.code,
				dataType: documentType.dataType,
				minLength: documentType.minLength,
				maxLength: documentType.maxLength,
				status: true,
			},
		})
		console.log(
			`✅ Tipo de documento creado: ${documentType.name} (${documentType.code})`
		)
	}
}
