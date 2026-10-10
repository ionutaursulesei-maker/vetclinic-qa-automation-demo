import { test, expect } from '../../fixtures/test';

test.describe('VetClinic UI – patient registry', () => {
  test.beforeEach(async ({ patientsPage }) => {
    await patientsPage.open();
  });

  test('registers a patient through the form @smoke', async ({ patientsPage, petApi }) => {
    const name = `UI-Rex-${Date.now()}`;

    await patientsPage.register(name, 'Dog', 'Under treatment');

    await expect(patientsPage.registerResult).toHaveText(/Patient registered with ID \d+/);
    const id = Number(await patientsPage.registerResult.getAttribute('data-patient-id'));

    // Verify in the backend, not just in the UI message.
    const stored = await petApi.waitUntilVisible(id);
    expect(stored).toMatchObject({ name, status: 'pending', category: { name: 'Dog' } });
    await petApi.delete(id);
  });

  test('shows the patient card for an existing patient', async ({ patientsPage, registeredPatient }) => {
    await patientsPage.search(registeredPatient.id);

    await expect(patientsPage.cardName).toHaveText(registeredPatient.name);
    await expect(patientsPage.cardSpecies).toHaveText(registeredPatient.category!.name);
    await expect(patientsPage.cardStatus).toHaveText('Admitted');
  });

  test('shows "not found" for an unknown patient', async ({ patientsPage }) => {
    await patientsPage.search(999_999_999_999);

    await expect(patientsPage.searchError).toHaveText('Patient not found');
    await expect(patientsPage.cardName).toBeHidden();
  });

  test('shows a friendly error when the backend fails', async ({ page, patientsPage }) => {
    // Network mocking: forces the 500 path that the real API almost never returns.
    await page.route('**/v2/pet/*', (route) => route.fulfill({ status: 500, body: 'boom' }));

    await patientsPage.search(42);

    await expect(patientsPage.searchError).toHaveText('Unexpected error (HTTP 500)');
  });
});
