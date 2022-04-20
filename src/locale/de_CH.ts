/*
 * This file is automatically generated.
 * Run 'pnpm run generate:locales' to update.
 */

import { Faker } from '../faker';
import de from '../locales/de';
import de_CH from '../locales/de_CH';
import en from '../locales/en';

const faker = new Faker({
  localeOrder: ['de_CH', 'de', 'en'],
  locales: {
    de_CH,
    de,
    en,
  },
});

export = faker;
