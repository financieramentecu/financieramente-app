import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type ContributionType = 'REGULAR' | 'UNICO'

interface ProductCommission {
	company: string
	product: string
	commissionPercentage: number
	contributionType: ContributionType
}

const PRODUCT_COMMISSIONS: ProductCommission[] = [
	{
		company: 'TRINITY',
		product: 'PROTECTION PLUS',
		commissionPercentage: 76.5,
		contributionType: 'REGULAR',
	},
	{
		company: 'TRINITY',
		product: 'SUPREME',
		commissionPercentage: 76.5,
		contributionType: 'REGULAR',
	},
	{
		company: 'TRINITY',
		product: 'EXECUTIVE 20',
		commissionPercentage: 76.5,
		contributionType: 'REGULAR',
	},
	{
		company: 'TRINITY',
		product: 'PLAYER 10',
		commissionPercentage: 72.0,
		contributionType: 'REGULAR',
	},
	{
		company: 'TRINITY',
		product: 'EXECUTIVE 15',
		commissionPercentage: 61.2,
		contributionType: 'REGULAR',
	},
	{
		company: 'TRINITY',
		product: 'EXECUTIVE 10',
		commissionPercentage: 53.55,
		contributionType: 'REGULAR',
	},
	{
		company: 'TRINITY',
		product: 'ANNUITY PLAN',
		commissionPercentage: 3.56,
		contributionType: 'UNICO',
	},
	{
		company: 'ITA',
		product: 'ACS5000',
		commissionPercentage: 4.05,
		contributionType: 'UNICO',
	},
	{
		company: 'ITA',
		product: 'ACS5025',
		commissionPercentage: 3.04,
		contributionType: 'UNICO',
	},
	{
		company: 'ITA',
		product: 'ACS5050',
		commissionPercentage: 2.03,
		contributionType: 'UNICO',
	},
	{
		company: 'ITA',
		product: 'ACS5075',
		commissionPercentage: 1.01,
		contributionType: 'UNICO',
	},
	{
		company: 'ITA',
		product: 'ACS5100',
		commissionPercentage: 0.0,
		contributionType: 'UNICO',
	},
	{
		company: 'ITA',
		product: 'ACS8000',
		commissionPercentage: 4.5,
		contributionType: 'UNICO',
	},
	{
		company: 'ITA',
		product: 'ACS8025',
		commissionPercentage: 3.38,
		contributionType: 'UNICO',
	},
	{
		company: 'ITA',
		product: 'ACS8050',
		commissionPercentage: 2.25,
		contributionType: 'UNICO',
	},
	{
		company: 'ITA',
		product: 'ACS8075',
		commissionPercentage: 1.13,
		contributionType: 'UNICO',
	},
	{
		company: 'ITA',
		product: 'ACS8100',
		commissionPercentage: 0.0,
		contributionType: 'UNICO',
	},
	{
		company: 'ITA',
		product: 'ACS***',
		commissionPercentage: 2.25,
		contributionType: 'UNICO',
	},
	{
		company: 'ITA',
		product: 'ACSPL*',
		commissionPercentage: 0.23,
		contributionType: 'UNICO',
	},
	{
		company: 'ITA',
		product: 'ACX***',
		commissionPercentage: 2.25,
		contributionType: 'UNICO',
	},
	{
		company: 'ITA',
		product: 'EVO05-CR',
		commissionPercentage: 10.35,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'EVO05',
		commissionPercentage: 10.35,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'EVO10-CR',
		commissionPercentage: 18.9,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'EVO10',
		commissionPercentage: 18.9,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'EVO15-CR',
		commissionPercentage: 24.75,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'EVO15',
		commissionPercentage: 24.75,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'EVO20-CR',
		commissionPercentage: 40.5,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'EVO20',
		commissionPercentage: 40.5,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'EVO25-CR',
		commissionPercentage: 49.5,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'EVO25',
		commissionPercentage: 49.5,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'EVOPL*',
		commissionPercentage: 0.5,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'EVOSEL',
		commissionPercentage: 1.8,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'EVOSEL*',
		commissionPercentage: 0.5,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'FIFR03-CR',
		commissionPercentage: 0.9,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'FIFR03-N',
		commissionPercentage: 0.9,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'FIFR05-CR',
		commissionPercentage: 1.8,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'FIFR05-N',
		commissionPercentage: 1.8,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'FIFR07-CR',
		commissionPercentage: 2.7,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'FIFR07',
		commissionPercentage: 2.7,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'FIFR10-CR',
		commissionPercentage: 3.6,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'FIFR10',
		commissionPercentage: 3.6,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'FIVR15-CR',
		commissionPercentage: 20.25,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'FIVR15',
		commissionPercentage: 20.25,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'MSCI10-CR**',
		commissionPercentage: 18.9,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'MSCI10**',
		commissionPercentage: 18.9,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'MSCI15-CR**',
		commissionPercentage: 40.5,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'MSCI15**',
		commissionPercentage: 40.5,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'MSCI20-CR**',
		commissionPercentage: 45.0,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'MSCI20**',
		commissionPercentage: 45.0,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'PLAT-CR',
		commissionPercentage: 2.93,
		contributionType: 'UNICO',
	},
	{
		company: 'ITA',
		product: 'PLAT',
		commissionPercentage: 2.93,
		contributionType: 'UNICO',
	},
	{
		company: 'ITA',
		product: 'PLATPL-CR*',
		commissionPercentage: 0.5,
		contributionType: 'UNICO',
	},
	{
		company: 'ITA',
		product: 'PLATPL*',
		commissionPercentage: 0.5,
		contributionType: 'UNICO',
	},
	{
		company: 'ITA',
		product: 'PLATS-CR',
		commissionPercentage: 4.05,
		contributionType: 'UNICO',
	},
	{
		company: 'ITA',
		product: 'PLATS',
		commissionPercentage: 4.05,
		contributionType: 'UNICO',
	},
	{
		company: 'ITA',
		product: 'SPX07-CR',
		commissionPercentage: 2.7,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'SPX07-N',
		commissionPercentage: 2.7,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'SPX10-CRX**',
		commissionPercentage: 18.9,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'SPX10-X**',
		commissionPercentage: 18.9,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'SPX15-CR',
		commissionPercentage: 40.5,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'SPX15-CRX**',
		commissionPercentage: 40.5,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'SPX15-X**',
		commissionPercentage: 40.5,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'SPX20-CRX**',
		commissionPercentage: 45.0,
		contributionType: 'REGULAR',
	},
	{
		company: 'ITA',
		product: 'SPX20-X**',
		commissionPercentage: 45.0,
		contributionType: 'REGULAR',
	},
	{
		company: 'MANHATTAN',
		product: 'FIA',
		commissionPercentage: 3.15,
		contributionType: 'UNICO',
	},
	{
		company: 'MANHATTAN',
		product: 'MARKET SHIELD',
		commissionPercentage: 3.15,
		contributionType: 'REGULAR',
	},
	{
		company: 'AFIBL',
		product: 'ULTRA III*',
		commissionPercentage: 63.0,
		contributionType: 'REGULAR',
	},
	{
		company: 'AFIBL',
		product: 'INDEXA PRO IUL*',
		commissionPercentage: 63.0,
		contributionType: 'REGULAR',
	},
	{
		company: 'AFIBL',
		product: 'UL PRIME*',
		commissionPercentage: 54.0,
		contributionType: 'REGULAR',
	},
	{
		company: 'AFIBL',
		product: 'SELECT TERM 10 & 15',
		commissionPercentage: 27.0,
		contributionType: 'REGULAR',
	},
	{
		company: 'AFIBL',
		product: 'SELECT TERM 20 & 30',
		commissionPercentage: 49.5,
		contributionType: 'REGULAR',
	},
	{
		company: 'AFIBL',
		product: 'SELEC TERM TO A 85 & TO A 100',
		commissionPercentage: 54.0,
		contributionType: 'REGULAR',
	},
	{
		company: 'AFIBL',
		product: 'CRITICAL ILLNESS',
		commissionPercentage: 11.7,
		contributionType: 'REGULAR',
	},
	{
		company: 'DOMINION',
		product: 'MY SAVINGS STRATEGY',
		commissionPercentage: 2.88,
		contributionType: 'REGULAR',
	},
	{
		company: 'DOMINION',
		product: 'MY INVESTMENT STRATEGY',
		commissionPercentage: 3.15,
		contributionType: 'UNICO',
	},
	{
		company: 'STONEX',
		product: 'BEYOND CAUTELOSO',
		commissionPercentage: 2.43,
		contributionType: 'REGULAR',
	},
	{
		company: 'STONEX',
		product: 'BEYOND BALANCEADO',
		commissionPercentage: 2.88,
		contributionType: 'REGULAR',
	},
	{
		company: 'STONEX',
		product: 'BEYOND DINAMICO',
		commissionPercentage: 3.42,
		contributionType: 'REGULAR',
	},
	{
		company: 'STONEX',
		product: 'STANDARD',
		commissionPercentage: 3.15,
		contributionType: 'UNICO',
	},
	{
		company: 'SKANDIA',
		product: 'CREA PATRIMONIO',
		commissionPercentage: 28.0,
		contributionType: 'REGULAR',
	},
]

async function main() {
	console.log('Iniciando sincronización de comisiones de productos...')

	let updatedCount = 0
	let notFoundCount = 0

	for (const entry of PRODUCT_COMMISSIONS) {
		const company = await prisma.company.findFirst({
			where: { name: { equals: entry.company, mode: 'insensitive' } },
		})

		if (!company) {
			console.log(`Compañía no encontrada: ${entry.company}`)
			notFoundCount++
			continue
		}

		const product = await prisma.product.findFirst({
			where: {
				idCompany: company.idCompany,
				name: { equals: entry.product, mode: 'insensitive' },
			},
		})

		if (product) {
			await prisma.product.update({
				where: { idProduct: product.idProduct },
				data: {
					commissionPercentage: entry.commissionPercentage,
					contributionType: entry.contributionType,
				},
			})
			updatedCount++
		} else {
			notFoundCount++
			console.log(`Producto no encontrado: ${entry.product} (${entry.company})`)
		}
	}

	console.log('Sincronización completada.')
	console.log(`   - Productos actualizados: ${updatedCount}`)
	console.log(`   - Productos no encontrados: ${notFoundCount}`)
}

main()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
