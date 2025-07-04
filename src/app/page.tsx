"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, memo, type ChangeEvent } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

import { AITestCase, TestCase, TestCaseStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast } from "@/hooks/use-toast";
import { generateReportAction } from '@/app/actions';
import { Upload, Download, Trash2, FileText, Loader2, CheckCircle2, XCircle, FileQuestion, Hourglass, BarChart2, Filter, PieChart as PieChartIcon, Search, Bug } from 'lucide-react';
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

const TestwareLogo = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("h-6 w-6 text-primary", className)}
  >
    <path d="m15 15-3.375-3.375" />
    <path d="M19 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
    <path d="M22 22 18 18" />
    <path d="M13.723 10.377a5.002 5.002 0 0 0-4.098 4.098" />
    <path d="M18 12a2 2 0 0 1-2-2" />
    <path d="M14 8a2 2 0 0 1-2-2" />
    <path d="M12 6a2 2 0 0 0-2-2" />
    <path d="8 10a2 2 0 0 0-2-2" />
  </svg>
);


const TestwareDashboard: React.FC = () => {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [filterProcess, setFilterProcess] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const savedCases = localStorage.getItem('TESTWARE-cases');
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
      localStorage.setItem('TESTWARE-cases', JSON.stringify(testCases));
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
      const tcIndex = prev.findIndex(tc => tc.id === id);
      if (tcIndex === -1) return prev;
      
      const testCaseToUpdate = prev[tcIndex];
      
      if (field === 'estado' && value === 'Failed') {
        if (!testCaseToUpdate.comentarios?.trim() || !testCaseToUpdate.evidencia?.trim()) {
           // We show the toast outside of the setState call
           // This will be executed after the state update is complete.
          setTimeout(() => toast({
            title: "Información Requerida",
            description: "Comentarios y Evidencia son requeridos para marcar como Fallido.",
            variant: "destructive",
          }), 0);
          return prev; // Revert the change by returning the previous state
        }
      }
      
      return prev.map(tc => 
        tc.id === id ? { ...tc, [field]: value } : tc
      );
    });
  }, [toast]);
  
  const handleDeleteTestCase = useCallback((id: string) => {
    setTestCases(prev => prev.filter(tc => tc.id !== id));
    toast({ title: "Caso de prueba eliminado", variant: "destructive" });
  }, [toast]);

  const handleClearData = () => {
    setTestCases([]);
    localStorage.removeItem('TESTWARE-cases');
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
              <TestwareLogo/>
              <h1 className="text-2xl font-bold tracking-tight font-headline">TESTWARE</h1>
            </div>
            <div className="flex items-center justify-end space-x-2">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".json" className="hidden" id="json-upload" />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}><Upload /> Cargar JSON</Button>
              <FailureReportDialog failedCases={testCases.filter(tc => tc.estado === 'Failed')} allCases={testCases} stats={stats} />
              <Button variant="destructive" onClick={handleClearData} disabled={!testCases.length}><Trash2 /> Limpiar Todo</Button>
            </div>
          </div>
        </header>

        <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8">
          {!testCases.length ? (
              <div className="text-center py-20">
                <h2 className="text-2xl font-semibold">Bienvenido a TESTWARE</h2>
                <p className="text-muted-foreground mt-2">Carga un archivo JSON para empezar con tus casos de prueba.</p>
                <Button onClick={() => fileInputRef.current?.click()} className="mt-6 bg-primary hover:bg-primary/90">
                  <Upload className="mr-2" /> Carga tu primer archivo
                </Button>
              </div>
            ) : (
            <div className="space-y-6">
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

const Sidebar = ({ stats, processes, filterProcess, setFilterProcess, filterStatus, setFilterStatus }) => {
    const chartData = useMemo(() => [
        { name: 'Aprobados', value: stats.passed, fill: 'hsl(var(--chart-1))' },
        { name: 'Fallidos', value: stats.failed, fill: 'hsl(var(--chart-2))' },
        { name: 'N/A', value: stats.na, fill: 'hsl(var(--chart-3))' },
        { name: 'Pendientes', value: stats.pending, fill: 'hsl(var(--chart-4))' },
    ], [stats]);

    const chartConfig = {
      value: {
        label: 'Casos',
      },
      Aprobados: {
        label: 'Aprobados',
        color: 'hsl(var(--chart-1))',
      },
      Fallidos: {
        label: 'Fallidos',
        color: 'hsl(var(--chart-2))',
      },
      'N/A': {
        label: 'N/A',
        color: 'hsl(var(--chart-3))',
      },
      Pendientes: {
        label: 'Pendientes',
        color: 'hsl(var(--chart-4))',
      },
    } satisfies ChartConfig

    return (
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
          <h3 className="text-md font-semibold flex items-center gap-2"><PieChartIcon className="h-5 w-5"/> Visualización</h3>
          <div className="mt-4 space-y-4">
            <Card id="pdf-pie-chart-card">
              <CardHeader className="items-center pb-0">
                <CardTitle>Visión General</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 pb-0">
                <ChartContainer
                  config={chartConfig}
                  className="mx-auto aspect-square max-h-[250px]"
                >
                  <RechartsPieChart>
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      strokeWidth={3}
                    >
                      {chartData.map((entry) => (
                        <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </RechartsPieChart>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card id="pdf-bar-chart-card">
                <CardHeader className="items-center pb-0">
                    <CardTitle>Resumen por Estado</CardTitle>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="w-full h-[200px]">
                        <BarChart accessibilityLayer data={chartData} layout="vertical" margin={{ left: 10, right: 10 }}>
                            <YAxis
                                dataKey="name"
                                type="category"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                                tickFormatter={(value) => value}
                                width={80}
                            />
                            <XAxis dataKey="value" type="number" hide />
                            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" hideLabel />} />
                            <Bar dataKey="value" layout="vertical" radius={5}>
                                {chartData.map((entry) => (
                                    <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
          </div>
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
                    <SelectItem key={status} value={status}>{statusMap[status as TestCaseStatus]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </aside>
    )
};

const TestCaseCard = memo(({ testCase, onUpdate, onDelete }: { testCase: TestCase, onUpdate: Function, onDelete: Function }) => {
  const evidenceInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const [comments, setComments] = useState(testCase.comentarios);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (comments !== testCase.comentarios) {
        onUpdate(testCase.id, 'comentarios', comments);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [comments, testCase.comentarios, testCase.id, onUpdate]);
  
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
    <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between bg-card p-4 border-b">
        <div className="flex flex-col">
          <CardTitle className="font-headline text-lg tracking-tight">{testCase.proceso}</CardTitle>
          <p className="font-mono text-sm text-muted-foreground mt-1">{testCase.casoPrueba}</p>
        </div>
        <div className="flex items-center gap-2">
            <Select
              value={testCase.estado}
              onValueChange={(value) => onUpdate(testCase.id, 'estado', value as TestCaseStatus)}
            >
              <SelectTrigger className="w-[150px] font-semibold">
                <SelectValue placeholder="Seleccionar estado..." />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(statusMap)
                  .map((status) => (
                    <SelectItem key={status} value={status}>
                      <div className="flex items-center gap-2">
                        {statusIcons[status as TestCaseStatus]}
                        <span>{statusMap[status as TestCaseStatus]}</span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => onDelete(testCase.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <InfoField label="Descripción" value={testCase.descripcion} preWrap />
        <InfoField label="Paso a Paso" value={testCase.pasoAPaso} preWrap />
        <InfoField label="Datos de Prueba" value={testCase.datosPrueba} />
        <InfoField label="Resultado Esperado" value={testCase.resultadoEsperado} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
          <div className="space-y-2">
            <Label htmlFor={`comments-${testCase.id}`} className="font-semibold">Comentarios</Label>
            <Textarea 
              id={`comments-${testCase.id}`}
              value={comments} 
              onChange={e => setComments(e.target.value)} 
              className="min-h-[100px] bg-background/50" 
              placeholder={testCase.estado === 'Failed' ? 'Razón del fallo requerida' : 'Comentarios adicionales...'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`evidence-${testCase.id}`} className="font-semibold">Evidencia</Label>
            <div className="flex items-center gap-2">
              <Input
                id={`evidence-${testCase.id}`} 
                value={testCase.evidencia} 
                onChange={e => onUpdate(testCase.id, 'evidencia', e.target.value)} 
                placeholder={testCase.estado === 'Failed' ? 'URL de evidencia requerida' : 'Pega la URL o carga una imagen'}
                className="bg-background/50"
              />
              <input
                type="file"
                ref={evidenceInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleEvidenceSelect}
              />
              <Button variant="outline" onClick={() => evidenceInputRef.current?.click()}>
                <Upload className="h-4 w-4"/>
              </Button>
            </div>
            {testCase.evidencia && testCase.evidencia.startsWith('data:image') && (
              <a href={testCase.evidencia} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                <img src={testCase.evidencia} alt="Vista previa de la evidencia" data-ai-hint="evidence screenshot" className="w-full rounded-md object-cover max-h-48 hover:opacity-80 transition-opacity border" />
              </a>
            )}
            {testCase.evidencia && !testCase.evidencia.startsWith('data:image') && (
              <a href={testCase.evidencia} target="_blank" rel="noopener noreferrer" className="mt-2 text-primary hover:underline text-sm break-all">
                {testCase.evidencia}
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
});
TestCaseCard.displayName = "TestCaseCard";

const InfoField = ({ label, value, preWrap = false }) => (
  <div className="space-y-1">
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className={`text-sm ${preWrap ? 'whitespace-pre-wrap font-code bg-muted/50 p-3 rounded-md' : 'font-body'}`}>{value || <span className="text-muted-foreground/70">-</span>}</p>
  </div>
);

const FailureReportDialog: React.FC<{ failedCases: TestCase[]; allCases: TestCase[]; stats: any }> = ({ failedCases, allCases, stats }) => {
  const [impactAnalysis, setImpactAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
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
    } catch (error)      {
      console.error("Error generating report from AI", error);
      toast({ title: "Fallo la Generación del Reporte", description: "Ocurrió un error al contactar a la IA.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    setIsDownloadingPdf(true);

    setTimeout(async () => {
      const reportContainer = document.createElement('div');
      reportContainer.style.position = 'absolute';
      reportContainer.style.left = '-9999px';
      reportContainer.style.width = '800px';
      document.body.appendChild(reportContainer);

      try {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 15;
        const contentWidth = pdfWidth - (margin * 2);
        let currentPage = 1;
        let y = margin;

        const addHeaderAndFooter = (pageNumber: number) => {
          pdf.setPage(pageNumber);
          pdf.setFontSize(10);
          pdf.setTextColor(100);
          pdf.text('Informe de Hallazgos de QA', margin, margin - 5);
          pdf.setLineWidth(0.5);
          pdf.line(margin, margin, pdfWidth - margin, margin);

          pdf.setTextColor(150);
          pdf.text(`Página ${pageNumber}`, pdfWidth - margin, pdfHeight - margin + 10, { align: 'right' });
        };
        
        // --- COVER PAGE ---
        const currentDate = new Date();
        const formattedDate = format(currentDate, 'dd / MM / yyyy');
        const evaluatedPeriod = format(currentDate, 'MMMM yyyy', { locale: es });
        const capitalizedPeriod = evaluatedPeriod.charAt(0).toUpperCase() + evaluatedPeriod.slice(1);
        const uniqueProcesses = [...new Set(allCases.map(tc => tc.proceso).filter(Boolean))];

        const coverHtml = `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; background-color: white; display: flex; flex-direction: column; justify-content: space-between; height: ${pdfHeight * (800 / pdfWidth)}px; padding: 60px; box-sizing: border-box;">
            <div style="text-align: center;">
              <h1 style="font-size: 32px; color: #5D54A4; margin: 0; font-weight: 600;">Informe de Hallazgos de QA</h1>
              <p style="font-size: 16px; color: #777; margin-top: 5px;">TESTWARE</p>
            </div>
            <div style="font-size: 14px; border-top: 1px solid #eee; border-bottom: 1px solid #eee; padding: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 10px; width: 50%;"><strong>Elaborado por:</strong> ${authorName}</td><td style="padding: 8px 10px; width: 50%;"><strong>Fecha:</strong> ${formattedDate}</td></tr>
                <tr><td style="padding: 8px 10px;" colspan="2"><strong>Período Evaluado:</strong> ${capitalizedPeriod}</td></tr>
              </table>
            </div>
            <div>
              <h2 style="font-size: 18px; border-bottom: 1px solid #ddd; padding-bottom: 8px; color: #444; font-weight: 600;">Procesos Evaluados</h2>
              <ul style="padding-left: 20px; list-style-type: disc; color: #555; line-height: 1.8; columns: 2;">${uniqueProcesses.map(p => `<li>${p}</li>`).join('')}</ul>
            </div>
            <div style="text-align: center; font-size: 12px; color: #aaa;"><p>TESTWARE - Reporte Confidencial</p></div>
          </div>`;
        
        reportContainer.innerHTML = coverHtml;
        const coverCanvas = await html2canvas(reportContainer.firstElementChild as HTMLElement, { scale: 2, useCORS: true });
        pdf.addImage(coverCanvas.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);

        // Helper for adding text with page breaks
        const addTextBox = (text: string, options: any) => {
            const { isTitle = false, isSubtitle = false, isCode = false, color = [0, 0, 0] } = options;
            
            pdf.setFont('helvetica', isTitle || isSubtitle ? 'bold' : 'normal');
            if (isCode) pdf.setFont('courier', 'normal');
            pdf.setFontSize(isTitle ? 18 : isSubtitle ? 10 : 10);
            pdf.setTextColor(color[0], color[1], color[2]);

            const lines = pdf.splitTextToSize(text || '-', isSubtitle ? contentWidth - 10 : contentWidth);
            const textHeight = lines.length * (isTitle ? 8 : 5) + (isSubtitle ? 2 : 4);
            
            if (y + textHeight > pdfHeight - margin) {
                pdf.addPage();
                currentPage++;
                addHeaderAndFooter(currentPage);
                y = margin + 5;
            }
            if (isSubtitle) {
                pdf.text(text, margin + 4, y);
                y += 6;
            } else {
                pdf.text(lines, margin, y);
                y += textHeight;
            }
        };

        // Helper to add a whole section with a title and body
        const addSection = (title: string, body: string, options: any = {}) => {
            pdf.addPage();
            currentPage++;
            addHeaderAndFooter(currentPage);
            y = margin + 5;

            addTextBox(title, { isTitle: true });
            y += 5;
            
            if (options.boxColor) {
                const bodyLines = pdf.splitTextToSize(body, contentWidth - 8);
                const bodyHeight = bodyLines.length * 5 + 12;
                pdf.setFillColor(options.boxColor.r, options.boxColor.g, options.boxColor.b);
                pdf.roundedRect(margin, y, contentWidth, bodyHeight, 3, 3, 'F');
                y += 6;
                pdf.text(bodyLines, margin + 4, y);
                y += bodyHeight - 2;
            } else {
                addTextBox(body, {});
            }
        };
        
        // --- REPORT SUMMARY ---
        if (reportDescription) {
            addSection('Resumen del Reporte', reportDescription, { boxColor: { r: 249, g: 249, b: 249 } });
        }
        
        // --- IMPACT ANALYSIS ---
        if (impactAnalysis) {
            addSection('Análisis de Impacto General', impactAnalysis, { boxColor: { r: 240, g: 244, b: 255 } });
        }
        
        // --- FAILED TEST CASES ---
        if (failedCases.length > 0) {
            pdf.addPage();
            currentPage++;
            addHeaderAndFooter(currentPage);
            y = margin + 5;
            addTextBox('Detalle de Casos de Prueba Fallidos', { isTitle: true });
            y += 5;

            for (const tc of failedCases) {
                const estimateHeight = (tc: TestCase) => {
                    let h = 20; // Header + padding
                    const fields = [tc.descripcion, tc.pasoAPaso, tc.datosPrueba, tc.resultadoEsperado, tc.comentarios];
                    fields.forEach(f => h += (pdf.splitTextToSize(f || '-', contentWidth - 8).length * 5 + 8));
                    if (tc.evidencia && tc.evidencia.startsWith('data:image')) {
                        h += 65; // Approximate image height + title
                    } else if (tc.evidencia) {
                        h += (pdf.splitTextToSize(tc.evidencia, contentWidth - 8).length * 5 + 8);
                    }
                    return h;
                };

                if (y + estimateHeight(tc) > pdfHeight - margin) {
                    pdf.addPage();
                    currentPage++;
                    addHeaderAndFooter(currentPage);
                    y = margin + 5;
                }

                const cardStartY = y;
                // Card Header
                pdf.setFillColor(245, 245, 245);
                pdf.rect(margin, y, contentWidth, 12, 'F');
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(12);
                pdf.setTextColor(51, 51, 51);
                pdf.text(`CASO: ${tc.casoPrueba} — ${tc.proceso}`, margin + 4, y + 8);
                y += 18;

                // Card Body
                addTextBox('Descripción:', { isSubtitle: true });
                addTextBox(tc.descripcion, {});
                addTextBox('Paso a Paso:', { isSubtitle: true });
                addTextBox(tc.pasoAPaso, { isCode: true });
                addTextBox('Datos de Prueba:', { isSubtitle: true });
                addTextBox(tc.datosPrueba, {});
                addTextBox('Resultado Esperado:', { isSubtitle: true });
                addTextBox(tc.resultadoEsperado, {});
                addTextBox('Comentarios de QA:', { isSubtitle: true, color: [192, 57, 43] });
                addTextBox(tc.comentarios, { color: [192, 57, 43] });

                // Evidence
                addTextBox('Evidencia:', { isSubtitle: true });
                if (tc.evidencia && tc.evidencia.startsWith('data:image')) {
                    try {
                        const img = new Image();
                        img.src = tc.evidencia;
                        await new Promise(resolve => img.onload = resolve);
                        
                        const imgWidth = contentWidth - 8;
                        const imgHeight = (img.height * imgWidth) / img.width;
                        const finalImgHeight = Math.min(imgHeight, pdfHeight / 3);
                        
                        if (y + finalImgHeight > pdfHeight - margin) {
                            pdf.addPage();
                            currentPage++;
                            addHeaderAndFooter(currentPage);
                            y = margin + 5;
                        }
                        pdf.addImage(tc.evidencia, 'PNG', margin + 4, y, imgWidth, finalImgHeight);
                        y += finalImgHeight + 5;
                    } catch(e) { /* ignore image error */ }
                } else if (tc.evidencia) {
                    addTextBox(tc.evidencia, { color: [41, 128, 185] });
                } else {
                    addTextBox('-', {});
                }
                
                pdf.setDrawColor(224, 224, 224);
                pdf.rect(margin, cardStartY, contentWidth, y - cardStartY, 'S');
                y += 10;
            }
        }

        // --- STATISTICS ---
        const pieChartEl = document.getElementById('pdf-pie-chart-card');
        const barChartEl = document.getElementById('pdf-bar-chart-card');
        
        if (pieChartEl && barChartEl) {
            pdf.addPage();
            currentPage++;
            addHeaderAndFooter(currentPage);
            y = margin + 5;
            addTextBox('Estadísticas y Visualización', { isTitle: true });
            y += 5;

            const addChart = async(element: HTMLElement, options: any) => {
                const canvas = await html2canvas(element, { scale: 3, backgroundColor: null, useCORS: true });
                const imgWidth = options.width;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                
                if (y + imgHeight > pdfHeight - margin) {
                    pdf.addPage(); currentPage++; addHeaderAndFooter(currentPage); y = margin + 5;
                }
                pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', options.x, y, imgWidth, imgHeight);
                return imgHeight;
            };
            
            const chartWidth = contentWidth / 2 - 5;
            const pieHeight = await addChart(pieChartEl, { width: chartWidth, x: margin });
            const barHeight = await addChart(barChartEl, { width: chartWidth, x: margin + chartWidth + 10 });

            y += Math.max(pieHeight, barHeight) + 10;
        }

        pdf.save(`reporte-fallos-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      } catch (error) {
        console.error("Error generating PDF:", error);
        toast({ title: "Error de PDF", description: "No se pudo generar el archivo PDF.", variant: "destructive" });
      } finally {
        if(reportContainer && reportContainer.parentNode) {
            document.body.removeChild(reportContainer);
        }
        setIsDownloadingPdf(false);
      }
    }, 50);
  }

  const resetDialog = () => {
    setImpactAnalysis(null);
    setReportDescription('');
    setAuthorName('');
    setIsLoading(false);
    setIsDownloadingPdf(false);
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
              <Button onClick={handleDownloadPdf} disabled={isDownloadingPdf}>
                {isDownloadingPdf ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Descargando...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Descargar PDF
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TestwareDashboard;
