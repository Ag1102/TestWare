"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, memo, type ChangeEvent } from 'react';
import { AITestCase, TestCase, TestCaseStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast } from "@/hooks/use-toast";
import { generateReportAction } from '@/app/actions';
import { Upload, Download, Trash2, FileText, Loader2, Wind, CheckCircle2, XCircle, FileQuestion, Hourglass, BarChart2, Filter } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const statusMap: Record<TestCaseStatus, string> = {
  'Passed': 'Aprobado',
  'Failed': 'Fallido',
  'N/A': 'N/A',
  'pending': 'Pendiente',
};

const statusIcons: Record<TestCaseStatus, React.ReactNode> = {
  'Passed': <CheckCircle2 className="h-5 w-5 text-green-500" />,
  'Failed': <XCircle className="h-5 w-5 text-red-500" />,
  'N/A': <FileQuestion className="h-5 w-5 text-gray-500" />,
  'pending': <Hourglass className="h-5 w-5 text-yellow-500" />,
}

const TestWaveDashboard: React.FC = () => {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [filterProcess, setFilterProcess] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const savedCases = localStorage.getItem('testwave-cases');
      if (savedCases) {
        setTestCases(JSON.parse(savedCases));
      }
    } catch (error) {
      console.error("Failed to load from localStorage", error);
      toast({ title: "Error", description: "Could not load data from local storage.", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    try {
      localStorage.setItem('testwave-cases', JSON.stringify(testCases));
    } catch (error) {
      console.error("Failed to save to localStorage", error);
      toast({ title: "Error", description: "Could not save data to local storage.", variant: "destructive" });
    }
  }, [testCases, toast]);

  const processes = useMemo(() => ['all', ...Array.from(new Set(testCases.map(tc => tc.proceso))).filter(Boolean)], [testCases]);

  const filteredCases = useMemo(() => {
    return testCases.filter(tc => 
      (filterProcess === 'all' || tc.proceso === filterProcess) &&
      (filterStatus === 'all' || tc.estado === filterStatus)
    );
  }, [testCases, filterProcess, filterStatus]);

  const stats = useMemo(() => {
    const total = testCases.length;
    const passed = testCases.filter(c => c.estado === 'Passed').length;
    const failed = testCases.filter(c => c.estado === 'Failed').length;
    const na = testCases.filter(c => c.estado === 'N/A').length;
    const pending = testCases.filter(c => c.estado === 'pending').length;
    const completed = passed + failed + na;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, passed, failed, na, pending, completed, progress };
  }, [testCases]);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const newCases: TestCase[] = json.map((c: any) => ({
          ...c,
          id: crypto.randomUUID(),
          estado: c.estado || 'pending'
        }));
        setTestCases(newCases);
        toast({ title: "Éxito", description: `${newCases.length} casos de prueba cargados.` });
      } catch (error) {
        console.error("Failed to parse JSON", error);
        toast({ title: "Fallo la Carga", description: "Por favor, carga un archivo JSON válido.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };
  
  const handleUpdate = useCallback((id: string, field: keyof TestCase, value: string | TestCaseStatus) => {
    setTestCases(prev => {
      const newTestCases = [...prev];
      const tcIndex = newTestCases.findIndex(tc => tc.id === id);
      if (tcIndex === -1) return prev;

      const testCase = newTestCases[tcIndex];

      if (field === 'estado' && value === 'Failed') {
        if (!testCase.comentarios || !testCase.evidencia) {
          toast({
            title: "Información Requerida",
            description: "Comentarios y Evidencia son requeridos antes de marcar un caso de prueba como Fallido.",
            variant: "destructive",
          });
          return prev;
        }
      }
      newTestCases[tcIndex] = { ...testCase, [field]: value };
      return newTestCases;
    });
  }, [toast]);
  
  const handleDeleteTestCase = useCallback((id: string) => {
    setTestCases(prev => prev.filter(tc => tc.id !== id));
    toast({ title: "Caso de prueba eliminado", variant: "destructive" });
  }, []);

  const handleClearData = () => {
    setTestCases([]);
    localStorage.removeItem('testwave-cases');
    toast({ title: "Datos eliminados", description: "Todos los casos de prueba han sido eliminados.", variant: "destructive" });
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground font-body">
      <Sidebar 
        stats={stats}
        processes={processes}
        filterProcess={filterProcess}
        setFilterProcess={setFilterProcess}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
      />
      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between">
            <div className="flex gap-2 items-center">
              <Wind className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight font-headline">TestWave</h1>
            </div>
            <div className="flex items-center justify-end space-x-2">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".json" className="hidden" id="json-upload" />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}><Upload /> Cargar JSON</Button>
              <FailureReportDialog failedCases={testCases.filter(tc => tc.estado === 'Failed')} />
              <Button variant="destructive" onClick={handleClearData} disabled={!testCases.length}><Trash2 /> Limpiar Todo</Button>
            </div>
          </div>
        </header>

        <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8">
          {!testCases.length ? (
              <div className="text-center py-20">
                <h2 className="text-2xl font-semibold">Bienvenido a TestWave</h2>
                <p className="text-muted-foreground mt-2">Carga un archivo JSON para empezar con tus casos de prueba.</p>
                <Button onClick={() => fileInputRef.current?.click()} className="mt-6 bg-primary hover:bg-primary/90">
                  <Upload className="mr-2" /> Carga tu primer archivo
                </Button>
              </div>
            ) : (
            <div className="space-y-4">
              {filteredCases.map((tc) => (
                <TestCaseCard key={tc.id} testCase={tc} onUpdate={handleUpdate} onDelete={handleDeleteTestCase} />
              ))}
              {filteredCases.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">No hay casos de prueba que coincidan con los filtros actuales.</div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

const Sidebar = ({ stats, processes, filterProcess, setFilterProcess, filterStatus, setFilterStatus }) => (
  <aside className="w-80 bg-card border-r p-6 space-y-8 sticky top-0 h-screen overflow-y-auto">
    <div>
        <h2 className="text-lg font-semibold tracking-tight">Panel de Control</h2>
        <div className="mt-4 space-y-2">
          <p className="text-sm text-muted-foreground">{stats.completed}/{stats.total} casos completados ({stats.progress}%)</p>
          <div className="w-full bg-muted rounded-full h-2.5">
            <div className="bg-primary h-2.5 rounded-full" style={{ width: `${stats.progress}%` }}></div>
          </div>
        </div>
    </div>
    
    <div>
      <h3 className="text-md font-semibold flex items-center gap-2"><BarChart2 className="h-5 w-5"/> Estadísticas</h3>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg"><p className="text-xl font-bold text-green-600">{stats.passed}</p><p className="text-xs text-muted-foreground">Aprobados</p></div>
        <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg"><p className="text-xl font-bold text-red-600">{stats.failed}</p><p className="text-xs text-muted-foreground">Fallidos</p></div>
        <div className="p-2 bg-gray-100 dark:bg-gray-900/50 rounded-lg"><p className="text-xl font-bold text-gray-500">{stats.na}</p><p className="text-xs text-muted-foreground">N/A</p></div>
      </div>
       <div className="p-2 mt-2 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg text-center"><p className="text-xl font-bold text-yellow-600">{stats.pending}</p><p className="text-xs text-muted-foreground">Pendientes</p></div>
    </div>
    
    <div>
      <h3 className="text-md font-semibold flex items-center gap-2"><Filter className="h-5 w-5"/> Filtros</h3>
      <div className="mt-4 space-y-4">
        <div>
          <Label>Proceso</Label>
          <Select value={filterProcess} onValueChange={setFilterProcess}>
            <SelectTrigger className="w-full mt-2">
              <SelectValue placeholder="Filtrar por proceso..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Procesos</SelectItem>
              {processes.slice(1).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Estado</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full mt-2">
              <SelectValue placeholder="Filtrar por estado..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Estados</SelectItem>
              {Object.keys(statusMap).map(status => (
                <SelectItem key={status} value={status}>{statusMap[status]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  </aside>
);

const TestCaseCard = memo(({ testCase, onUpdate, onDelete }: { testCase: TestCase, onUpdate: Function, onDelete: Function }) => {
  const evidenceInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const [comments, setComments] = useState(testCase.comentarios);

  // Debounce comments update to improve performance
  useEffect(() => {
    const handler = setTimeout(() => {
      if (comments !== testCase.comentarios) {
        onUpdate(testCase.id, 'comentarios', comments);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [comments, testCase.comentarios, testCase.id, onUpdate]);
  
  // Sync local state if prop changes from external source
  useEffect(() => {
    if (testCase.comentarios !== comments) {
      setComments(testCase.comentarios);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testCase.comentarios]);


  const handleEvidenceSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        toast({ title: "Archivo inválido", description: "Por favor, selecciona un archivo de imagen.", variant: "destructive" });
        return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({ title: "Archivo demasiado grande", description: "Por favor, carga una imagen de menos de 5MB.", variant: "destructive" });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      onUpdate(testCase.id, 'evidencia', dataUrl);
    };
    reader.onerror = () => {
        toast({ title: "Error al leer el archivo", variant: "destructive" });
    }
    reader.readAsDataURL(file);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between bg-muted/50 p-4">
        <CardTitle className="font-mono text-base">{testCase.casoPrueba}</CardTitle>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => onDelete(testCase.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        <div className="md:col-span-2 space-y-4">
            <InfoField label="Proceso" value={testCase.proceso} />
            <InfoField label="Descripción" value={testCase.descripcion} preWrap />
            <InfoField label="Paso a Paso" value={testCase.pasoAPaso} preWrap />
            <InfoField label="Datos de Prueba" value={testCase.datosPrueba} />
            <InfoField label="Resultado Esperado" value={testCase.resultadoEsperado} />
        </div>
        
        <div className="space-y-2">
          <Label>Estado</Label>
          <RadioGroup
            value={testCase.estado || 'pending'}
            onValueChange={(value: TestCaseStatus) => onUpdate(testCase.id, 'estado', value)}
            className="flex flex-wrap gap-2 pt-2"
          >
            {Object.keys(statusMap).filter(s => s !== 'pending').map((status) => (
              <div key={status} className="flex items-center">
                <RadioGroupItem value={status} id={`${testCase.id}-${status}`} />
                <Label htmlFor={`${testCase.id}-${status}`} className="ml-2 cursor-pointer">{statusMap[status]}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        
        <div className="space-y-2">
          <Label>Comentarios</Label>
          <Textarea 
            value={comments} 
            onChange={e => setComments(e.target.value)} 
            className="min-h-[80px]" 
            placeholder={testCase.estado === 'Failed' ? 'Razón del fallo requerida' : 'Comentarios adicionales...'}
          />
        </div>

        <div className="md:col-span-2 space-y-2">
          <Label>Evidencia</Label>
          <div className="flex items-center gap-2">
            <Input 
              value={testCase.evidencia} 
              onChange={e => onUpdate(testCase.id, 'evidencia', e.target.value)} 
              placeholder={testCase.estado === 'Failed' ? 'URL de evidencia requerida' : 'Pega la URL o carga una imagen'} 
            />
            <input
              type="file"
              ref={evidenceInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleEvidenceSelect}
            />
            <Button variant="outline" onClick={() => evidenceInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2"/>
              Cargar
            </Button>
          </div>
          {testCase.evidencia && (
            <a href={testCase.evidencia} target="_blank" rel="noopener noreferrer" className="mt-2 block">
              <img src={testCase.evidencia} alt="Vista previa de la evidencia" data-ai-hint="evidence screenshot" className="w-full max-w-sm rounded-md object-cover max-h-48 hover:opacity-80 transition-opacity border" onError={(e) => (e.currentTarget.style.display = 'none')} />
            </a>
          )}
        </div>

      </CardContent>
    </Card>
  )
});
TestCaseCard.displayName = "TestCaseCard";

const InfoField = ({ label, value, preWrap = false }) => (
  <div>
    <p className="text-sm font-semibold text-muted-foreground">{label}</p>
    <p className={`text-sm mt-1 ${preWrap ? 'whitespace-pre-wrap font-code' : ''}`}>{value || '-'}</p>
  </div>
);

const FailureReportDialog: React.FC<{ failedCases: TestCase[] }> = ({ failedCases }) => {
  const [impactAnalysis, setImpactAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reportDescription, setReportDescription] = useState('');
  const [authorName, setAuthorName] = useState('');
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!reportDescription.trim()) {
      toast({ title: "Resumen Requerido", description: "Por favor, proporciona un resumen para el reporte.", variant: "destructive" });
      return;
    }
     if (!authorName.trim()) {
      toast({ title: "Autor Requerido", description: "Por favor, ingresa el nombre del autor.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setImpactAnalysis(null);
    const aiCases: AITestCase[] = failedCases.map(({ id, ...rest }) => ({ ...rest, estado: 'Fallido' }));
    
    try {
      const result = await generateReportAction({ failedTestCases: aiCases, reportDescription });
      setImpactAnalysis(result.impactAnalysis);
    } catch (error) {
      toast({ title: "Fallo la Generación del Reporte", description: "Ocurrió un error al contactar a la IA.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    const reportElement = document.createElement('div');
    reportElement.style.position = 'absolute';
    reportElement.style.left = '-9999px';
    reportElement.style.top = '0';

    const currentDate = new Date();
    const formattedDate = format(currentDate, 'dd / MM / yyyy');
    const evaluatedPeriod = format(currentDate, 'MMMM yyyy', { locale: es });
    const capitalizedPeriod = evaluatedPeriod.charAt(0).toUpperCase() + evaluatedPeriod.slice(1);

    const uniqueProcesses = [...new Set(failedCases.map(tc => tc.proceso))];

    const escapeHtml = (unsafe: string) =>
      unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");

    let innerHTML = `
      <div style="font-family: Arial, sans-serif; color: #333; padding: 40px; width: 800px; background-color: white;">
        <h1 style="font-size: 24px; border-bottom: 2px solid #ccc; padding-bottom: 8px; margin-bottom: 20px;">Informe de Hallazgos de QA</h1>
        <p><strong>Elaborado por:</strong> ${escapeHtml(authorName)}</p>
        <p><strong>Fecha:</strong> ${formattedDate}</p>
        <p><strong>Período Evaluado:</strong> ${capitalizedPeriod}</p>
        
        <h2 style="font-size: 20px; margin-top: 30px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Procesos Evaluados:</h2>
        <ul style="padding-left: 20px;">${uniqueProcesses.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>

        <h2 style="font-size: 20px; margin-top: 30px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Resumen del Reporte</h2>
        <p>${escapeHtml(reportDescription)}</p>

        <h2 style="font-size: 20px; margin-top: 30px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Detalle de Casos de Prueba Fallidos</h2>
        ${failedCases.map(tc => `
          <div style="page-break-inside: avoid; border-top: 1px solid #eee; margin-top: 20px; padding-top: 20px;">
            <h3 style="font-size: 16px; font-weight: bold;">CASO: ${escapeHtml(tc.casoPrueba)} - ${escapeHtml(tc.proceso)}</h3>
            <p><strong>Descripción:</strong> ${escapeHtml(tc.descripcion)}</p>
            <p><strong>Paso a Paso:</strong></p>
            <pre style="white-space: pre-wrap; font-family: 'Courier New', Courier, monospace; background: #f5f5f5; padding: 10px; border-radius: 5px; word-wrap: break-word;">${escapeHtml(tc.pasoAPaso)}</pre>
            <p><strong>Datos de Prueba:</strong> ${escapeHtml(tc.datosPrueba)}</p>
            <p><strong>Resultado Esperado:</strong> ${escapeHtml(tc.resultadoEsperado)}</p>
            <p><strong>Comentarios de QA:</strong> ${escapeHtml(tc.comentarios)}</p>
            <p><strong>Evidencia:</strong></p>
            ${
              tc.evidencia.startsWith('data:image')
              ? `<img src="${tc.evidencia}" style="max-width: 100%; border: 1px solid #ddd; border-radius: 5px;" alt="Evidencia"/>`
              : `<a href="${tc.evidencia}" target="_blank">${escapeHtml(tc.evidencia)}</a>`
            }
          </div>
        `).join('')}

        <h2 style="font-size: 20px; margin-top: 30px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Análisis de Impacto General</h2>
        <pre style="white-space: pre-wrap; font-family: 'Courier New', Courier, monospace; background: #f5f5f5; padding: 10px; border-radius: 5px; word-wrap: break-word;">${escapeHtml(impactAnalysis || '')}</pre>
      </div>
    `;
    reportElement.innerHTML = innerHTML;
    document.body.appendChild(reportElement);

    try {
      const canvas = await html2canvas(reportElement, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = imgWidth / pdfWidth;
      const scaledHeight = imgHeight / ratio;

      let heightLeft = scaledHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = -heightLeft;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`reporte-fallos-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
        console.error("Error generating PDF:", error);
        toast({ title: "Error de PDF", description: "No se pudo generar el archivo PDF.", variant: "destructive" });
    } finally {
        document.body.removeChild(reportElement);
    }
  }

  const resetDialog = () => {
    setImpactAnalysis(null);
    setReportDescription('');
    setAuthorName('');
    setIsLoading(false);
  }

  return (
    <Dialog onOpenChange={(open) => !open && resetDialog()}>
      <DialogTrigger asChild>
        <Button variant="destructive" disabled={!failedCases.length}><FileText /> Informe de Fallos ({failedCases.length})</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Generar Informe de Fallos en PDF</DialogTitle>
        </DialogHeader>
        
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="ml-4">Generando análisis de impacto...</p>
          </div>
        )}

        {!isLoading && !impactAnalysis && (
           <div className="space-y-4 py-4">
            <p>Genera un reporte detallado para los {failedCases.length} caso(s) de prueba fallidos. Primero, la IA generará un análisis de impacto.</p>
            <div>
              <Label htmlFor="author-name" className="font-semibold">Elaborado por</Label>
              <Input
                id="author-name"
                placeholder="Ingresa tu nombre completo"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="report-description" className="font-semibold">Resumen del Reporte</Label>
              <Textarea
                id="report-description"
                placeholder="Proporciona un resumen general o contexto para este informe de fallos. Esto es requerido."
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                className="mt-2 min-h-[100px]"
              />
            </div>
            <Button onClick={handleGenerate} className="w-full bg-primary hover:bg-primary/90">Generar Análisis de IA</Button>
          </div>
        )}
        
        {!isLoading && impactAnalysis && (
          <>
            <div className="space-y-4 py-2">
                <h3 className="font-semibold">Análisis de Impacto Generado por IA:</h3>
                 <div className="max-h-[30vh] overflow-y-auto p-4 bg-muted/50 rounded-md">
                    <pre className="whitespace-pre-wrap font-sans text-sm">{impactAnalysis}</pre>
                </div>
                <p className="text-sm text-muted-foreground">El análisis ha sido generado. Ahora puedes descargar el informe completo en formato PDF.</p>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">Cerrar</Button>
              </DialogClose>
              <Button onClick={handleDownloadPdf}><Download /> Descargar PDF</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TestWaveDashboard;
