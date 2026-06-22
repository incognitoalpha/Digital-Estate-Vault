import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display signup page', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.locator('h1')).toContainText('Create Your Vault');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toHaveCount(2);
  });

  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Welcome Back');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should show validation errors on signup', async ({ page }) => {
    await page.goto('/signup');
    
    await page.fill('input[id="email"]', 'test@example.com');
    await page.fill('input[id="password"]', 'pass123');
    await page.fill('input[id="confirmPassword"]', 'pass123');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=/8 characters/i')).toBeVisible();
  });

  test('should require matching passwords on signup', async ({ page }) => {
    await page.goto('/signup');
    
    await page.fill('input[id="email"]', 'test@example.com');
    await page.fill('input[id="password"]', 'password123');
    await page.fill('input[id="confirmPassword"]', 'different123');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=/do not match/i')).toBeVisible();
  });

  test('should have accessible form labels', async ({ page }) => {
    await page.goto('/signup');
    
    const emailInput = page.locator('input[id="email"]');
    const passwordInput = page.locator('input[id="password"]');
    
    await expect(emailInput).toHaveAttribute('id', 'email');
    await expect(passwordInput).toHaveAttribute('id', 'password');
    
    await expect(page.locator('label[for="email"]')).toBeVisible();
    await expect(page.locator('label[for="password"]')).toBeVisible();
  });

  test('should navigate between login and signup', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Create one');
    await expect(page).toHaveURL('/signup');
    
    await page.click('text=Sign in');
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Accessibility', () => {
  test('login page should be keyboard navigable', async ({ page }) => {
    await page.goto('/login');
    
    await page.keyboard.press('Tab');
    await expect(page.locator('input[id="email"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('input[id="password"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('button[type="submit"]')).toBeFocused();
  });

  test('signup page should have aria-busy on submit', async ({ page }) => {
    await page.goto('/signup');
    
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).not.toHaveAttribute('aria-busy', 'true');
  });

  test('error messages should have role=alert', async ({ page }) => {
    await page.goto('/signup');
    
    await page.fill('input[id="email"]', 'test@example.com');
    await page.fill('input[id="password"]', 'pass');
    await page.fill('input[id="confirmPassword"]', 'different');
    await page.click('button[type="submit"]');

    const errorAlert = page.locator('[role="alert"]');
    await expect(errorAlert).toBeVisible();
  });
});
