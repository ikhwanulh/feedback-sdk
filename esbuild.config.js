import * as esbuild from 'esbuild';
import * as zlib from 'zlib';
import * as fs from 'fs';

async function build() {
  const commonOptions = {
    entryPoints: ['src/index.ts'],
    bundle: true,
    minify: true,
    sourcemap: true,
    target: ['es2020', 'chrome80', 'safari13', 'firefox75'],
  };

  // 1. ESM Build
  await esbuild.build({
    ...commonOptions,
    format: 'esm',
    outfile: 'dist/feedback-sdk.esm.js',
  });

  // 2. CommonJS Build
  await esbuild.build({
    ...commonOptions,
    format: 'cjs',
    outfile: 'dist/feedback-sdk.cjs.js',
  });

  // 3. IIFE (CDN standalone script tag) Build
  await esbuild.build({
    ...commonOptions,
    format: 'iife',
    globalName: 'FeedbackSDK',
    outfile: 'dist/feedback-sdk.iife.js',
  });

  // Check gzipped bundle size to enforce < 12 KB invariant
  const iifeContent = fs.readFileSync('dist/feedback-sdk.iife.js');
  const gzipped = zlib.gzipSync(iifeContent);
  const sizeKb = (gzipped.length / 1024).toFixed(2);

  console.log(`✅ Feedback SDK build completed successfully.`);
  console.log(`📦 Standalone CDN IIFE size (gzipped): ${sizeKb} KB (Constraint: < 12.0 KB)`);

  if (gzipped.length > 12 * 1024) {
    console.error(`❌ INVARIANT VIOLATION: SDK bundle exceeds 12 KB gzipped! (${sizeKb} KB)`);
    process.exit(1);
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
