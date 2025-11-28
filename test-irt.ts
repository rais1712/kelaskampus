// test-irt.ts
// ✅ FIXED: Use explicit file extensions

import { IRTEngine } from './server/lib/irt/irtEngine.js'; // ✅ Add .js extension
import { IRTBatchProcessor } from './server/lib/irt/irtBatchProcessor.js'; // ✅ Add .js extension
import type { CategoryResponses } from './server/lib/irt/irtTypes.js'; // ✅ Add .js extension

// Sample test data
const testData: CategoryResponses[] = [
  {
    kategoriId: 'kpu',
    kategoriName: 'Kemampuan Penalaran Umum',
    responses: [
      {
        questionId: 'q1',
        isCorrect: true,
        kategoriId: 'kpu',
        irtParams: { difficulty: 0.5, discrimination: 1.2, guessing: 0.25 }
      },
      {
        questionId: 'q2',
        isCorrect: true,
        kategoriId: 'kpu',
        irtParams: { difficulty: 0.8, discrimination: 1.5, guessing: 0.25 }
      },
      {
        questionId: 'q3',
        isCorrect: false,
        kategoriId: 'kpu',
        irtParams: { difficulty: 1.2, discrimination: 1.3, guessing: 0.25 }
      },
      {
        questionId: 'q4',
        isCorrect: true,
        kategoriId: 'kpu',
        irtParams: { difficulty: -0.2, discrimination: 1.1, guessing: 0.25 }
      }
    ]
  },
  {
    kategoriId: 'pm',
    kategoriName: 'Penalaran Matematika',
    responses: [
      {
        questionId: 'q5',
        isCorrect: true,
        kategoriId: 'pm',
        irtParams: { difficulty: 0.3, discrimination: 1.1, guessing: 0.25 }
      },
      {
        questionId: 'q6',
        isCorrect: false,
        kategoriId: 'pm',
        irtParams: { difficulty: 1.5, discrimination: 1.4, guessing: 0.25 }
      },
      {
        questionId: 'q7',
        isCorrect: true,
        kategoriId: 'pm',
        irtParams: { difficulty: 0.1, discrimination: 1.2, guessing: 0.25 }
      }
    ]
  }
];

console.log('🧪 Testing IRT Engine...\n');
console.log('📦 Test Data:');
console.log(`  Categories: ${testData.length}`);
console.log(`  Total Responses: ${testData.reduce((sum, cat) => sum + cat.responses.length, 0)}`);
console.log('');

const result = IRTBatchProcessor.processBatch(testData);

console.log('📊 RESULTS:');
console.log('─'.repeat(50));
console.log('\n🎯 Overall Performance:');
console.log(`  Theta: ${result.overallAbility.theta.toFixed(3)}`);
console.log(`  Percentile: ${result.overallAbility.percentile}th`);
console.log(`  Scaled Score: ${result.overallScore}/100`);
console.log(`  Standard Error: ${result.overallAbility.standardError.toFixed(3)}`);
console.log(`  Reliability: ${(result.overallAbility.reliability * 100).toFixed(1)}%`);
console.log(`  Performance Level: ${result.performanceLevel.level}`);

console.log('\n📚 Category Breakdown:');
result.categoryResults.forEach(cat => {
  console.log(`\n  ${cat.kategoriName}:`);
  console.log(`    Theta: ${cat.ability.theta.toFixed(3)} (Percentile: ${cat.ability.percentile})`);
  console.log(`    Score: ${cat.correctCount}/${cat.maxScore} (${cat.percentage.toFixed(1)}%)`);
  console.log(`    SE: ${cat.ability.standardError.toFixed(3)}`);
});

console.log('\n💡 Insights:');
if (result.insights.strengths.length > 0) {
  console.log('\n  Strengths:');
  result.insights.strengths.forEach((s, i) => console.log(`    ${i + 1}. ${s}`));
}
if (result.insights.weaknesses.length > 0) {
  console.log('\n  Weaknesses:');
  result.insights.weaknesses.forEach((w, i) => console.log(`    ${i + 1}. ${w}`));
}
if (result.insights.recommendations.length > 0) {
  console.log('\n  Recommendations:');
  result.insights.recommendations.forEach((r, i) => console.log(`    ${i + 1}. ${r}`));
}

console.log('\n' + '─'.repeat(50));
console.log('✅ IRT Engine test PASSED!\n');
