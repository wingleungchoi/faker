/*
 * This file is automatically generated.
 * Run 'pnpm run generate:locales' to update.
 */

import { Faker } from '../faker';
import en from '../locales/en';
import fr from '../locales/fr';
import fr_BE from '../locales/fr_BE';

const faker = new Faker({
  localeOrder: ['fr_BE', 'fr', 'en'],
  locales: {
    fr_BE,
    fr,
    en,
  },
});

export = faker;
