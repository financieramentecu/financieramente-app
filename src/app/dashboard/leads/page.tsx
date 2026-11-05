import { permanentRedirect } from 'next/navigation'

/** Legacy route: lead management moved to Negocios → CRM. */
export default function LeadsPage() {
	permanentRedirect('/dashboard/negocios/crm')
}
