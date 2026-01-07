import type { BusinessFormData } from '@/features/negocios/lib/business-form-schemas'

export const mockBusinessFormDefaultValues: Partial<BusinessFormData> = {
	email: '',
	name: '',
	lastNames: '',
	phone: '',
	identityNumber: '',
	company: '',
	producto: '',
	terms: undefined,
	currency: undefined,
	periodicity: '',
	value: undefined,
	agent: '',
}

export const mockBusinessFormFilled: BusinessFormData = {
	email: 'john.agudelo@gmail.com',
	name: 'John',
	lastNames: 'Agudelo',
	phone: '+57 320 555 55 55',
	identityNumber: '1053.123.456',
	clientOrigin: '1',
	contract: undefined as string | undefined,
	company: 'skandia',
	producto: 'crea-patrimonio',
	terms: 34,
	currency: 'USD',
	periodicity: 'mensual',
	value: 400950,
	agent: 'Vanesa Cardona',
}
