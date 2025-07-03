'use server';

import { generateFailureReport, FailureReportInput, FailureReportOutput } from '@/ai/flows/generate-failure-report';

export async function generateReportAction(input: FailureReportInput): Promise<FailureReportOutput> {
  if (!input.failedTestCases || input.failedTestCases.length === 0) {
    return { impactAnalysis: 'No failed test cases were provided to generate an impact analysis.' };
  }
  
  try {
    const result = await generateFailureReport(input);
    return result;
  } catch (error) {
    console.error('Error generating failure report:', error);
    // Throwing an error allows the client-side to catch it and display a proper message.
    throw new Error('An unexpected error occurred while generating the report.');
  }
}
