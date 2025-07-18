'use server';

import { generateFailureReport, FailureReportInput, FailureReportOutput } from '@/ai/flows/generate-failure-report';
import { generateImprovementReport, ImprovementReportInput, ImprovementReportOutput } from '@/ai/flows/generate-improvement-report';

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

export async function generateImprovementReportAction(input: ImprovementReportInput): Promise<ImprovementReportOutput> {
  if (!input.commentedTestCases || input.commentedTestCases.length === 0) {
    return { improvementAnalysis: 'No test cases with comments were provided to generate an analysis.' };
  }
  
  try {
    const result = await generateImprovementReport(input);
    return result;
  } catch (error) {
    console.error('Error generating improvement report:', error);
    // Throwing an error allows the client-side to catch it and display a proper message.
    throw new Error('An unexpected error occurred while generating the report.');
  }
}
