import { APIRequestContext, APIResponse, expect } from '@playwright/test';

export type PetStatus = 'available' | 'pending' | 'sold';

export interface Pet {
  id: number;
  name: string;
  category?: { id: number; name: string };
  photoUrls: string[];
  tags?: { id: number; name: string }[];
  status: PetStatus;
}

/** Thin typed client over Playwright's APIRequestContext – the TS twin of the C# Refit client. */
export class PetApi {
  constructor(private readonly request: APIRequestContext) {}

  create(pet: Pet): Promise<APIResponse> {
    return this.request.post('pet', { data: pet });
  }

  get(id: number): Promise<APIResponse> {
    return this.request.get(`pet/${id}`);
  }

  update(pet: Pet): Promise<APIResponse> {
    return this.request.put('pet', { data: pet });
  }

  delete(id: number): Promise<APIResponse> {
    return this.request.delete(`pet/${id}`);
  }

  findByStatus(status: PetStatus): Promise<APIResponse> {
    return this.request.get('pet/findByStatus', { params: { status } });
  }

  /**
   * Petstore is a shared, eventually consistent public backend: a GET right after a POST
   * sometimes returns 404. Instead of sleeping or blindly retrying the whole test,
   * we poll the one call that is allowed to lag, with a bounded timeout.
   */
  async waitUntilVisible(id: number, timeout = 10_000): Promise<Pet> {
    let body: Pet | undefined;
    await expect
      .poll(
        async () => {
          const res = await this.get(id);
          if (res.ok()) body = await res.json();
          return res.status();
        },
        { timeout, intervals: [250, 500, 1_000], message: `pet ${id} never became readable` },
      )
      .toBe(200);
    return body!;
  }
}
