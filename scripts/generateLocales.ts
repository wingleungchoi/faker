/**
 * This file contains a script that can be used to update the following files:
 *
 * - `src/locale/<locale>.ts`
 * - `src/locales/<locale>/index.ts`
 * - `src/locales/<locale>/<module...>/index.ts`
 * - `src/docs/api/localization.md`
 *
 * If you wish to edit all/specific locale data files you can do so using the
 * `updateLocaleFileHook()` method.
 * Please remember to not commit your temporary update code.
 *
 * Run this script using `pnpm run generate:locales`
 */
import { lstatSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Options } from 'prettier';
import { format } from 'prettier';
import options from '../.prettierrc.cjs';
import { faker } from '../src';
import type { LocaleDefinition } from '../src/definitions';
import { DEFINITIONS } from '../src/definitions';

// Constants

const pathRoot = resolve(__dirname, '..');
const pathLocale = resolve(pathRoot, 'src', 'locale');
const pathLocales = resolve(pathRoot, 'src', 'locales');
const pathLocalesIndex = resolve(pathLocales, 'index.ts');
const pathDocsApiLocalization = resolve(
  pathRoot,
  'docs',
  'api',
  'localization.md'
);

const prettierTsOptions: Options = { ...options, parser: 'typescript' };
const prettierMdOptions: Options = { ...options, parser: 'markdown' };

const scriptCommand = 'pnpm run generate:locales';

const autoGeneratedCommentHeader = `/*
 * This file is automatically generated.
 * Run '${scriptCommand}' to update.
 */`;

// Helper functions

function removeIndexTs(files: string[]): string[] {
  const index = files.indexOf('index.ts');
  if (index !== -1) {
    files.splice(index, 1);
  }
  return files;
}

function removeTsSuffix(files: string[]): string[] {
  return files.map((file) => file.replace('.ts', ''));
}

function escapeImport(module: string): string {
  if (['name', 'type', 'switch'].includes(module)) {
    return `${module}_`;
  } else {
    return module;
  }
}

function escapeField(module: string): string {
  if (['name', 'type', 'switch'].includes(module)) {
    return `${module}: ${module}_`;
  } else {
    return module;
  }
}

function containsAll(checked?: string[], expected?: string[]): boolean {
  if (expected == null || checked == null) {
    return true;
  }
  return expected.every((c) => checked.includes(c));
}

function generateLocaleFile(locale: string): void {
  faker.setLocale(locale);

  const localeOrder = faker.localeOrder;

  let content = `
      ${autoGeneratedCommentHeader}

      import { Faker } from '../faker';
      ${localeOrder
        .map((entry) => `import ${entry} from '../locales/${entry}';`)
        .join('\n')}

      const faker = new Faker({
        localeOrder: ${JSON.stringify(localeOrder)},
        locales: {
          ${localeOrder.map((entry) => `${entry},`).join('\n')}
        },
      });

      export = faker;
      `;

  content = format(content, prettierTsOptions);
  writeFileSync(resolve(pathLocale, `${locale}.ts`), content);
}

function tryLoadLocalesMainIndexFile(pathModules: string): LocaleDefinition {
  let localeDef: LocaleDefinition;
  // This call might fail, if the module setup is broken.
  // Unfortunately, we try to fix it with this script
  // Thats why have a fallback logic here, we only need the title and separator anyway
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    localeDef = require(pathModules).default;
  } catch (e) {
    try {
      console.log(
        `Failed to load ${pathModules}. Attempting manual parse instead...`
      );
      const localeIndex = readFileSync(
        resolve(pathModules, 'index.ts'),
        'utf-8'
      );
      localeDef = {
        title: localeIndex.match(/title: '(.*)',/)[1],
        separator: localeIndex.match(/separator: '(.*)',/)?.[1],
      };
    } catch {
      console.error(`Failed to load ${pathModules} or manually parse it.`, e);
    }
  }
  return localeDef;
}

function generateLocalesIndexFile(
  path: string,
  name: string,
  type: string,
  depth: number,
  extra: string = '',
  expected?: string[]
): void {
  let modules = readdirSync(path);
  modules = removeIndexTs(modules);
  modules = removeTsSuffix(modules);
  const importType = type;
  if (!containsAll(modules, expected)) {
    type = `Partial<${type}>`;
  }
  let fieldType = '';
  let asType = '';
  if (!containsAll(expected, modules)) {
    asType = ` as ${type}`;
  } else if (type !== 'any') {
    fieldType = `: ${type}`;
  }
  let content = `${autoGeneratedCommentHeader}\n`;
  if (type !== 'any') {
    content += `  import type { ${importType.replace(
      /\[.*/,
      ''
    )} } from '..${'/..'.repeat(depth)}';\n`;
  }
  content += `  ${modules
    .map((module) => `import ${escapeImport(module)} from './${module}';`)
    .join('\n')}

      const ${name}${fieldType} = {
        ${extra}
        ${modules.map((module) => `${escapeField(module)},`).join('\n')}
      }${asType};

      export default ${name};
      `;
  content = format(content, prettierTsOptions);
  writeFileSync(resolve(path, 'index.ts'), content);
}

