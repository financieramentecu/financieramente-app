// Storybook renders client forms without executing Next.js server actions or database code.
async function unavailableServerAction() {
	throw new Error('Las acciones de servidor no están disponibles en Storybook')
}
export {
	unavailableServerAction as createClient,
	unavailableServerAction as updateClient,
	unavailableServerAction as createBusiness,
	unavailableServerAction as syncBusinessPolicyholder,
	unavailableServerAction as checkBusinessCreation,
	unavailableServerAction as resolveExistingClient,
}
