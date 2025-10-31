import { test, expect } from '@playwright/test'

test.setTimeout(60000) // 🔥 para evitar falsos timeouts en browsers lentos

const MOCK = {
    "name": "John Doe",
    "position": "Senior Developer",
    "salary": 5000000
}

const UPDATE_MODK = {
    "name": "Juan Perez",
    "salary": 6000000
}

function formatToCurrency(amount: number): string {
    // 1. Usa Intl.NumberFormat para manejar la localización de comas y puntos.
    // 'en-US' es común para formatos con '$' y coma como separador de miles.
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD', // Usa 'USD' si el símbolo es '$'
        minimumFractionDigits: 0, // Asegura que no haya decimales
        maximumFractionDigits: 0,
    });
    
    return formatter.format(amount);
}

test.describe.configure({ mode: 'serial' });

test.describe("Employees CRUD Test", () => {

    test("Register New Employee", async ({page}) => {
        await page.goto(`/dashboard`)
        await (await page.waitForSelector('a:has-text("Nuevo Empleado")', {state: "attached"})).click()
        await (await page.waitForSelector("input[placeholder='Ingrese el nombre del empleado']", {state: "attached"})).fill(MOCK.name)
        await (await page.waitForSelector("input[placeholder='Ingrese la posición del empleado']", {state: "attached"})).fill(MOCK.position)
        await (await page.waitForSelector("input[placeholder='Ingrese el salario']", {state: "attached"})).fill(`${MOCK.salary}`)
        await (await page.waitForSelector("button:has-text('Crear Empleado')", {state: "attached"})).click()
        
        const response = await page.$("p:has-text('No hay empleados registrados.')")
        await expect(response).toBeNull()
    })

    test("Employee List Table", async ({page}) => {
        await page.goto(`/employees`)
        // Si no hay empleados, crea uno primero
        let rows = await page.locator('tbody tr').count();
        if (rows === 0) {
            await page.goto(`/dashboard`)
            await (await page.waitForSelector('a:has-text("Nuevo Empleado")', {state: "attached"})).click()
            await (await page.waitForSelector("input[placeholder='Ingrese el nombre del empleado']", {state: "attached"})).fill(MOCK.name)
            await (await page.waitForSelector("input[placeholder='Ingrese la posición del empleado']", {state: "attached"})).fill(MOCK.position)
            await (await page.waitForSelector("input[placeholder='Ingrese el salario']", {state: "attached"})).fill(`${MOCK.salary}`)
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

        // Si no hay empleados, crea uno primero
        if (rows === 0) {
            await page.goto(`/dashboard`)
            await (await page.waitForSelector('a:has-text("Nuevo Empleado")', {state: "attached"})).click()
            await (await page.waitForSelector("input[placeholder='Ingrese el nombre del empleado']", {state: "attached"})).fill(MOCK.name)
            await (await page.waitForSelector("input[placeholder='Ingrese la posición del empleado']", {state: "attached"})).fill(MOCK.position)
            await (await page.waitForSelector("input[placeholder='Ingrese el salario']", {state: "attached"})).fill(`${MOCK.salary}`)
            await (await page.waitForSelector("button:has-text('Crear Empleado')", {state: "attached"})).click()
            
            // 🔥 Espera explícita a que se muestre el empleado en la tabla
            await page.goto(`/employees`)
            // Espera hasta que desaparezca un posible loader o que exista cualquier texto de la tabla
            await page.waitForLoadState('networkidle', { timeout: 20000 })

            // Espera flexible: tbody o mensaje "No hay empleados registrados."
            await page.waitForSelector('tbody, p:has-text("No hay empleados registrados.")', { timeout: 20000 })

            // Si aparece la tabla, espera a que haya al menos una fila (si aplica)
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

        // 🔥 Aquí entra el modo edición
        await page.locator(`tbody tr`).first().locator("td a:has-text('Editar')").click()
        await (await page.waitForSelector("input[placeholder='Ingrese el nombre del empleado']", {state: 'attached', timeout: 15000})).fill(UPDATE_MODK.name)
        await (await page.waitForSelector("input[placeholder='Ingrese el salario']", {state: "attached", timeout: 15000})).fill(`${UPDATE_MODK.salary}`)
        await (await page.waitForSelector("button:has-text('Actualizar Empleado')", {state: "attached", timeout: 15000})).click()

        // ⚡ Espera que la página redirija de nuevo o actualice la tabla
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

        // ✅ Verifica que los datos actualizados aparezcan correctamente
        await expect(page.locator('tbody tr:first-child td:nth-child(2)')).toHaveText(UPDATE_MODK.name, { timeout: 10000 })
        await expect(page.locator('tbody tr:first-child td:nth-child(4)')).toHaveText(formatToCurrency(UPDATE_MODK.salary), { timeout: 10000 })
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
        // Verifica el mensaje solo si existe
        const emptyMsg = await page.locator("p:has-text('No hay empleados registrados.')").count();
        if (emptyMsg > 0) {
            await expect(page.locator("p:has-text('No hay empleados registrados.')")).toBeVisible();
        }
    })

    test("Checking Error Messages", async ({page}) => {
        await page.goto(`/employees/new`)
        await page.waitForLoadState('networkidle')
        await page.waitForSelector("input[placeholder='Ingrese el nombre del empleado']", {state: "attached", timeout: 15000})
        const nameInput = await page.locator("input[placeholder='Ingrese el nombre del empleado']")
        await nameInput.focus()
        await nameInput.blur()

        const nameErrorDiv = await page.locator("div[class='field-error']")
        await expect(nameErrorDiv).toHaveCount(1)
        await expect(await nameErrorDiv.innerText()).toContain('name es requerido')
        await nameInput.fill(MOCK.name)

        const nameErrorDivClean = await page.locator("div[class='field-error']")
        await expect(nameErrorDivClean).toHaveCount(0)

        await page.waitForSelector("input[placeholder='Ingrese el salario']", {state: "attached", timeout: 15000})
        const salaryInput = await page.locator("input[placeholder='Ingrese el salario']")
        await salaryInput.fill(`-${MOCK.salary}`)
        await salaryInput.blur()
        const salaryErrorDiv = await page.locator("div[class='field-error']")
        await expect(salaryErrorDiv).toHaveCount(1)
        await expect(await salaryErrorDiv.innerText()).toContain("salary debe ser mayor o igual a 0")
        await salaryInput.fill(`${MOCK.salary}`)
        const salaryErrorDivClean = await page.locator("div[class='field-error']")
        await expect(salaryErrorDivClean).toHaveCount(0)

    })
})
