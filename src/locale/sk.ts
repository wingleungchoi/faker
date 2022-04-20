/*
 * This file is automatically generated.
 * Run 'pnpm run generate:locales' to update.
 */

import { Faker } from '../faker';
import en from '../locales/en';
import sk from '../locales/sk';

const faker = new Faker({
  localeOrder: ['sk', 'en'],
  locales: {
    sk,
    en,
  },
});

export = faker;
