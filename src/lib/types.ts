export type TestCaseStatus = 'Aprobado' | 'Fallido' | 'N/A' | 'Pendiente';

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
  updatedBy?: string;
  updatedAt?: any;
}

export interface Participant {
  id: string;
  email?: string;
  role: 'editor' | 'viewer';
  online: boolean;
  lastSeen?: any;
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
