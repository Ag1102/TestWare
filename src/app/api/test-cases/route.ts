'use server';

import {NextResponse} from 'next/server';
import type {TestCase} from '@/lib/types';

// In-memory store for test cases.
// IMPORTANT: This data will be lost if the server restarts.
let testCases: TestCase[] = [];

/**
 * Handles GET requests to fetch the current list of test cases.
 */
export async function GET() {
  return NextResponse.json(testCases);
}

/**
 * Handles POST requests to update the list of test cases.
 * The entire list is replaced with the one provided in the request body.
 */
export async function POST(request: Request) {
  try {
    const newTestCases = await request.json();
    if (!Array.isArray(newTestCases)) {
      return NextResponse.json({error: 'Invalid data format. Expected an array.'}, {status: 400});
    }
    // Perform a light validation on the incoming data
    testCases = newTestCases.map((tc: any) => ({
        id: tc.id || `temp-id-${Math.random()}`,
        proceso: tc.proceso || '',
        casoPrueba: tc.casoPrueba || '',
        descripcion: tc.descripcion || '',
        datosPrueba: tc.datosPrueba || '',
        pasoAPaso: tc.pasoAPaso || '',
        resultadoEsperado: tc.resultadoEsperado || '',
        evidencia: tc.evidencia || '',
        comentarios: tc.comentarios || '',
        estado: tc.estado || 'pending',
    }));
    return NextResponse.json({success: true, message: 'Test cases updated.'});
  } catch (error) {
    return NextResponse.json({error: 'Failed to parse request body.'}, {status: 400});
  }
}
