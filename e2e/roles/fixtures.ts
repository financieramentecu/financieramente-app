import { test as base } from '@playwright/test'
import { RolesListPage } from '../pages/roles-list.page'
import { RoleEditorPage } from '../pages/role-editor.page'

type Pages = {
	rolesList: RolesListPage
	roleEditor: RoleEditorPage
}

/** Test with the page objects injected, so specs hold flow + assertions only. */
export const test = base.extend<Pages>({
	rolesList: async ({ page }, provide) => provide(new RolesListPage(page)),
	roleEditor: async ({ page }, provide) => provide(new RoleEditorPage(page)),
})

export { expect } from '@playwright/test'
