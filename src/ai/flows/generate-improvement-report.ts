'use server';

/**
 * @fileOverview Generates an improvement and observation analysis from a list of test cases with comments.
 *
 * - generateImprovementReport - A function that generates the improvement report.
 * - ImprovementReportInput - The input type for the generateImprovementReport function.
 * - ImprovementReportOutput - The return type for the generateImprovementReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ImprovementReportInputSchema = z.object({
  reportDescription: z.string().describe('An overall description or summary for the improvement report.'),
  commentedTestCases: z.array(
    z.object({
      proceso: z.string().describe('The process the test case belongs to.'),
      casoPrueba: z.string().describe('The test case ID.'),
      descripcion: z.string().describe('The description of the test case.'),
      datosPrueba: z.string().describe('The test data used in the test case.'),
      pasoAPaso: z.string().describe('The steps to reproduce the test case.'),
      resultadoEsperado: z.string().describe('The expected result of the test case.'),
      evidencia: z.string().describe('A link or reference to the evidence for the test case.'),
      comentarios: z.string().describe('Comments from the QA engineer. This field will not be empty.'),
      estado: z.enum(['Passed', 'Failed', 'N/A', 'pending']).describe('The status of the test case.'),
    })
  ).describe('An array of test cases that have comments.'),
});
export type ImprovementReportInput = z.infer<typeof ImprovementReportInputSchema>;

const ImprovementReportOutputSchema = z.object({
  improvementAnalysis: z.string().describe("An analysis of the provided comments, suggesting improvements, highlighting observations, or detailing next steps based on the context. The analysis should be in Spanish."),
});
export type ImprovementReportOutput = z.infer<typeof ImprovementReportOutputSchema>;

export async function generateImprovementReport(input: ImprovementReportInput): Promise<ImprovementReportOutput> {
  return generateImprovementReportFlow(input);
}

const improvementReportPrompt = ai.definePrompt({
  name: 'improvementReportPrompt',
  input: {schema: ImprovementReportInputSchema},
  output: {schema: ImprovementReportOutputSchema},
  prompt: `You are a QA Lead responsible for process improvement. Based on the following test cases and their associated comments, along with a general summary, provide a concise analysis.
Your analysis should focus on identifying potential improvements, noteworthy observations, or actionable next steps based on the comments left by the QA engineer.
The analysis should be in Spanish.

REPORT SUMMARY:
---
{{reportDescription}}
---

TEST CASES WITH COMMENTS:
{{#each commentedTestCases}}
---
- Test Case: {{this.casoPrueba}}
- Process: {{this.proceso}}
- Status: {{this.estado}}
- Comment: {{this.comentarios}}
---
{{/each}}

Based on this, generate only the "ANALYSIS OF IMPROVEMENTS AND OBSERVATIONS" section.
`,
});

const generateImprovementReportFlow = ai.defineFlow(
  {
    name: 'generateImprovementReportFlow',
    inputSchema: ImprovementReportInputSchema,
    outputSchema: ImprovementReportOutputSchema,
  },
  async input => {
    const {output} = await improvementReportPrompt(input);
    return output!;
  }
);
