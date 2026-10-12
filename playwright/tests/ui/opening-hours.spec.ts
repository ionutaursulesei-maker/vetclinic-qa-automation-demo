import { test, expect, Browser } from '@playwright/test';

/**
 * "Open now" must depend on the clinic's time zone (Europe/London), never on the visitor's device.
 * Each case pins the clock to a UK moment and opens the page from several device time zones:
 * every visitor must see the same status.
 */
const VISITOR_ZONES = ['Europe/London', 'Europe/Bucharest', 'America/New_York', 'Asia/Tokyo'];

const CASES = [
  // 18:26 BST on a Monday = 17:26 UTC – open (closes 19:00)
  { when: '2026-10-12T17:26:00Z', uk: 'Mon 18:26 BST', expected: 'Open now' },
  // 19:30 UK – just closed
  { when: '2026-10-12T18:30:00Z', uk: 'Mon 19:30 BST', expected: 'Closed' },
  // 08:30 UK – not open yet
  { when: '2026-10-13T07:30:00Z', uk: 'Tue 08:30 BST', expected: 'Closed' },
  // After the switch to GMT (25 Oct 2026): 18:30 UK = 18:30 UTC – still open
  { when: '2026-10-26T18:30:00Z', uk: 'Mon 18:30 GMT', expected: 'Open now' },
];

async function statusSeenFrom(browser: Browser, baseURL: string, timezoneId: string, isoUtc: string, query = '') {
  const context = await browser.newContext({ timezoneId, baseURL });
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date(isoUtc));
  await page.addInitScript(() => localStorage.setItem('consent', 'rejected'));
  await page.goto(`/${query}`);
  const status = (await page.locator('#clinic-status').textContent())?.trim();
  await context.close();
  return status;
}

test.describe('Clinic opening status across visitor time zones', () => {
  for (const c of CASES) {
    test(`${c.uk} → "${c.expected}" for every visitor`, async ({ browser, baseURL }) => {
      for (const zone of VISITOR_ZONES) {
        expect.soft(await statusSeenFrom(browser, baseURL!, zone, c.when), `visitor in ${zone}`).toBe(c.expected);
      }
    });
  }

  // Documents the bug found on a real veterinary site: status computed in the visitor's local time.
  // test.fail() = this test is EXPECTED to fail; it passes the suite only while the bug reproduces.
  test('naive local-time implementation (?tzbug=1) shows the wrong status to a Romanian visitor', async ({ browser, baseURL }) => {
    test.fail();
    const fromLondon = await statusSeenFrom(browser, baseURL!, 'Europe/London', CASES[0].when, '?tzbug=1');
    const fromBucharest = await statusSeenFrom(browser, baseURL!, 'Europe/Bucharest', CASES[0].when, '?tzbug=1');
    expect(fromBucharest).toBe(fromLondon);
  });
});
