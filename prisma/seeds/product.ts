import { PrismaClient } from '@prisma/client'

// Lista estructurada y pre-procesada en base al archivo CSV
// Evita dependencias de fs/xlsx en tiempo de runtime
export const products: Array<{ companyName: string; name: string }> = [
	// TRINITY
	{ companyName: 'TRINITY', name: 'PROTECTION PLUS' },
	{ companyName: 'TRINITY', name: 'SUPREME' },
	{ companyName: 'TRINITY', name: 'EXECUTIVE 20' },
	{ companyName: 'TRINITY', name: 'PLAYER 10' },
	{ companyName: 'TRINITY', name: 'EXECUTIVE 15' },
	{ companyName: 'TRINITY', name: 'EXECUTIVE 10' },
	{ companyName: 'TRINITY', name: 'ANNUITY PLAN' },
	// ITA
	{ companyName: 'ITA', name: 'ACS5000' },
	{ companyName: 'ITA', name: 'ACS5025' },
	{ companyName: 'ITA', name: 'ACS5050' },
	{ companyName: 'ITA', name: 'ACS5075' },
	{ companyName: 'ITA', name: 'ACS5100' },
	{ companyName: 'ITA', name: 'ACS8000' },
	{ companyName: 'ITA', name: 'ACS8025' },
	{ companyName: 'ITA', name: 'ACS8050' },
	{ companyName: 'ITA', name: 'ACS8075' },
	{ companyName: 'ITA', name: 'ACS8100' },
	{ companyName: 'ITA', name: 'ACS***' },
	{ companyName: 'ITA', name: 'ACSPL*' },
	{ companyName: 'ITA', name: 'ACX***' },
	{ companyName: 'ITA', name: 'EVO05-CR' },
	{ companyName: 'ITA', name: 'EVO05' },
	{ companyName: 'ITA', name: 'EVO10-CR' },
	{ companyName: 'ITA', name: 'EVO10' },
	{ companyName: 'ITA', name: 'EVO15-CR' },
	{ companyName: 'ITA', name: 'EVO15' },
	{ companyName: 'ITA', name: 'EVO20-CR' },
	{ companyName: 'ITA', name: 'EVO20' },
	{ companyName: 'ITA', name: 'EVO25-CR' },
	{ companyName: 'ITA', name: 'EVO25' },
	{ companyName: 'ITA', name: 'EVOPL*' },
	{ companyName: 'ITA', name: 'EVOSEL' },
	{ companyName: 'ITA', name: 'EVOSEL*' },
	{ companyName: 'ITA', name: 'FIFR03-CR' },
	{ companyName: 'ITA', name: 'FIFR03-N' },
	{ companyName: 'ITA', name: 'FIFR05-CR' },
	{ companyName: 'ITA', name: 'FIFR05-N' },
	{ companyName: 'ITA', name: 'FIFR07-CR' },
	{ companyName: 'ITA', name: 'FIFR07' },
	{ companyName: 'ITA', name: 'FIFR10-CR' },
	{ companyName: 'ITA', name: 'FIFR10' },
	{ companyName: 'ITA', name: 'FIVR15-CR' },
	{ companyName: 'ITA', name: 'FIVR15' },
	{ companyName: 'ITA', name: 'MSCI10-CR**' },
	{ companyName: 'ITA', name: 'MSCI10**' },
	{ companyName: 'ITA', name: 'MSCI15-CR**' },
	{ companyName: 'ITA', name: 'MSCI15**' },
	{ companyName: 'ITA', name: 'MSCI20-CR**' },
	{ companyName: 'ITA', name: 'MSCI20**' },
	{ companyName: 'ITA', name: 'PLAT-CR' },
	{ companyName: 'ITA', name: 'PLAT' },
	{ companyName: 'ITA', name: 'PLATPL-CR*' },
	{ companyName: 'ITA', name: 'PLATPL*' },
	{ companyName: 'ITA', name: 'PLATS-CR' },
	{ companyName: 'ITA', name: 'PLATS' },
	{ companyName: 'ITA', name: 'SPX07-CR' },
	{ companyName: 'ITA', name: 'SPX07-N' },
	{ companyName: 'ITA', name: 'SPX10-CRX**' },
	{ companyName: 'ITA', name: 'SPX10-X**' },
	{ companyName: 'ITA', name: 'SPX15-CR' },
	{ companyName: 'ITA', name: 'SPX15-CRX**' },
	{ companyName: 'ITA', name: 'SPX15-X**' },
	{ companyName: 'ITA', name: 'SPX20-CRX**' },
	{ companyName: 'ITA', name: 'SPX20-X**' },
	// MANHATTAN
	{ companyName: 'MANHATTAN', name: 'FIA' },
	{ companyName: 'MANHATTAN', name: 'MARKET SHIELD' },
	// AFIBL
	{ companyName: 'AFIBL', name: 'ULTRA III*' },
	{ companyName: 'AFIBL', name: 'INDEXA PRO IUL*' },
	{ companyName: 'AFIBL', name: 'UL PRIME*' },
	{ companyName: 'AFIBL', name: 'SELECT TERM 10 & 15' },
	{ companyName: 'AFIBL', name: 'SELECT TERM 20 & 30' },
	{ companyName: 'AFIBL', name: 'SELEC TERM TO A 85 & TO A 100' },
	{ companyName: 'AFIBL', name: 'CRITICAL ILLNESS' },
	// DOMINION
	{ companyName: 'DOMINION', name: 'MY SAVINGS STRATEGY' },
	{ companyName: 'DOMINION', name: 'MY INVESTMENT STRATEGY' },
	// STONEX
	{ companyName: 'STONEX', name: 'BEYOND CAUTELOSO' },
	{ companyName: 'STONEX', name: 'BEYOND BALANCEADO' },
	{ companyName: 'STONEX', name: 'BEYOND DINAMICO' },
	{ companyName: 'STONEX', name: 'STANDARD' },
	// MEJORCDT
	{ companyName: 'MEJORCDT', name: 'MEJOR CDT' },
	// SKANDIA
	{ companyName: 'SKANDIA', name: 'CES' },
	{ companyName: 'SKANDIA', name: 'CPA' },
	{ companyName: 'SKANDIA', name: 'CREA PATRIMONIO' },
	{ companyName: 'SKANDIA', name: 'FPOB' },
	{ companyName: 'SKANDIA', name: 'IMPACTO' },
	{ companyName: 'SKANDIA', name: 'MFUND' },
	{ companyName: 'SKANDIA', name: 'ACCAI' },
	{ companyName: 'SKANDIA', name: 'C+S' },
]

