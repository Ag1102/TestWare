'use server';

/**
 * @fileOverview Generates a failure report impact analysis from a list of failed test cases.
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
  impactAnalysis: z.string().describe("A general impact analysis of how these combined failures might affect other parts of the system or the overall user experience."),
});
export type FailureReportOutput = z.infer<typeof FailureReportOutputSchema>;

export async function generateFailureReport(input: FailureReportInput): Promise<FailureReportOutput> {
  return generateFailureReportFlow(input);
}

const failureReportPrompt = ai.definePrompt({
  name: 'failureReportPrompt',
  input: {schema: FailureReportInputSchema},
  output: {schema: FailureReportOutputSchema},
  prompt: `You are a QA expert. Based on the following failed test cases and a summary description, provide a concise but thorough impact analysis.
Explain how these combined failures might impact other parts of the system, the business, or the overall user experience.
The analysis should be in Spanish.

REPORT SUMMARY:
---
{{reportDescription}}
---

FAILED TEST CASES:
{{#each failedTestCases}}
---
- Test Case: {{this.casoPrueba}}
- Process: {{this.proceso}}
- Reason for Failure: {{this.comentarios}}
---
{{/each}}

Based on this, generate only the "GENERAL IMPACT ANALYSIS" section.
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
