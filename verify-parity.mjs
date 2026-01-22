#!/usr/bin/env node
import { readFileSync } from 'fs';

const benchmarks = [
  'create-1000',
  'create-10000',
  'select-row',
  'swap-1000',
  'clear-1000',
  'append-1000',
  'remove-row'
];

console.log('🔍 Verifying K2 ↔ Alpine.js Template Parity\n');
console.log('═'.repeat(70));

let allMatch = true;

for (const benchmark of benchmarks) {
  const k2Path = `benchmarks/k2/${benchmark}.html`;
  const alpinePath = `benchmarks/alpine/${benchmark}.html`;

  try {
    const k2Html = readFileSync(k2Path, 'utf-8');
    const alpineHtml = readFileSync(alpinePath, 'utf-8');

    // Extract the x-data div and template section
    const k2Section = k2Html.match(/<div[^>]*x-data[^>]*>[\s\S]*?<template[\s\S]*?<\/template>[\s\S]*?<\/div>/);
    const alpineSection = alpineHtml.match(/<div[^>]*x-data[^>]*>[\s\S]*?<template[\s\S]*?<\/template>[\s\S]*?<\/div>/);

    if (!k2Section || !alpineSection) {
      console.log(`\n❌ ${benchmark}: Template structure not found`);
      allMatch = false;
      continue;
    }

    // Normalize whitespace for comparison
    const k2Normalized = k2Section[0].replace(/\s+/g, ' ').trim();
    const alpineNormalized = alpineSection[0].replace(/\s+/g, ' ').trim();

    const matches = k2Normalized === alpineNormalized;

    if (matches) {
      console.log(`\n✅ ${benchmark}: Templates are IDENTICAL`);
    } else {
      console.log(`\n⚠️  ${benchmark}: Templates differ`);
      console.log('\n  K2 template:');
      console.log('  ' + k2Section[0].substring(0, 150) + '...');
      console.log('\n  Alpine template:');
      console.log('  ' + alpineSection[0].substring(0, 150) + '...');
      allMatch = false;
    }

    // Extract specific directives
    const directives = ['x-for', 'x-text', ':key', ':class', '@click'];
    const k2Directives = {};
    const alpineDirectives = {};

    for (const directive of directives) {
      const pattern = new RegExp(`${directive}="([^"]*)"`, 'g');
      k2Directives[directive] = [...k2Section[0].matchAll(pattern)].map(m => m[1]);
      alpineDirectives[directive] = [...alpineSection[0].matchAll(pattern)].map(m => m[1]);
    }

    console.log('  Directives:');
    for (const directive of directives) {
      const k2Val = k2Directives[directive][0] || 'none';
      const alpineVal = alpineDirectives[directive][0] || 'none';
      if (k2Val !== 'none' || alpineVal !== 'none') {
        const match = k2Val === alpineVal ? '✓' : '✗';
        console.log(`    ${match} ${directive}: K2="${k2Val}" Alpine="${alpineVal}"`);
      }
    }

  } catch (err) {
    console.log(`\n❌ ${benchmark}: Error - ${err.message}`);
    allMatch = false;
  }
}

console.log('\n' + '═'.repeat(70));
if (allMatch) {
  console.log('\n🎉 SUCCESS: K2 templates match Alpine.js syntax exactly!\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Some differences found\n');
  process.exit(1);
}
