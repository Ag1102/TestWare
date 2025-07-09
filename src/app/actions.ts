'use server';

import { generateFailureReport, FailureReportInput, FailureReportOutput } from '@/ai/flows/generate-failure-report';
import { generateImprovementReport, ImprovementReportInput, ImprovementReportOutput } from '@/ai/flows/generate-improvement-report';
import { TestCase } from '@/lib/types';

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

interface AzureImportInput {
  organization: string;
  project: string;
  planId: string;
  pat: string;
}

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

export async function importFromAzureAction(input: AzureImportInput): Promise<AzureImportOutput> {
  const { organization, project, planId, pat } = input;
  const baseUrl = `https://dev.azure.com/${organization}/${project}/_apis/testplan/plans/${planId}`;

  try {
    // 1. Get all suites in the test plan
    const suitesUrl = `${baseUrl}/suites?api-version=7.0`;
    const suitesResponse = await fetch(suitesUrl, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`:${pat}`).toString('base64')}`
      }
    });

    if (!suitesResponse.ok) {
        const errorData = await suitesResponse.json();
        throw new Error(`Error al obtener los suites: ${errorData.message || suitesResponse.statusText}`);
    }

    const suitesData = await suitesResponse.json();
    const suiteIds = suitesData.value.map((suite: any) => suite.id);

    if (suiteIds.length === 0) {
        return { success: true, testCases: [] };
    }
    
    // 2. Get all test cases from all suites
    const testCasesUrl = `${baseUrl}/suites/testcases?suiteIds=${suiteIds.join(',')}&api-version=7.0`;
    const testCasesResponse = await fetch(testCasesUrl, {
       headers: {
        'Authorization': `Basic ${Buffer.from(`:${pat}`).toString('base64')}`
      }
    });

    if (!testCasesResponse.ok) {
        const errorData = await testCasesResponse.json();
        throw new Error(`Error al obtener los casos de prueba: ${errorData.message || testCasesResponse.statusText}`);
    }

    const testCasesData = await testCasesResponse.json();
    const workItemIds = testCasesData.value.map((tc: any) => tc.workItem.id);

    if (workItemIds.length === 0) {
        return { success: true, testCases: [] };
    }

    // 3. Get the details for each work item (test case)
    const workItemsUrl = `https://dev.azure.com/${organization}/${project}/_apis/wit/workitems?ids=${workItemIds.join(',')}&$expand=all&api-version=7.0`;
    const workItemsResponse = await fetch(workItemsUrl, {
       headers: {
        'Authorization': `Basic ${Buffer.from(`:${pat}`).toString('base64')}`
      }
    });

    if (!workItemsResponse.ok) {
        const errorData = await workItemsResponse.json();
        throw new Error(`Error al obtener los detalles de los work items: ${errorData.message || workItemsResponse.statusText}`);
    }
    
    const workItemsData = await workItemsResponse.json();

    const mappedTestCases: Omit<TestCase, 'id'>[] = workItemsData.value.map((item: any) => {
        const fields = item.fields;
        return {
            proceso: fields['System.AreaPath'] || 'General',
            casoPrueba: `AZ-${item.id}`,
            descripcion: stripHtml(fields['System.Title']),
            datosPrueba: stripHtml(fields['Microsoft.VSTS.TCM.TestData']) || '',
            pasoAPaso: stripHtml(fields['Microsoft.VSTS.TCM.Steps']) || '',
            resultadoEsperado: stripHtml(fields['Microsoft.VSTS.TCM.ExpectedResult']) || '',
            evidencia: '',
            comentarios: '',
            estado: 'pending',
            updatedBy: '',
            updatedAt: null,
        };
    });
    
    return { success: true, testCases: mappedTestCases };

  } catch (error: any) {
    console.error('Azure import failed:', error);
    return { success: false, error: error.message || 'An unknown error occurred during the Azure import process.' };
  }
}

    