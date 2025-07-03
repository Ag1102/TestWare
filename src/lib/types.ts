export type TestCaseStatus = 'Passed' | 'Failed' | 'N/A' | '';

export interface TestCase {
  id: string;
  proceso: string;
  casoPrueba: string;
  descripcion: string;
  datosPrueba: string;
  pasoAPaso: string;
  resultadoEsperado: string;
  evidencia: string;
  comentarios: string;
  estado: TestCaseStatus;
}

// This type aligns with the stricter schema expected by the Genkit AI flow.
export interface AITestCase {
  proceso: string;
  casoPrueba: string;
  descripcion: string;
  datosPrueba: string;
  pasoAPaso: string;
  resultadoEsperado: string;
  evidencia: string;
  comentarios: string;
  estado: 'Fallido';
}
