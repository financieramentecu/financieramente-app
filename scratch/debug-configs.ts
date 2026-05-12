
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
	const configs = await prisma.productConfiguration.findMany({
		where: {
			code: {
				contains: 'SKANDIA-MFUND'
			}
		},
		select: {
			id: true,
			idProduct: true,
			idLevel: true,
			code: true,
			active: true
		}
	})
	console.log(JSON.stringify(configs, null, 2))
}

main()
	.catch(e => console.error(e))
	.finally(() => prisma.$disconnect())
