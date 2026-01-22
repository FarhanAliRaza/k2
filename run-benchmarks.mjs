#!/usr/bin/env node
import { launch } from 'puppeteer-core';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Try to find Chrome/Chromium
async function findChrome() {
  const paths = [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
    'chromium',
    'google-chrome'
  ];

  for (const path of paths) {
    try {
      await execAsync(`which ${path}`);
      return path;
    } catch (e) {
      continue;
    }
  }
  throw new Error('Chrome/Chromium not found');
}

const benchmarks = ['create-1000', 'select-row', 'swap-1000', 'clear-1000'];
const frameworks = ['k2', 'alpine'];

async function runBenchmark(browser, framework, benchmark) {
  const page = await browser.newPage();

  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout running ${framework}/${benchmark}`));
    }, 30000);

    page.on('pageerror', err => {
      console.error(`Error in ${framework}/${benchmark}:`, err);
    });

    // Listen for benchmark results
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Average:')) {
        console.log(`  ${framework}/${benchmark}: ${text}`);
      }
    });

    await page.goto(`http://localhost:8080/benchmarks/${framework}/${benchmark}.html?autorun=true`);

    // Wait for benchmark to complete
    page.exposeFunction('benchmarkComplete', (data) => {
      clearTimeout(timeout);
      resolve(data);
    });

    // Wait for postMessage
    await page.evaluateOnNewDocument(() => {
      window.addEventListener('message', (event) => {
        if (event.data.type === 'benchmark-result') {
          window.benchmarkComplete(event.data);
        }
      });
    });

    // Wait for result
    setTimeout(async () => {
      try {
        const result = await page.evaluate(() => {
          const avgEl = document.getElementById('average');
          return avgEl ? avgEl.textContent : 'N/A';
        });
        clearTimeout(timeout);
        await page.close();
        resolve({ framework, benchmark, result });
      } catch (e) {
        clearTimeout(timeout);
        await page.close();
        reject(e);
      }
    }, 10000);
  });
}

async function main() {
  console.log('🚀 Running K2 vs Alpine.js benchmarks...\n');

  const chromePath = await findChrome().catch(() => null);
  if (!chromePath) {
    console.error('❌ Chrome/Chromium not found. Please install it to run benchmarks.');
    process.exit(1);
  }

  const browser = await launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const results = {};

  for (const benchmark of benchmarks) {
    console.log(`\n📊 ${benchmark}:`);
    results[benchmark] = {};

    for (const framework of frameworks) {
      try {
        const result = await runBenchmark(browser, framework, benchmark);
        results[benchmark][framework] = result.result;
        console.log(`  ✅ ${framework}: ${result.result}`);
      } catch (err) {
        console.error(`  ❌ ${framework}: ${err.message}`);
        results[benchmark][framework] = 'Error';
      }
    }
  }

  await browser.close();

  console.log('\n\n📈 Summary:');
  console.log('═'.repeat(60));
  for (const [benchmark, frameworks] of Object.entries(results)) {
    console.log(`\n${benchmark}:`);
    for (const [framework, result] of Object.entries(frameworks)) {
      console.log(`  ${framework.padEnd(10)}: ${result}`);
    }
  }
}

main().catch(console.error);
