// src/ai/flows/generate-failure-report.ts
'use server';

/**
 * @fileOverview Generates a failure report from a list of failed test cases.
 *
 * - generateFailureReport - A function that generates the failure report.
 * - FailureReportInput - The input type for the generateFailureReport function.
 * - FailureReportOutput - The return type for the generateFailureReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FailureReportInputSchema = z.object({
  reportDescription: z.string().describe('An overall description or summary for the failure report.'),
  failedTestCases: z.array(
    z.object({
      proceso: z.string().describe('The process the test case belongs to.'),
      casoPrueba: z.string().describe('The test case ID.'),
      descripcion: z.string().describe('The description of the test case.'),
      datosPrueba: z.string().describe('The test data used in the test case.'),
      pasoAPaso: z.string().describe('The steps to reproduce the test case.'),
      resultadoEsperado: z.string().describe('The expected result of the test case.'),
      evidencia: z.string().describe('A link or reference to the evidence for the test case.'),
      comentarios: z.string().describe('Comments from the QA engineer explaining why it failed.'),
      estado: z.literal('Fallido').describe('The status of the test case, which must be "Fallido".'),
    })
  ).describe('An array of failed test cases.'),
});
export type FailureReportInput = z.infer<typeof FailureReportInputSchema>;

const FailureReportOutputSchema = z.object({
  report: z.string().describe('The generated failure report in plain text.'),
});
export type FailureReportOutput = z.infer<typeof FailureReportOutputSchema>;

export async function generateFailureReport(input: FailureReportInput): Promise<FailureReportOutput> {
  return generateFailureReportFlow(input);
}

const failureReportPrompt = ai.definePrompt({
  name: 'failureReportPrompt',
  input: {schema: FailureReportInputSchema},
  output: {schema: FailureReportOutputSchema},
  prompt: `You are a QA report generator. Your task is to create a comprehensive failure report based on the provided data. The report should be in clean plain text, using indentation and clear headings.

First, present this overall summary at the top of the report:
REPORT SUMMARY
---
{{reportDescription}}
---

Next, detail each of the failed test cases.

{{#each failedTestCases}}
========================================
TEST CASE FAILED: {{this.casoPrueba}} - {{this.proceso}}
========================================

Description:
{{this.descripcion}}

Steps to Reproduce:
{{this.pasoAPaso}}

Test Data Used:
{{this.datosPrueba}}

Expected Result:
{{this.resultadoEsperado}}

QA Comments (Reason for Failure):
{{this.comentarios}}

Evidence Link:
{{this.evidencia}}

{{/each}}
========================================
GENERAL IMPACT ANALYSIS
========================================
After detailing all test cases, please provide a final analysis of how these combined failures might impact other parts of the system or the overall user experience.
`,
});

const generateFailureReportFlow = ai.defineFlow(
  {
    name: 'generateFailureReportFlow',
    inputSchema: FailureReportInputSchema,
    outputSchema: FailureReportOutputSchema,
  },
  async input => {
    const {output} = await failureReportPrompt(input);
    return output!;
  }
);
