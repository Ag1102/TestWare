"use client";

import React, { useState, useEffect, useMemo, useRef, type ChangeEvent } from 'react';
import { AITestCase, TestCase, TestCaseStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie } from 'recharts';
import { useToast } from "@/hooks/use-toast";
import { generateReportAction } from '@/app/actions';
import { Upload, Download, Trash2, FileText, Loader2, BarChart, List, Wind } from 'lucide-react';

const TestWaveDashboard: React.FC = () => {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [filterProcess, setFilterProcess] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [view, setView] = useState<'table' | 'stats'>('table');
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
    return { total, passed, failed, na, pending };
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
        toast({ title: "Success", description: `${newCases.length} test cases loaded.` });
      } catch (error) {
        console.error("Failed to parse JSON", error);
        toast({ title: "Upload Failed", description: "Please upload a valid JSON file.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpdate = (id: string, field: keyof TestCase, value: string | TestCaseStatus) => {
    setTestCases(prev => prev.map(tc => tc.id === id ? { ...tc, [field]: value } : tc));
  };

  const handleExportJson = () => {
    const dataStr = JSON.stringify(testCases, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `testwave_export_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported!", description: "Test cases saved to JSON file." });
  };

  const handleClearData = () => {
    setTestCases([]);
    localStorage.removeItem('testwave-cases');
    toast({ title: "Data Cleared", description: "All test cases have been removed.", variant: "destructive" });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
          <div className="flex gap-2 items-center">
            <Wind className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight font-headline">TestWave</h1>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-2">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".json" className="hidden" id="json-upload" />
            <Button onClick={() => fileInputRef.current?.click()}><Upload /> Upload JSON</Button>
            <Button variant="secondary" onClick={handleExportJson} disabled={!testCases.length}><Download /> Export JSON</Button>
            <FailureReportDialog failedCases={testCases.filter(tc => tc.estado === 'Failed')} />
            <Button variant="destructive" onClick={handleClearData} disabled={!testCases.length}><Trash2 /> Clear All</Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8">
        {!testCases.length ? (
            <div className="text-center py-20">
              <h2 className="text-2xl font-semibold">Welcome to TestWave</h2>
              <p className="text-muted-foreground mt-2">Upload a JSON file to get started with your test cases.</p>
              <Button onClick={() => fileInputRef.current?.click()} className="mt-6">
                <Upload className="mr-2" /> Upload Your First File
              </Button>
            </div>
          ) : (
          <>
            <div className="md:hidden mb-4">
              <Select value={view} onValueChange={(v) => setView(v as 'table' | 'stats')}>
                <SelectTrigger>
                  <SelectValue placeholder="Change view" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="table"><List className="inline-block mr-2 h-4 w-4"/> Test Cases</SelectItem>
                  <SelectItem value="stats"><BarChart className="inline-block mr-2 h-4 w-4"/> Statistics</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              <div className={`md:col-span-2 lg:col-span-3 ${view === 'table' ? '' : 'hidden md:block'}`}>
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <CardTitle>Test Cases</CardTitle>
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Select value={filterProcess} onValueChange={setFilterProcess}>
                          <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Filter by process..." />
                          </SelectTrigger>
                          <SelectContent>
                            {processes.map(p => <SelectItem key={p} value={p}>{p === 'all' ? 'All Processes' : p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                          <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Filter by status..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="Passed">Passed</SelectItem>
                            <SelectItem value="Failed">Failed</SelectItem>
                            <SelectItem value="N/A">N/A</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <TestCaseTable testCases={filteredCases} onUpdate={handleUpdate} />
                  </CardContent>
                </Card>
              </div>

              <div className={`md:col-span-1 lg:col-span-1 ${view === 'stats' ? '' : 'hidden md:block'}`}>
                <StatsDashboard stats={stats} />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

const TestCaseTable: React.FC<{testCases: TestCase[], onUpdate: (id: string, field: keyof TestCase, value: string | TestCaseStatus) => void}> = ({ testCases, onUpdate }) => {
  if (testCases.length === 0) {
    return <div className="text-center py-10 text-muted-foreground">No test cases match the current filters.</div>;
  }
  return (
    <div className="w-full overflow-x-auto">
      <Table className="min-w-max">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[150px]">Process</TableHead>
            <TableHead className="w-[120px]">Case ID</TableHead>
            <TableHead className="min-w-[250px]">Description</TableHead>
            <TableHead className="min-w-[200px]">Steps</TableHead>
            <TableHead className="min-w-[200px]">Expected Result</TableHead>
            <TableHead className="min-w-[150px]">Test Data</TableHead>
            <TableHead className="min-w-[250px]">Comments</TableHead>
            <TableHead className="min-w-[200px]">Evidence</TableHead>
            <TableHead className="w-[150px] sticky right-0 bg-card">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {testCases.map((tc) => (
            <TableRow key={tc.id}>
              <TableCell><Input value={tc.proceso} onChange={e => onUpdate(tc.id, 'proceso', e.target.value)} /></TableCell>
              <TableCell><Input value={tc.casoPrueba} onChange={e => onUpdate(tc.id, 'casoPrueba', e.target.value)} /></TableCell>
              <TableCell><div className="text-sm whitespace-pre-wrap w-full">{tc.descripcion}</div></TableCell>
              <TableCell><div className="text-sm whitespace-pre-wrap w-full">{tc.pasoAPaso}</div></TableCell>
              <TableCell><Textarea value={tc.resultadoEsperado} onChange={e => onUpdate(tc.id, 'resultadoEsperado', e.target.value)} className="min-h-[60px]" /></TableCell>
              <TableCell><Input value={tc.datosPrueba} onChange={e => onUpdate(tc.id, 'datosPrueba', e.target.value)} /></TableCell>
              <TableCell><Textarea value={tc.comentarios} onChange={e => onUpdate(tc.id, 'comentarios', e.target.value)} className="min-h-[60px]" /></TableCell>
              <TableCell>
                <Input value={tc.evidencia} onChange={e => onUpdate(tc.id, 'evidencia', e.target.value)} placeholder="Image/video URL" />
                {tc.evidencia && <img src={tc.evidencia} alt="Evidence preview" data-ai-hint="evidence screenshot" className="mt-2 rounded-md object-cover max-h-24" onError={(e) => (e.currentTarget.style.display = 'none')} />}
              </TableCell>
              <TableCell className="sticky right-0 bg-card">
                <Select value={tc.estado || 'pending'} onValueChange={(value: TestCaseStatus) => onUpdate(tc.id, 'estado', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Set status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Passed">Passed</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                    <SelectItem value="N/A">N/A</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const StatsDashboard: React.FC<{stats: {total: number, passed: number, failed: number, na: number, pending: number}}> = ({ stats }) => {
  const chartData = [
    { name: 'Passed', value: stats.passed, fill: 'hsl(var(--chart-3))' },
    { name: 'Failed', value: stats.failed, fill: 'hsl(var(--chart-2))' },
    { name: 'N/A', value: stats.na, fill: 'hsl(var(--chart-5))' },
    { name: 'Pending', value: stats.pending, fill: 'hsl(var(--muted))' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Statistics</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-4 bg-muted/50 rounded-lg"><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">Total</p></div>
            <div className="p-4 bg-muted/50 rounded-lg"><p className="text-2xl font-bold text-green-600">{stats.passed}</p><p className="text-sm text-muted-foreground">Passed</p></div>
            <div className="p-4 bg-muted/50 rounded-lg"><p className="text-2xl font-bold text-red-600">{stats.failed}</p><p className="text-sm text-muted-foreground">Failed</p></div>
            <div className="p-4 bg-muted/50 rounded-lg"><p className="text-2xl font-bold text-gray-500">{stats.na + stats.pending}</p><p className="text-sm text-muted-foreground">Pending / N/A</p></div>
          </div>
        </CardContent>
      </Card>
      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Status Breakdown</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="mx-auto aspect-square h-[250px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const FailureReportDialog: React.FC<{ failedCases: TestCase[] }> = ({ failedCases }) => {
  const [report, setReport] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const reportContentRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setReport(null);
    const aiCases: AITestCase[] = failedCases.map(({ id, estado, ...rest }) => ({ ...rest, estado: 'Fallido' }));
    
    try {
      const result = await generateReportAction({ failedTestCases: aiCases });
      setReport(result.report);
    } catch (error) {
      toast({ title: "Report Generation Failed", description: "An error occurred while contacting the AI.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    const content = reportContentRef.current?.innerHTML;
    if (!content) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: "Print Error", description: "Please allow pop-ups to print the report.", variant: "destructive"});
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>TestWave Failure Report</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Source+Code+Pro&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; margin: 2rem; color: #333; }
            h1 { color: #A085CF; border-bottom: 2px solid #A085CF; padding-bottom: 0.5rem; }
            h2 { font-size: 1.25rem; margin-top: 2rem; border-bottom: 1px solid #ccc; padding-bottom: 0.25rem; }
            pre { background-color: #f0f0f5; padding: 1rem; border-radius: 0.5rem; white-space: pre-wrap; word-wrap: break-word; font-family: 'Source Code Pro', monospace; }
            img { max-width: 100%; height: auto; border-radius: 0.5rem; margin-top: 1rem; }
          </style>
        </head>
        <body>
          <h1>TestWave Failure Report</h1>
          ${content.replace(/<pre>/g, '<div>').replace(/<\/pre>/g, '</div>')}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
  }

  return (
    <Dialog onOpenChange={(open) => !open && setReport(null)}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={!failedCases.length}><FileText /> Generate Failure Report ({failedCases.length})</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Failure Report</DialogTitle>
        </DialogHeader>
        {!report && !isLoading && (
          <div className="text-center py-8">
            <p>Generate a detailed report for all {failedCases.length} failed test cases using AI.</p>
            <Button onClick={handleGenerate} className="mt-4">Generate Report</Button>
          </div>
        )}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="ml-4">Generating your report...</p>
          </div>
        )}
        {report && (
          <>
            <div ref={reportContentRef} className="prose prose-sm max-h-[60vh] overflow-y-auto p-4 bg-muted/50 rounded-md">
              <pre className="whitespace-pre-wrap font-sans">{report}</pre>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">Close</Button>
              </DialogClose>
              <Button onClick={handlePrint}><Download /> Download as PDF</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TestWaveDashboard;
