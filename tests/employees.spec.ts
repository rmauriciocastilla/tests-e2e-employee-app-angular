import { test, expect } from '@playwright/test'

test.setTimeout(60000) 

const INITIAL_MOCK = {
    "name": "Alan Brito",
    "position": "Desarrollador",
    "salary": 5000000
}

const UPDATE_MOCK = {
    "name": "Armando Casas",
    "salary": 6000000
}

function formatToCurrency(amount: number): string {
    
    
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD', 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 0,
    });
    
    return formatter.format(amount);
}

test.describe.configure({ mode: 'serial' });

test.describe("CRUD Employees", () => {

    test("New Employee", async ({page}) => {
        await page.goto(`/dashboard`)
        await (await page.waitForSelector('a:has-text("Nuevo Empleado")', {state: "attached"})).click()
        await (await page.waitForSelector("input[placeholder='Ingrese el nombre del empleado']", {state: "attached"})).fill(INITIAL_MOCK.name)
        await (await page.waitForSelector("input[placeholder='Ingrese la posición del empleado']", {state: "attached"})).fill(INITIAL_MOCK.position)
        await (await page.waitForSelector("input[placeholder='Ingrese el salario']", {state: "attached"})).fill(`${INITIAL_MOCK.salary}`)
        await (await page.waitForSelector("button:has-text('Crear Empleado')", {state: "attached"})).click()
        
        const response = await page.$("p:has-text('No hay empleados registrados.')")
        await expect(response).toBeNull()
    })

    test("List Table", async ({page}) => {
        await page.goto(`/employees`)
        
        let rows = await page.locator('tbody tr').count();
        if (rows === 0) {
            await page.goto(`/dashboard`)
            await (await page.waitForSelector('a:has-text("Nuevo Empleado")', {state: "attached"})).click()
            await (await page.waitForSelector("input[placeholder='Ingrese el nombre del empleado']", {state: "attached"})).fill(INITIAL_MOCK.name)
            await (await page.waitForSelector("input[placeholder='Ingrese la posición del empleado']", {state: "attached"})).fill(INITIAL_MOCK.position)
            await (await page.waitForSelector("input[placeholder='Ingrese el salario']", {state: "attached"})).fill(`${INITIAL_MOCK.salary}`)
            await (await page.waitForSelector("button:has-text('Crear Empleado')", {state: "attached"})).click()
            await page.goto(`/employees`)
        }
        await page.waitForSelector("tbody", {state: "attached"})
        const tbody = await page.locator("tbody")
        const trList = await tbody.locator('tr').all()
        await expect(trList.length).toBeGreaterThan(0)
    })
    
    test("Update Employee", async ({page}) => {
        await page.goto(`/employees`)
        let rows = await page.locator('tbody tr').count();

        
        if (rows === 0) {
            await page.goto(`/dashboard`)
            await (await page.waitForSelector('a:has-text("Nuevo Empleado")', {state: "attached"})).click()
            await (await page.waitForSelector("input[placeholder='Ingrese el nombre del empleado']", {state: "attached"})).fill(INITIAL_MOCK.name)
            await (await page.waitForSelector("input[placeholder='Ingrese la posición del empleado']", {state: "attached"})).fill(INITIAL_MOCK.position)
            await (await page.waitForSelector("input[placeholder='Ingrese el salario']", {state: "attached"})).fill(`${INITIAL_MOCK.salary}`)
            await (await page.waitForSelector("button:has-text('Crear Empleado')", {state: "attached"})).click()
            
            
            await page.goto(`/employees`)
            
            await page.waitForLoadState('networkidle', { timeout: 20000 })

            
            await page.waitForSelector('tbody, p:has-text("No hay empleados registrados.")', { timeout: 20000 })

            
            const hasTable = await page.locator('tbody').count()
            if (hasTable > 0) {
            await page.waitForFunction(
                () => document.querySelectorAll('tbody tr').length > 0,
                { timeout: 20000 }
            )
            }

        } else {
            await page.waitForSelector(`tbody tr`, {state: "attached", timeout: 15000})
        }

        
        await page.locator(`tbody tr`).first().locator("td a:has-text('Editar')").click()
        await (await page.waitForSelector("input[placeholder='Ingrese el nombre del empleado']", {state: 'attached', timeout: 15000})).fill(UPDATE_MOCK.name)
        await (await page.waitForSelector("input[placeholder='Ingrese el salario']", {state: "attached", timeout: 15000})).fill(`${UPDATE_MOCK.salary}`)
        await (await page.waitForSelector("button:has-text('Actualizar Empleado')", {state: "attached", timeout: 15000})).click()

        
        await page.waitForURL('**/employees', { timeout: 15000 })
        await page.waitForLoadState('networkidle', { timeout: 20000 })
        await page.waitForSelector('tbody, p:has-text("No hay empleados registrados.")', { timeout: 20000 })

        const hasTable = await page.locator('tbody').count()
        if (hasTable > 0) {
        await page.waitForFunction(
            () => document.querySelectorAll('tbody tr').length > 0,
            { timeout: 20000 }
        )
        }

        
        await expect(page.locator('tbody tr:first-child td:nth-child(2)')).toHaveText(UPDATE_MOCK.name, { timeout: 10000 })
        await expect(page.locator('tbody tr:first-child td:nth-child(4)')).toHaveText(formatToCurrency(UPDATE_MOCK.salary), { timeout: 10000 })
    })

    test("Delete Employee", async ({page}) => {
        await page.goto(`/employees`)
        let rows = await page.locator('tbody tr').count();
        if (rows > 0) {
            page.on("dialog", async (dialog) => {
                await expect(dialog.type()).toBe('confirm')
                await dialog.accept()
            })
            while (rows > 0) {
                await page.locator('tbody tr').first().locator('td button:has-text("Eliminar")').click();
                await page.waitForTimeout(500);
                rows = await page.locator('tbody tr').count();
            }
        }
        await expect(page.locator('tbody tr')).toHaveCount(0);
        
        const emptyMsg = await page.locator("p:has-text('No hay empleados registrados.')").count();
        if (emptyMsg > 0) {
            await expect(page.locator("p:has-text('No hay empleados registrados.')")).toBeVisible();
        }
    })

    test("Check Error Messages", async ({page}) => {
        await page.goto(`/employees/new`)
        await page.waitForLoadState('networkidle')
        await page.waitForSelector("input[placeholder='Ingrese el nombre del empleado']", {state: "attached", timeout: 15000})
        const nameInput = await page.locator("input[placeholder='Ingrese el nombre del empleado']")
        await nameInput.focus()
        await nameInput.blur()

        const nameErrorDiv = await page.locator("div[class='field-error']")
        await expect(nameErrorDiv).toHaveCount(1)
        await expect(await nameErrorDiv.innerText()).toContain('name es requerido')
        await nameInput.fill(INITIAL_MOCK.name)

        const nameErrorDivClean = await page.locator("div[class='field-error']")
        await expect(nameErrorDivClean).toHaveCount(0)

        await page.waitForSelector("input[placeholder='Ingrese el salario']", {state: "attached", timeout: 15000})
        const salaryInput = await page.locator("input[placeholder='Ingrese el salario']")
        await salaryInput.fill(`-${INITIAL_MOCK.salary}`)
        await salaryInput.blur()
        const salaryErrorDiv = await page.locator("div[class='field-error']")
        await expect(salaryErrorDiv).toHaveCount(1)
        await expect(await salaryErrorDiv.innerText()).toContain("salary debe ser mayor o igual a 0")
        await salaryInput.fill(`${INITIAL_MOCK.salary}`)
        const salaryErrorDivClean = await page.locator("div[class='field-error']")
        await expect(salaryErrorDivClean).toHaveCount(0)

    })
})
