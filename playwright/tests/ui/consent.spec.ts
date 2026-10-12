import { test, expect, Page, Request } from '@playwright/test';

// Any request to a marketing/tracking host counts as tracking.
const TRACKING = /example-ads\.com|tiktok\.com|facebook\.(com|net)|doubleclick\.net|visualwebsiteoptimizer\.com/;

/** Records tracking requests from the moment it is called. */
function recordTracking(page: Page): Request[] {
  const hits: Request[] = [];
  page.on('request', (req) => {
    if (TRACKING.test(req.url())) hits.push(req);
  });
  return hits;
}

test.describe('Cookie consent (UK GDPR / PECR)', () => {
  test.beforeEach(async ({ page }) => {
    // Never let the fake tracker leave the machine; still observable as a request.
    await page.route(TRACKING, (route) => route.fulfill({ status: 204, body: '' }));
  });

  test('no tracking before the visitor makes a choice @smoke', async ({ page }) => {
    const hits = recordTracking(page);

    await page.goto('/');

    await expect(page.getByRole('dialog', { name: 'Cookie consent' })).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(hits.map((r) => r.url())).toEqual([]);
  });

  test('no tracking after "Reject all", including on the next visit', async ({ page }) => {
    const hits = recordTracking(page);
    await page.goto('/');

    await page.getByRole('button', { name: 'Reject all' }).click();
    await expect(page.getByRole('dialog', { name: 'Cookie consent' })).toBeHidden();
    await page.reload();
    await page.waitForLoadState('networkidle');

    expect(hits.map((r) => r.url())).toEqual([]);
  });

  test('tracking loads only after "Accept all"', async ({ page }) => {
    const hits = recordTracking(page);
    await page.goto('/');
    expect(hits).toHaveLength(0);

    const trackerRequest = page.waitForRequest(TRACKING);
    await page.getByRole('button', { name: 'Accept all' }).click();

    await trackerRequest;
    expect(hits.length).toBeGreaterThan(0);
  });
});