export async function seedProducts(prisma: PrismaClient) {
	console.log('\n👉 Procesando Productos (Products)...')

	// Obtener ID del tipo de producto POLIZA DE VIDA por defecto
	const polizaVida = await prisma.typeProduct.findFirst({
		where: { name: 'POLIZA DE VIDA' },
	})

	if (!polizaVida) {
		console.error(
			'❌ Error: No se encontró el tipo de producto POLIZA DE VIDA. Ejecuta el seed de tipos de producto primero.'
		)
		return
	}

	for (const product of products) {
		// Lookup dinámico de la compañía para este producto específico
		const comp = await prisma.company.findFirst({
			where: { name: product.companyName },
		})

		if (!comp) {
			console.warn(
				`⚠️ Advertencia: No se encontró la compañía "${product.companyName}" para el producto "${product.name}". Omitiendo...`
			)
			continue
		}

		const existing = await prisma.product.findFirst({
			where: {
				name: product.name,
				idCompany: comp.idCompany,
			},
		})

		if (existing) {
			await prisma.product.update({
				where: { idProduct: existing.idProduct },
				data: {
					idTypeProduct: polizaVida.idTypeProduct,
					status: true,
				},
			})
			console.log(
				`✅ Producto actualizado: ${product.companyName} - ${product.name}`
			)
		} else {
			await prisma.product.create({
				data: {
					name: product.name,
					idCompany: comp.idCompany,
					idTypeProduct: polizaVida.idTypeProduct,
					status: true,
					description: '',
				},
			})
			console.log(
				`✅ Producto creado: ${product.companyName} - ${product.name}`
			)
		}
	}
}
