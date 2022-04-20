/*
 * This file is automatically generated.
 * Run 'pnpm run generate:locales' to update.
 */

import { Faker } from '../faker';
import en from '../locales/en';
import ro from '../locales/ro';

const faker = new Faker({
  localeOrder: ['ro', 'en'],
  locales: {
    ro,
    en,
  },
});

export = faker;
