import { Locator, Page } from '@playwright/test';

/** Page object built on user-facing locators (role/label), not CSS – survives markup refactors. */
export class PatientsPage {
  readonly nameInput: Locator;
  readonly speciesSelect: Locator;
  readonly statusSelect: Locator;
  readonly registerButton: Locator;
  readonly registerResult: Locator;
  readonly patientIdInput: Locator;
  readonly searchButton: Locator;
  readonly cardName: Locator;
  readonly cardSpecies: Locator;
  readonly cardStatus: Locator;
  readonly searchError: Locator;

  constructor(private readonly page: Page) {
    const register = page.getByRole('form', { name: 'Register patient' });
    this.nameInput = register.getByLabel('Patient name');
    this.speciesSelect = register.getByLabel('Species');
    this.statusSelect = register.getByLabel('Status');
    this.registerButton = register.getByRole('button', { name: 'Register' });
    this.registerResult = register.getByRole('status');

    const search = page.getByRole('form', { name: 'Find patient' });
    this.patientIdInput = search.getByLabel('Patient ID');
    this.searchButton = search.getByRole('button', { name: 'Search' });

    this.cardName = page.locator('#card-name');
    this.cardSpecies = page.locator('#card-species');
    this.cardStatus = page.locator('#card-status');
    this.searchError = page.getByRole('alert');
  }

  async open() {
    await this.page.goto('/');
  }

  async register(name: string, species: string, statusLabel: string) {
    await this.nameInput.fill(name);
    await this.speciesSelect.selectOption(species);
    await this.statusSelect.selectOption({ label: statusLabel });
    await this.registerButton.click();
  }

  async search(id: number | string) {
    await this.patientIdInput.fill(String(id));
    await this.searchButton.click();
  }
}
