/*
 * This file is automatically generated.
 * Run 'pnpm run generate:locales' to update.
 */

import { Faker } from '../faker';
import en from '../locales/en';
import en_GH from '../locales/en_GH';

const faker = new Faker({
  localeOrder: ['en_GH', 'en'],
  locales: {
    en_GH,
    en,
  },
});

export = faker;
