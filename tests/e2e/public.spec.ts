import { test,expect } from '@playwright/test';
test('login and password recovery are public',async({page})=>{
    await page.goto('/login');await expect(page.getByRole('heading',{name:'Iniciar sesión'})).toBeVisible();
    await page.getByRole('link',{name:'Recuperar contraseña'}).click();
    await expect(page.getByRole('heading',{name:'Recuperar acceso'})).toBeVisible();
});
test('protected deep link preserves path and query',async({page})=>{
    await page.goto('/students/00000000-0000-0000-0000-000000000001?tab=history');
    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fstudents%2F00000000-0000-0000-0000-000000000001%3Ftab%3Dhistory/);
});