function generateRecursiveModuleIndexes(
  path: string,
  name: string,
  definition: string,
  depth: number,
  extra?: string,
  moduleFiles?: string[]
): void {
  generateLocalesIndexFile(path, name, definition, depth, extra, moduleFiles);

  let submodules = readdirSync(path);
  submodules = removeIndexTs(submodules);
  for (const submodule of submodules) {
    const pathModule = resolve(path, submodule);
    updateLocaleFile(pathModule);
    // Only process sub folders recursively
    if (lstatSync(pathModule).isDirectory()) {
      let moduleDefinition =
        definition === 'any' ? 'any' : `${definition}['${submodule}']`;
      let moduleFiles: string[];

      // Overwrite types of src/locales/<locale>/<module>/index.ts for known DEFINITIONS
      if (depth === 1) {
        moduleFiles = DEFINITIONS[submodule];
        if (moduleFiles == null) {
          moduleDefinition = 'any';
        } else {
          moduleDefinition = `${submodule.replace(/(^|_)([a-z])/g, (s) =>
            s.replace('_', '').toUpperCase()
          )}Definitions`;
        }
      }

      // Recursive
      generateRecursiveModuleIndexes(
        pathModule,
        submodule,
        moduleDefinition,
        depth + 1,
        undefined,
        moduleFiles
      );
    }
  }
}

/**
 * Intermediate helper function to allow selectively updating locale data files.
 * Use the `updateLocaleFileHook()` method to temporarily add your custom per file processing/update logic.
 *
 * @param filePath The full file path to the file.
 */
function updateLocaleFile(filePath: string): void {
  if (lstatSync(filePath).isFile()) {
    const pathParts = filePath
      .substring(pathLocales.length + 1, filePath.length - 3)
      .split(/[\\\/]/);
    const locale = pathParts[0];
    pathParts.splice(0, 1);
    updateLocaleFileHook(filePath, locale, pathParts);
  }
}

/**
 * Use this hook method to selectively update locale data files (not for index.ts files).
 * This method is intended to be temporarily overwritten for one-time updates.
 *
 * @param filePath The full file path to the file.
 * @param locale The locale for that file.
 * @param localePath The locale path parts (after the locale).
 */
function updateLocaleFileHook(
  filePath: string,
  locale: string,
  localePath: string[]
): void {
  if (filePath === 'never') {
    console.log(`${filePath} <-> ${locale} @ ${localePath.join(' -> ')}`);
  }
}

// Start of actual logic

const locales = readdirSync(pathLocales);
removeIndexTs(locales);

let localeIndexImports = "import type { LocaleDefinition } from '..';\n";
let localeIndexType = 'export type KnownLocale =\n';
let localeIndexLocales = 'const locales: KnownLocales = {\n';

let localizationLocales = '| Locale | Name |\n| :--- | :--- |\n';

for (const locale of locales) {
  const pathModules = resolve(pathLocales, locale);

  const localeDef = tryLoadLocalesMainIndexFile(pathModules);
  // We use a fallback here to at least generate a working file.
  const localeTitle = localeDef?.title ?? `TODO: Insert Title for ${locale}`;
  const localeSeparator = localeDef?.separator;

  localeIndexImports += `import ${locale} from './${locale}';\n`;
  localeIndexType += `  | '${locale}'\n`;
  localeIndexLocales += `  ${locale},\n`;
  localizationLocales += `| ${locale} | ${localeTitle} |\n`;

  // src/locale/<locale>.ts
  generateLocaleFile(locale);

  // src/locales/**/index.ts
  const separator = localeSeparator ? `\nseparator: '${localeSeparator}',` : '';

  generateRecursiveModuleIndexes(
    pathModules,
    locale,
    'LocaleDefinition',
    1,
    `title: '${localeTitle}',${separator}`
  );
}

// src/locales/index.ts

let indexContent = `
  ${autoGeneratedCommentHeader}

  ${localeIndexImports}

  ${localeIndexType};

  export type KnownLocales = Record<KnownLocale, LocaleDefinition>;

  ${localeIndexLocales}};

  export default locales;
  `;

indexContent = format(indexContent, prettierTsOptions);
writeFileSync(pathLocalesIndex, indexContent);

// docs/api/localization.md

localizationLocales = format(localizationLocales, prettierMdOptions);

let localizationContent = readFileSync(pathDocsApiLocalization, 'utf-8');
localizationContent = localizationContent.replace(
  /(^<!-- LOCALES-AUTO-GENERATED-START -->$).*(^<!-- LOCALES-AUTO-GENERATED-END -->$)/gms,
  `$1\n\n<!-- Run '${scriptCommand}' to update. -->\n\n${localizationLocales}\n$2`
);
writeFileSync(pathDocsApiLocalization, localizationContent);
