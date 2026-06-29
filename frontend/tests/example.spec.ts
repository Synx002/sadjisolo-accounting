import { test, expect } from '@playwright/test';

test('Uji coba Login Admin Sadjisolo', async ({ page }) => {
  // 1. Buka halaman login aplikasi kamu (sesuaikan port localhost-nya)
  await page.goto('http://localhost:5173/login');

  // 2. Isi form login (sesuaikan dengan selector selector input di HTML-mu)
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Password').fill('password');

  // 3. Klik tombol submit/login
  await page.getByRole('button', { name: 'Masuk' }).click();

  // 4. Pastikan berhasil masuk (misal: diarahkan ke halaman dashboard)
  await expect(page).toHaveURL(/.*dashboard/);
});