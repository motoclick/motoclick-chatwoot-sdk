import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');
const common = { entryPoints: ['src/index.ts'], bundle: true, target: 'es2019', logLevel: 'info' };

const builds = [
  // npm: import { MotoclickSupport } from '@motoclick/support'
  { ...common, format: 'esm', outfile: 'dist/index.js' },
  { ...common, format: 'cjs', outfile: 'dist/index.cjs' },
  // <script src="motoclick-support.js"> → window.MotoclickSupport
  {
    ...common,
    format: 'iife',
    globalName: '__mcs',
    footer: { js: 'window.MotoclickSupport = __mcs.MotoclickSupport;' },
    minify: true,
    outfile: 'dist/motoclick-support.js',
  },
];

if (watch) {
  for (const b of builds) (await esbuild.context(b)).watch();
} else {
  await Promise.all(builds.map((b) => esbuild.build(b)));
}
