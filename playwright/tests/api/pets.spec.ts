import { test, expect } from '../../fixtures/test';
import { buildPatient, uniqueId } from '../../utils/testData';

test.describe('Patients API (/pet)', () => {
  test('creates a patient and returns it unchanged @smoke', async ({ petApi }) => {
    const patient = buildPatient({ status: 'pending' });

    const res = await petApi.create(patient);

    expect(res.status()).toBe(200);
    expect(await res.json()).toMatchObject({
      id: patient.id,
      name: patient.name,
      category: { name: patient.category!.name },
      status: 'pending',
    });
    await petApi.delete(patient.id);
  });

  test('reads a registered patient by id @smoke', async ({ petApi, registeredPatient }) => {
    const res = await petApi.get(registeredPatient.id);

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.name).toBe(registeredPatient.name);
    expect(body.photoUrls).toEqual(expect.any(Array));
  });

  test('updates the status when a patient is discharged', async ({ petApi, registeredPatient }) => {
    const res = await petApi.update({ ...registeredPatient, status: 'sold' });

    expect(res.status()).toBe(200);
    // Read back instead of trusting the PUT echo: the echo proves nothing about persistence.
    await expect
      .poll(async () => (await (await petApi.get(registeredPatient.id)).json()).status, { timeout: 10_000 })
      .toBe('sold');
  });

  test('deleted patient is no longer found', async ({ petApi }) => {
    const patient = buildPatient();
    await petApi.create(patient);
    await petApi.waitUntilVisible(patient.id);

    expect((await petApi.delete(patient.id)).status()).toBe(200);
    await expect.poll(async () => (await petApi.get(patient.id)).status(), { timeout: 10_000 }).toBe(404);
  });

  test('unknown id returns 404 with an error body', async ({ petApi }) => {
    const res = await petApi.get(uniqueId());

    expect(res.status()).toBe(404);
    expect(await res.json()).toMatchObject({ type: 'error', message: 'Pet not found' });
  });

  test('findByStatus only returns patients with that status', async ({ petApi }) => {
    const res = await petApi.findByStatus('pending');

    expect(res.status()).toBe(200);
    const pets: { status: string }[] = await res.json();
    expect(pets.length).toBeGreaterThan(0);
    expect(pets.every((p) => p.status === 'pending')).toBe(true);
  });

  test('responds within the latency budget', async ({ petApi, registeredPatient }) => {
    const started = Date.now();
    await petApi.get(registeredPatient.id);
    // Generous budget for a public demo API; on a real project this comes from the SLO.
    expect(Date.now() - started).toBeLessThan(3_000);
  });
});
