/*
 * This file is automatically generated.
 * Run 'pnpm run generate:locales' to update.
 */

import { Faker } from '../faker';
import en from '../locales/en';
import hr from '../locales/hr';

const faker = new Faker({
  localeOrder: ['hr', 'en'],
  locales: {
    hr,
    en,
  },
});

export = faker;
