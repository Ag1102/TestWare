'use server';

import {
  generateFailureReport,
  FailureReportInput,
  FailureReportOutput,
} from '@/ai/flows/generate-failure-report';
import {
  generateImprovementReport,
  ImprovementReportInput,
  ImprovementReportOutput,
} from '@/ai/flows/generate-improvement-report';
import {TestCase} from '@/lib/types';
import {z} from 'zod';

export async function generateReportAction(
  input: FailureReportInput
): Promise<FailureReportOutput> {
  if (!input.failedTestCases || input.failedTestCases.length === 0) {
    return {
      impactAnalysis:
        'No failed test cases were provided to generate an impact analysis.',
    };
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

export async function generateImprovementReportAction(
  input: ImprovementReportInput
): Promise<ImprovementReportOutput> {
  if (!input.commentedTestCases || input.commentedTestCases.length === 0) {
    return {
      improvementAnalysis:
        'No test cases with comments were provided to generate an analysis.',
    };
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

// --- AZURE DEVOPS ACTIONS ---

const AzureTestPlansInputSchema = z.object({
  organization: z.string().min(1, 'La organización es requerida.'),
  project: z.string().min(1, 'El proyecto es requerido.'),
  pat: z.string().min(1, 'El PAT es requerido.'),
});
export type AzureTestPlansInput = z.infer<typeof AzureTestPlansInputSchema>;

export interface AzureTestPlan {
  id: string;
  name: string;
}

interface AzureTestPlansOutput {
  success: boolean;
  plans?: AzureTestPlan[];
  error?: string;
}

export async function getAzureTestPlansAction(
  input: AzureTestPlansInput
): Promise<AzureTestPlansOutput> {
  const result = AzureTestPlansInputSchema.safeParse(input);
  if (!result.success) {
    return {success: false, error: 'Datos de entrada inválidos.'};
  }

  const {organization, project, pat} = result.data;
  const url = `https://dev.azure.com/${organization}/${project}/_apis/test/plans?api-version=7.0`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${Buffer.from(`:${pat}`).toString('base64')}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Error al obtener los planes de prueba: ${
          errorData.message || response.statusText
        }`
      );
    }

    const data = await response.json();
    const plans: AzureTestPlan[] = data.value.map((plan: any) => ({
      id: plan.id.toString(),
      name: plan.name,
    }));

    return {success: true, plans};
  } catch (error: any) {
    console.error('Failed to fetch Azure test plans:', error);
    return {
      success: false,
      error:
        error.message ||
        'An unknown error occurred while fetching test plans.',
    };
  }
}

const AzureImportInputSchema = z.object({
  organization: z.string().min(1),
  project: z.string().min(1),
  planId: z.string().min(1),
  pat: z.string().min(1),
});
type AzureImportInput = z.infer<typeof AzureImportInputSchema>;

interface AzureImportOutput {
  success: boolean;
  testCases?: Omit<TestCase, 'id'>[];
  error?: string;
}

// Helper function to remove HTML tags from a string
function stripHtml(html: string | undefined | null): string {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '');
}

export async function importFromAzureAction(
  input: AzureImportInput
): Promise<AzureImportOutput> {
  const {organization, project, planId, pat} = input;
  const baseUrl = `https://dev.azure.com/${organization}/${project}/_apis/testplan/plans/${planId}`;

  try {
    // 1. Get all suites in the test plan
    const suitesUrl = `${baseUrl}/suites?api-version=7.0`;
    const suitesResponse = await fetch(suitesUrl, {
      headers: {
        Authorization: `Basic ${Buffer.from(`:${pat}`).toString('base64')}`,
      },
    });

    if (!suitesResponse.ok) {
      const errorData = await suitesResponse.json();
      throw new Error(
        `Error al obtener los suites: ${
          errorData.message || suitesResponse.statusText
        }`
      );
    }

    const suitesData = await suitesResponse.json();
    const suiteIds = suitesData.value.map((suite: any) => suite.id);

    if (suiteIds.length === 0) {
      return {success: true, testCases: []};
    }

    // 2. Get all test cases from all suites
    const testCasesUrl = `${baseUrl}/suites/testcases?suiteIds=${suiteIds.join(
      ','
    )}&api-version=7.0`;
    const testCasesResponse = await fetch(testCasesUrl, {
      headers: {
        Authorization: `Basic ${Buffer.from(`:${pat}`).toString('base64')}`,
      },
    });

    if (!testCasesResponse.ok) {
      const errorData = await testCasesResponse.json();
      throw new Error(
        `Error al obtener los casos de prueba: ${
          errorData.message || testCasesResponse.statusText
        }`
      );
    }

    const testCasesData = await testCasesResponse.json();
    const workItemIds = testCasesData.value.map((tc: any) => tc.workItem.id);

    if (workItemIds.length === 0) {
      return {success: true, testCases: []};
    }

    // 3. Get the details for each work item (test case)
    const workItemsUrl = `https://dev.azure.com/${organization}/${project}/_apis/wit/workitems?ids=${workItemIds.join(
      ','
    )}&$expand=all&api-version=7.0`;
    const workItemsResponse = await fetch(workItemsUrl, {
      headers: {
        Authorization: `Basic ${Buffer.from(`:${pat}`).toString('base64')}`,
      },
    });

    if (!workItemsResponse.ok) {
      const errorData = await workItemsResponse.json();
      throw new Error(
        `Error al obtener los detalles de los work items: ${
          errorData.message || workItemsResponse.statusText
        }`
      );
    }

    const workItemsData = await workItemsResponse.json();

    const mappedTestCases: Omit<TestCase, 'id'>[] = workItemsData.value.map(
      (item: any) => {
        const fields = item.fields;
        return {
          proceso: fields['System.AreaPath'] || 'General',
          casoPrueba: `AZ-${item.id}`,
          descripcion: stripHtml(fields['System.Title']),
          datosPrueba: stripHtml(fields['Microsoft.VSTS.TCM.TestData']) || '',
          pasoAPaso: stripHtml(fields['Microsoft.VSTS.TCM.Steps']) || '',
          resultadoEsperado:
            stripHtml(fields['Microsoft.VSTS.TCM.ExpectedResult']) || '',
          evidencia: '',
          comentarios: '',
          estado: 'pending',
          updatedBy: '',
          updatedAt: null,
        };
      }
    );

    return {success: true, testCases: mappedTestCases};
  } catch (error: any) {
    console.error('Azure import failed:', error);
    return {
      success: false,
      error:
        error.message ||
        'An unknown error occurred during the Azure import process.',
    };
  }
}
