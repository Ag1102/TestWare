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
  failedTestCases: z.array(
    z.object({
      proceso: z.string().describe('The process the test case belongs to.'),
      casoPrueba: z.string().describe('The test case ID.'),
      descripcion: z.string().describe('The description of the test case.'),
      datosPrueba: z.string().describe('The test data used in the test case.'),
      pasoAPaso: z.string().describe('The steps to reproduce the test case.'),
      resultadoEsperado: z.string().describe('The expected result of the test case.'),
      evidencia: z.string().describe('A link or reference to the evidence for the test case.'),
      comentarios: z.string().describe('Comments from the QA engineer.'),
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
  prompt: `You are a report generator that takes in a list of failed test cases and generates a comprehensive failure report.

  For each failed test case, include the following information:
  - Test Case Title: {{(casoPrueba)}} - {{(proceso)}}
  - Description: {{(descripcion)}}
  - Test Data: {{(datosPrueba)}}
  - Steps Performed: {{(pasoAPaso)}}
  - Expected Result: {{(resultadoEsperado)}}
  - QA Comments: {{(comentarios)}}
  - Evidence: {{(evidencia)}}

  In addition to the above, generate additional comments explaining how the failure impacts other areas of the system under test.

  Here are the failed test cases:
  {{#each failedTestCases}}
  Test Case {{@index}}:
    - Test Case Title: {{(casoPrueba)}} - {{(proceso)}}
    - Description: {{(descripcion)}}
    - Test Data: {{(datosPrueba)}}
    - Steps Performed: {{(pasoAPaso)}}
    - Expected Result: {{(resultadoEsperado)}}
    - QA Comments: {{(comentarios)}}
    - Evidence: {{(evidencia)}}
  {{/each}}`,
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
