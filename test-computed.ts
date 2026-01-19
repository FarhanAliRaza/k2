/**
 * Test the computed function extraction logic
 */

// Simulate what happens in createScopeFromString
function testComputedExtraction() {
  const dataStr = "{ a: 3, b: 4, product: () => a * b }";

  // Parse to get the object
  const tempData = new Function(`return (${dataStr})`)();

  console.log('Parsed data:', tempData);

  for (const [key, value] of Object.entries(tempData)) {
    if (typeof value === 'function') {
      const fnStr = (value as () => unknown).toString();
      console.log(`\nFunction "${key}":`);
      console.log(`  Original: ${fnStr}`);

      // Extract body
      if (fnStr.includes('=>')) {
        const arrowIndex = fnStr.indexOf('=>');
        let bodyExpr = fnStr.slice(arrowIndex + 2).trim();
        console.log(`  Body: ${bodyExpr}`);

        // Now test evaluating it with mock scope
        const mockScope = {
          get(k: string) {
            if (k === 'a') return 3;
            if (k === 'b') return 4;
            return undefined;
          }
        };

        const getterCode = ['a', 'b'].map(k => `get ${k}() { return __scope__.get('${k}'); }`).join(',\n');
        const code = `
          with ({
            ${getterCode}
          }) {
            return (${bodyExpr});
          }
        `;
        console.log(`  Generated code:\n${code}`);

        const fn = new Function('__scope__', code);
        const result = fn(mockScope);
        console.log(`  Result: ${result}`);
        console.log(`  Expected: 12`);
        console.log(`  ✓ Pass: ${result === 12}`);
      }
    }
  }
}

testComputedExtraction();
