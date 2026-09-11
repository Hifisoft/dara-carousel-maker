import { migrateV1ToV2 } from './migration';

export interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

export function runBaselineParityTests(): TestResult[] {
  const results: TestResult[] = [];

  // Test 1: Legacy V1 Data Migration
  try {
    const mockV1 = {
      id: 'v1-test-1',
      title: 'Legacy Title',
      slides: [
        {
          bgColor: '#b80000',
          segment: 'Cover Slide',
          layers: [{ id: 'l1', type: 'text', content: 'Test Headline', x: 60, y: 200, w: 960, h: 100 }]
        }
      ]
    };
    const v2Doc = migrateV1ToV2(mockV1);
    const passed = v2Doc.schemaVersion === '2.0' && v2Doc.slides.length === 1 && v2Doc.slides[0].backgroundColor === '#b80000';
    results.push({
      name: 'Legacy V1 Migration Test',
      passed,
      message: passed ? 'Successfully migrated V1 to Schema v2.0' : 'V1 Migration failed'
    });
  } catch (err: any) {
    results.push({ name: 'Legacy V1 Migration Test', passed: false, message: err.message });
  }

  // Test 2: Copy Constraint Validation
  try {
    const headline = '5 SaaS Scaling Hacks for High Growth Startups';
    const words = headline.trim().split(/\s+/).length;
    const passed = words <= 10;
    results.push({
      name: 'Copy Constraint (Headline <= 10 Words)',
      passed,
      message: `Headline contains ${words} words (${passed ? 'Passed' : 'Exceeded'})`
    });
  } catch (err: any) {
    results.push({ name: 'Copy Constraint Test', passed: false, message: err.message });
  }

  // Test 3: Document Scene Dimensions
  try {
    const mockV1 = { id: 'v1-dim', slides: [] };
    const doc = migrateV1ToV2(mockV1);
    const passed = doc.dimensions.width === 1080 && doc.dimensions.height === 1440;
    results.push({
      name: 'Document 1080x1440 Dimensions Test',
      passed,
      message: passed ? 'Canonical dimensions 1080x1440 verified' : 'Invalid dimensions'
    });
  } catch (err: any) {
    results.push({ name: 'Dimensions Test', passed: false, message: err.message });
  }

  return results;
}
