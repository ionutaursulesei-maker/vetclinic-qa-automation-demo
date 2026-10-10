import { test as base } from '@playwright/test';
import { Pet, PetApi } from '../utils/petApi';
import { buildPatient } from '../utils/testData';
import { PatientsPage } from '../pages/PatientsPage';

type Fixtures = {
  petApi: PetApi;
  /** A patient created through the API before the test and deleted after it. */
  registeredPatient: Pet;
  patientsPage: PatientsPage;
};

export const test = base.extend<Fixtures>({
  petApi: async ({ playwright }, use) => {
    // Own request context so UI tests can also seed data through the API.
    const request = await playwright.request.newContext({
      baseURL: process.env.API_URL ?? 'https://petstore.swagger.io/v2/',
      extraHTTPHeaders: { Accept: 'application/json' },
    });
    await use(new PetApi(request));
    await request.dispose();
  },

  registeredPatient: async ({ petApi }, use) => {
    const patient = buildPatient();
    const res = await petApi.create(patient);
    if (!res.ok()) throw new Error(`Setup failed: POST /pet returned ${res.status()}`);
    await petApi.waitUntilVisible(patient.id);
    await use(patient);
    await petApi.delete(patient.id); // teardown runs even if the test fails
  },

  patientsPage: async ({ page }, use) => {
    await use(new PatientsPage(page));
  },
});

export { expect } from '@playwright/test';
