"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, memo, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
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

import { TestCase, TestCaseStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from "@/hooks/use-toast";
import { generateReportAction, generateImprovementReportAction } from '@/app/actions';
import { Upload, Download, Trash2, Bug, Lightbulb, Loader2, CheckCircle2, XCircle, FileQuestion, Hourglass, BarChart2, Filter, PieChart as PieChartIcon, LogIn, PlusCircle, Copy, LogOut, Share2, User as UserIcon, Power, PanelLeft, MoreVertical } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { db, auth } from "@/lib/firebase";
import { doc, setDoc, getDoc, onSnapshot, updateDoc, type Unsubscribe } from "firebase/firestore";
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';


const getImageDimensions = (dataUri: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = (err) => {
      console.error("Failed to load image for dimension calculation", err);
      reject(new Error("Failed to load image for dimension calculation"));
    };
    img.src = dataUri;
  });
};


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
      className={cn("h-8 w-8 text-primary", className)}
    >
      <path d="M12 8V2" />
      <path d="M4.93 4.93 3.51 3.51" />
      <path d="M2 12H8" />
      <path d="M4.93 19.07l-1.42 1.42" />
      <path d="M12 22v-6" />
      <path d="M19.07 19.07l-1.42-1.42" />
      <path d="M22 12h-6" />
      <path d="M19.07 4.93l-1.42 1.42" />
      <circle cx="12" cy="12" r="4" />
      <path d="M10 12c-2 2-2 5-2 5" />
      <path d="M14 12c2 2 2 5 2 5" />
      <path d="M9 7h6" />
    </svg>
);

const simpleUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const generateSessionCode = () => {
  const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const TestwareDashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const router = useRouter();

  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [filterProcess, setFilterProcess] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  const [isViewerMode, setIsViewerMode] = useState(false);
  const [joinAsViewer, setJoinAsViewer] = useState(false);
  const [viewerFilter, setViewerFilter] = useState<TestCaseStatus | 'all'>('all');

  const handleLeaveSession = useCallback(() => {
    setSessionCode(null);
    setTestCases([]);
    setInputCode('');
    setIsViewerMode(false);
    setViewerFilter('all');
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/');
      }
      setIsAuthLoading(false);
    });
    
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    let unsubscribeDb: Unsubscribe | undefined;

    if (sessionCode) {
      setIsLoadingSession(true);
      const sessionDocRef = doc(db, "sessions", sessionCode);

      unsubscribeDb = onSnapshot(sessionDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTestCases(data.testCases || []);
        } else {
          toast({ title: "Error de Sesión", description: "La sesión ya no existe.", variant: "destructive" });
          handleLeaveSession();
        }
        setIsLoadingSession(false);
      }, (error) => {
        console.error("Error listening to session:", error);
        toast({ title: "Error de Conexión", description: "No se pudo conectar a la sesión.", variant: "destructive" });
        setIsLoadingSession(false);
        handleLeaveSession();
      });
    }

    return () => {
      if (unsubscribeDb) {
        unsubscribeDb();
      }
    };
  }, [sessionCode, toast, handleLeaveSession]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const handleCreateSession = async () => {
    if (!db) {
      toast({ title: "Firebase no configurado", description: "Por favor, configura tus credenciales de Firebase.", variant: "destructive" });
      return;
    }
    setIsLoadingSession(true);
    const newCode = generateSessionCode();
    try {
      const sessionDocRef = doc(db, "sessions", newCode);
      await setDoc(sessionDocRef, { testCases: [], createdAt: new Date() });
      setSessionCode(newCode);
      setIsViewerMode(false); // Creator is always an editor
      toast({ title: "Sesión Creada", description: `El código es: ${newCode}` });
    } catch (error) {
      console.error("Error creating session:", error);
      toast({ title: "Error al crear sesión", variant: "destructive" });
    } finally {
      setIsLoadingSession(false);
    }
  };

  const handleJoinSession = async () => {
    if (!db) {
      toast({ title: "Firebase no configurado", variant: "destructive" });
      return;
    }
    if (!inputCode.trim()) {
      toast({ title: "Código requerido", description: "Por favor, ingresa un código de sesión.", variant: "destructive" });
      return;
    }
    setIsLoadingSession(true);
    try {
      const sessionDocRef = doc(db, "sessions", inputCode.trim().toUpperCase());
      const docSnap = await getDoc(sessionDocRef);
      if (docSnap.exists()) {
        setSessionCode(inputCode.trim().toUpperCase());
        setIsViewerMode(joinAsViewer);
        setViewerFilter('all');
      } else {
        toast({ title: "Sesión no encontrada", description: "El código ingresado no es válido.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error joining session:", error);
      toast({ title: "Error al unirse a la sesión", variant: "destructive" });
    } finally {
      setIsLoadingSession(false);
    }
  };

  const updateFirestoreTestCases = useCallback(async (updatedCases: TestCase[]) => {
    if (sessionCode) {
      try {
        const sessionDocRef = doc(db, "sessions", sessionCode);
        await updateDoc(sessionDocRef, { testCases: updatedCases });
      } catch (error) {
        console.error("Failed to sync with Firestore:", error);
        toast({ title: "Error de Sincronización", description: "No se pudieron guardar los cambios.", variant: "destructive" });
      }
    }
  }, [sessionCode, toast]);

  const processes = useMemo(() => ['all', ...Array.from(new Set(testCases.map(tc => tc.proceso))).filter(Boolean)], [testCases]);
  const failedCases = useMemo(() => testCases.filter(tc => tc.estado === 'Failed'), [testCases]);
  const commentedCases = useMemo(() => testCases.filter(tc => tc.comentarios?.trim()), [testCases]);

  const filteredCases = useMemo(() => {
    if (isViewerMode) {
      return viewerFilter === 'all'
        ? testCases
        : testCases.filter(tc => tc.estado === viewerFilter);
    }
    return testCases.filter(tc =>
      (filterProcess === 'all' || tc.proceso === filterProcess) &&
      (filterStatus === 'all' || tc.estado === filterStatus)
    );
  }, [testCases, filterProcess, filterStatus, isViewerMode, viewerFilter]);

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
        const newCases = json.map((c: any) => ({
            ...c,
            id: simpleUUID(),
            estado: c.estado || 'pending'
        }));
        
        const updatedCases = [...testCases, ...newCases];
        updateFirestoreTestCases(updatedCases);
        toast({ title: "Éxito", description: `${json.length} casos de prueba cargados.` });
      } catch (error) {
        console.error("Failed to parse or upload JSON", error);
        toast({ title: "Fallo la Carga", description: "Por favor, carga un archivo JSON válido.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpdate = useCallback((id: string, field: keyof TestCase, value: string | TestCaseStatus) => {
    const updatedCases = testCases.map(tc => {
        if (tc.id === id) {
            const newTc = { ...tc, [field]: value };
            if (field === 'estado') {
                newTc.updatedBy = user?.email || 'System';
                newTc.updatedAt = new Date();
            }
            return newTc;
        }
        return tc;
    });

    const testCaseToUpdate = updatedCases.find(tc => tc.id === id);
  
    if (field === 'estado' && value === 'Failed' && testCaseToUpdate) {
      if (!testCaseToUpdate.comentarios?.trim() || !testCaseToUpdate.evidencia?.trim()) {
        toast({
          title: "Información Requerida",
          description: "Comentarios y Evidencia son requeridos para marcar como Fallido.",
          variant: "destructive",
        });
      }
    }
    updateFirestoreTestCases(updatedCases);
  }, [testCases, toast, updateFirestoreTestCases, user]);
  
  const handleDeleteTestCase = useCallback((id: string) => {
    const updatedCases = testCases.filter(tc => tc.id !== id);
    updateFirestoreTestCases(updatedCases);
    toast({ title: "Caso de prueba eliminado", variant: "destructive" });
  }, [testCases, toast, updateFirestoreTestCases]);

  const handleClearData = () => {
    updateFirestoreTestCases([]);
    toast({ title: "Datos eliminados", description: "Todos los casos de prueba han sido eliminados.", variant: "destructive" });
  };
  
  const handleCopyCode = () => {
    if (sessionCode) {
      navigator.clipboard.writeText(sessionCode);
      toast({ title: "Copiado", description: "Código de sesión copiado al portapapeles." });
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Verificando autenticación...</p>
      </div>
    );
  }
  
  if (!sessionCode) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
         <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between">
              <div className="flex gap-2 items-center">
                <TestwareLogo/>
                <h1 className="text-2xl font-bold tracking-tight font-headline">TESTWARE</h1>
              </div>
              <div className="flex items-center gap-4">
                  {user && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <UserIcon className="h-4 w-4" />
                      <span>{user?.email}</span>
                    </div>
                  )}
                  <Button variant="outline" onClick={handleLogout}><Power /> Cerrar Sesión</Button>
              </div>
            </div>
          </header>
          <main className="flex-1 flex flex-col items-center justify-center p-4">
            <Card className="w-full max-w-md p-8 shadow-2xl">
              <CardHeader className="text-center p-0 mb-6">
                <CardTitle className="text-2xl">Colaboración en Tiempo Real</CardTitle>
                <CardDescription>Crea una sesión para empezar o únete a una existente con un código.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 space-y-6">
                <div className="space-y-4">
                  <Label htmlFor="session-code" className="font-semibold">Unirse a una Sesión</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="session-code"
                      placeholder="Ingresa el código"
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value)}
                      className="text-center tracking-widest font-mono"
                      maxLength={6}
                    />
                    <Button onClick={handleJoinSession} disabled={isLoadingSession} className="w-1/3">
                      {isLoadingSession ? <Loader2 className="animate-spin" /> : <LogIn />}
                      Unirse
                    </Button>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3 mt-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="viewer-mode">Modo Espectador</Label>
                      <p className="text-xs text-muted-foreground">
                        Solo verás el progreso, no podrás editar.
                      </p>
                    </div>
                    <Switch
                      id="viewer-mode"
                      checked={joinAsViewer}
                      onCheckedChange={setJoinAsViewer}
                    />
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">O</span>
                  </div>
                </div>
                <Button onClick={handleCreateSession} disabled={isLoadingSession} variant="outline" className="w-full">
                  <PlusCircle /> Crear Nueva Sesión
                </Button>
              </CardContent>
            </Card>
          </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground font-body">
      {!isViewerMode && (
        <>
          <div className="hidden md:block">
            <Sidebar 
              stats={stats}
              processes={processes}
              filterProcess={filterProcess}
              setFilterProcess={setFilterProcess}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
            />
          </div>
           <Sheet open={isMobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
            <SheetContent side="left" className="p-0 w-80">
              <SheetHeader className="sr-only">
                <SheetTitle>Menú Principal</SheetTitle>
              </SheetHeader>
              <Sidebar 
                stats={stats}
                processes={processes}
                filterProcess={filterProcess}
                setFilterProcess={setFilterProcess}
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
              />
            </SheetContent>
          </Sheet>
        </>
      )}

      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between">
            <div className="flex gap-2 items-center">
                {!isViewerMode && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setMobileSidebarOpen(true)}
                  >
                    <PanelLeft />
                    <span className="sr-only">Toggle Menu</span>
                  </Button>
                )}
              <TestwareLogo className="hidden sm:block"/>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-headline">TESTWARE</h1>
            </div>
            <div className="flex items-center justify-end space-x-1 md:space-x-2">
              <div className="flex items-center gap-2 bg-muted p-2 rounded-lg">
                <span className="hidden sm:inline text-sm font-semibold text-muted-foreground">SESIÓN:</span>
                <span className="font-mono font-bold text-primary">{sessionCode}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyCode}><Copy className="h-4 w-4"/></Button>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".json" className="hidden" id="json-upload" />
              
              {!isViewerMode && (
                <div className="hidden sm:flex items-center space-x-2">
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}><Upload /> Cargar JSON</Button>
                  <ImprovementReportDialog commentedCases={commentedCases} allCases={testCases} stats={stats}/>
                  <FailureReportDialog failedCases={failedCases} allCases={testCases} />
                  <ClearAllConfirmationDialog onConfirm={handleClearData} disabled={!testCases.length} />
                </div>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!isViewerMode && (
                    <>
                      <DropdownMenuItem className="sm:hidden" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2"/> Cargar JSON</DropdownMenuItem>
                      <DropdownMenuSub className="sm:hidden">
                        <DropdownMenuSubTrigger><Bug className="mr-2"/> Informes</DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                             <ImprovementReportDialog commentedCases={commentedCases} allCases={testCases} stats={stats}>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Informe de Observaciones ({commentedCases.length})</DropdownMenuItem>
                             </ImprovementReportDialog>
                             <FailureReportDialog failedCases={failedCases} allCases={testCases}>
                               <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Informe de Fallos ({failedCases.length})</DropdownMenuItem>
                             </FailureReportDialog>
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                      <DropdownMenuItem className="sm:hidden" onClick={handleClearData}><Trash2 className="mr-2"/> Limpiar Todo</DropdownMenuItem>
                      <DropdownMenuSeparator className="sm:hidden"/>
                    </>
                  )}
                  <DropdownMenuItem onClick={handleLeaveSession}><LogOut /> Terminar Sesión</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}><Power /> Cerrar Sesión</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8">
          {isLoadingSession ? (
             <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-4">Cargando sesión...</p>
             </div>
          ) : isViewerMode ? (
              <ViewerDashboardContent
                stats={stats}
                cases={filteredCases}
                currentFilter={viewerFilter}
                setFilter={setViewerFilter}
              />
          ) : !testCases.length ? (
              <div className="text-center py-20">
                <Share2 className="mx-auto h-12 w-12 text-muted-foreground" />
                <h2 className="text-2xl font-semibold mt-4">Sesión Lista para Colaborar</h2>
                <p className="text-muted-foreground mt-2">Carga un archivo JSON o comparte el código de la sesión para empezar.</p>
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

const ClearAllConfirmationDialog = ({ onConfirm, disabled }) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="destructive" disabled={disabled}><Trash2 /> Limpiar Todo</Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
        <AlertDialogDescription>
          Esta acción no se puede deshacer. Esto eliminará permanentemente todos los casos de prueba de la sesión actual.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm}>Sí, limpiar todo</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);


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
      <aside className="w-full h-full md:w-80 bg-card border-r p-6 space-y-8 md:sticky top-0 md:h-screen overflow-y-auto">
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

const ViewerDashboardContent = ({ stats, cases, currentFilter, setFilter }) => {
    const chartData = useMemo(() => [
        { name: 'Aprobados', value: stats.passed, fill: 'hsl(var(--chart-1))' },
        { name: 'Fallidos', value: stats.failed, fill: 'hsl(var(--chart-2))' },
        { name: 'N/A', value: stats.na, fill: 'hsl(var(--chart-3))' },
        { name: 'Pendientes', value: stats.pending, fill: 'hsl(var(--chart-4))' },
    ], [stats]);

    const chartConfig = {
      value: { label: 'Casos' },
      Aprobados: { label: 'Aprobados', color: 'hsl(var(--chart-1))' },
      Fallidos: { label: 'Fallidos', color: 'hsl(var(--chart-2))' },
      'N/A': { label: 'N/A', color: 'hsl(var(--chart-3))' },
      Pendientes: { label: 'Pendientes', color: 'hsl(var(--chart-4))' },
    } satisfies ChartConfig;

    const handleFilterClick = (status: TestCaseStatus) => {
        setFilter(current => current === status ? 'all' : status);
    };

    if (stats.total === 0) {
      return (
        <div className="text-center py-20">
          <Hourglass className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="text-2xl font-semibold mt-4">Esperando Casos de Prueba</h2>
          <p className="text-muted-foreground mt-2">El panel de espectador se activará en cuanto se carguen datos a la sesión.</p>
        </div>
      );
    }
    
    return (
        <div className="space-y-8">
            <div className="text-center">
                <h2 className="text-3xl font-bold tracking-tight">Panel de Espectador</h2>
                <p className="text-muted-foreground">Estás viendo el progreso de la sesión en tiempo real. No puedes realizar ediciones.</p>
            </div>
            
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle>Progreso General</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-center text-muted-foreground">{stats.completed} de {stats.total} casos completados</p>
                    <div className="w-full bg-muted rounded-full h-4">
                        <div className="bg-primary h-4 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground" style={{ width: `${stats.progress}%` }}>
                           {stats.progress}%
                        </div>
                    </div>
                     <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div onClick={() => handleFilterClick('Passed')} className={cn("p-3 bg-green-100 dark:bg-green-900/50 rounded-lg cursor-pointer transition-transform hover:scale-105", {'ring-2 ring-primary': currentFilter === 'Passed'})}><p className="text-2xl font-bold text-green-600">{stats.passed}</p><p className="text-sm font-medium text-muted-foreground">Aprobados</p></div>
                        <div onClick={() => handleFilterClick('Failed')} className={cn("p-3 bg-red-100 dark:bg-red-900/50 rounded-lg cursor-pointer transition-transform hover:scale-105", {'ring-2 ring-primary': currentFilter === 'Failed'})}><p className="text-2xl font-bold text-red-600">{stats.failed}</p><p className="text-sm font-medium text-muted-foreground">Fallidos</p></div>
                        <div onClick={() => handleFilterClick('pending')} className={cn("p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg cursor-pointer transition-transform hover:scale-105", {'ring-2 ring-primary': currentFilter === 'pending'})}><p className="text-2xl font-bold text-yellow-600">{stats.pending}</p><p className="text-sm font-medium text-muted-foreground">Pendientes</p></div>
                        <div onClick={() => handleFilterClick('N/A')} className={cn("p-3 bg-gray-100 dark:bg-gray-900/50 rounded-lg cursor-pointer transition-transform hover:scale-105", {'ring-2 ring-primary': currentFilter === 'N/A'})}><p className="text-2xl font-bold text-gray-500">{stats.na}</p><p className="text-sm font-medium text-muted-foreground">N/A</p></div>
                    </div>
                </CardContent>
            </Card>

            {currentFilter !== 'all' && (
              <div className="space-y-6">
                 <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-bold">
                    Viendo {cases.length} caso(s) con estado "{statusMap[currentFilter]}"
                  </h3>
                  <Button variant="outline" onClick={() => setFilter('all')}>Mostrar Todos</Button>
                </div>
                {cases.map((tc) => (
                  <TestCaseCard key={tc.id} testCase={tc} isViewerMode={true} />
                ))}
                {cases.length === 0 && (
                   <div className="text-center py-10 text-muted-foreground">No hay casos con el estado "{statusMap[currentFilter]}".</div>
                )}
              </div>
            )}

            {currentFilter === 'all' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                  <Card id="viewer-pie-chart-card">
                      <CardHeader className="items-center pb-2">
                          <CardTitle>Visión General</CardTitle>
                      </CardHeader>
                      <CardContent>
                          <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[350px]">
                              <RechartsPieChart>
                                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                                  <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={70} strokeWidth={5}>
                                      {chartData.map((entry) => <Cell key={`cell-${entry.name}`} fill={entry.fill} />)}
                                  </Pie>
                              </RechartsPieChart>
                          </ChartContainer>
                      </CardContent>
                  </Card>
                  <Card id="viewer-bar-chart-card">
                      <CardHeader className="items-center pb-2">
                          <CardTitle>Resumen por Estado</CardTitle>
                      </CardHeader>
                      <CardContent>
                          <ChartContainer config={chartConfig} className="w-full h-[350px]">
                              <BarChart accessibilityLayer data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                                  <YAxis dataKey="name" type="category" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={(value) => value} width={80} />
                                  <XAxis dataKey="value" type="number" hide />
                                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                                  <Bar dataKey="value" layout="vertical" radius={5}>
                                      {chartData.map((entry) => <Cell key={`cell-${entry.name}`} fill={entry.fill} />)}
                                  </Bar>
                              </BarChart>
                          </ChartContainer>
                      </CardContent>
                  </Card>
              </div>
            )}
        </div>
    );
};

const TestCaseCard = memo(({ testCase, onUpdate, onDelete, isViewerMode = false }: { testCase: TestCase, onUpdate?: Function, onDelete?: Function, isViewerMode?: boolean }) => {
  const evidenceInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleEvidenceSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (isViewerMode) return;
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
      onUpdate?.(testCase.id, 'evidencia', dataUrl);
    };
    reader.onerror = (err) => {
        toast({ title: "Error al leer el archivo", description: "No se pudo procesar la imagen seleccionada.", variant: "destructive" });
        console.error("Error reading file:", err);
    }
    reader.readAsDataURL(file);
  };
  
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    try {
      return format(date, 'Pp', { locale: es });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  return (
    <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardHeader className="flex flex-row items-start justify-between bg-card p-4 border-b">
        <div className="flex-grow pr-4">
          <CardTitle className="font-headline text-lg tracking-tight">{testCase.proceso}</CardTitle>
          <p className="font-mono text-sm text-muted-foreground mt-1">{testCase.casoPrueba}</p>
           {testCase.updatedBy && testCase.updatedAt && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
              <UserIcon className="h-3 w-3" />
              <p>
                Actualizado por <strong>{testCase.updatedBy}</strong>
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
            <Select
              value={testCase.estado}
              onValueChange={(value) => onUpdate?.(testCase.id, 'estado', value as TestCaseStatus)}
              disabled={isViewerMode}
            >
              <SelectTrigger className="w-[150px] font-semibold" disabled={isViewerMode}>
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
            {!isViewerMode && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. Esto eliminará permanentemente el caso de prueba.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete?.(testCase.id)}>Eliminar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
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
              key={`comments-${testCase.id}`} // Force re-render if case changes
              defaultValue={testCase.comentarios}
              onBlur={(e) => onUpdate?.(testCase.id, 'comentarios', e.target.value)}
              className="min-h-[100px] bg-background/50"
              placeholder={testCase.estado === 'Failed' ? 'Razón del fallo requerida' : 'Comentarios adicionales...'}
              readOnly={isViewerMode}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`evidence-input-${testCase.id}`} className="font-semibold">Evidencia</Label>
            <div className="flex items-center gap-2">
              <Input
                id={`evidence-input-${testCase.id}`}
                key={`evidence-${testCase.id}`}
                defaultValue={testCase.evidencia}
                onBlur={e => onUpdate?.(testCase.id, 'evidencia', e.target.value)}
                placeholder={testCase.estado === 'Failed' ? 'URL de evidencia requerida' : 'Pega la URL o carga una imagen'}
                className="bg-background/50"
                readOnly={isViewerMode}
              />
               {!isViewerMode && (
                <>
                  <input
                    type="file"
                    ref={evidenceInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleEvidenceSelect}
                    disabled={isViewerMode}
                  />
                  <Button variant="outline" onClick={() => evidenceInputRef.current?.click()} disabled={isViewerMode}>
                    <Upload className="h-4 w-4"/>
                  </Button>
                </>
              )}
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

const FailureReportDialog: React.FC<{ failedCases: TestCase[]; allCases: TestCase[]; children?: React.ReactNode }> = ({ failedCases, allCases, children }) => {
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
    const aiCases = failedCases.map(({ id, updatedBy, updatedAt, ...rest }) => ({ ...rest, estado: 'Fallido' as const }));
    
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

  const handleDownloadPdf = async () => {
    if (isDownloadingPdf) return;
    setIsDownloadingPdf(true);

    try {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 15;
        const contentWidth = pdfWidth - (margin * 2);
        let y = margin;
        
        const addPageWithHeader = (title: string, pageNumber: number) => {
            if (pageNumber > 1) {
              pdf.addPage();
            }
            y = margin;
            pdf.setFontSize(10).setTextColor(100);
            pdf.text(title, margin, y);
            pdf.text(`Página ${pageNumber}`, pdfWidth - margin, y, { align: 'right' });
            y += 4;
            pdf.setLineWidth(0.5).line(margin, y, pdfWidth - margin, y);
            y += 8;
        };

        const addTextBox = (text: string, options: any = {}) => {
            const { fontSize = 10, fontStyle = 'normal', isCode = false, color = [0, 0, 0] } = options;
            pdf.setFont('helvetica', fontStyle);
            if (isCode) pdf.setFont('courier', 'normal');
            pdf.setFontSize(fontSize).setTextColor(color[0], color[1], color[2]);
            
            const lines = pdf.splitTextToSize(text || '-', contentWidth);
            const textHeight = (pdf.getLineHeight() / pdf.internal.scaleFactor) * lines.length;

            if (y + textHeight > pdfHeight - margin) {
                pdf.addPage();
                y = margin;
                pdf.setFontSize(10).setTextColor(100);
                pdf.text('Informe de Hallazgos de QA (cont.)', margin, y);
                y += 12;
            }
            pdf.text(lines, margin, y);
            y += textHeight + 4;
        };

        // --- PAGE 1: COVER ---
        const currentDate = new Date();
        const uniqueProcesses = [...new Set(allCases.map(tc => tc.proceso).filter(Boolean))];
        
        y = 60;
        pdf.setFontSize(32).setFont('helvetica', 'bold').setTextColor(93, 84, 164).text('Informe de Hallazgos de QA', pdfWidth / 2, y, { align: 'center' });
        y += 10;
        pdf.setFontSize(16).setFont('helvetica', 'normal').setTextColor(119, 119, 119).text('TESTWARE', pdfWidth / 2, y, { align: 'center' });
        
        y = 110;
        addTextBox(`Elaborado por: ${authorName}`, { fontSize: 12 });
        y += 2;
        addTextBox(`Fecha: ${format(currentDate, 'dd / MM / yyyy')}`, { fontSize: 12 });
        y += 2;
        const capitalizedPeriod = format(currentDate, 'MMMM yyyy', { locale: es }).replace(/^\w/, c => c.toUpperCase());
        addTextBox(`Período Evaluado: ${capitalizedPeriod}`, { fontSize: 12 });
        y += 10;
        addTextBox('Procesos Evaluados:', { fontSize: 14, fontStyle: 'bold' });
        addTextBox(uniqueProcesses.join(', '), { fontSize: 12 });

        // --- PAGE 2: SUMMARY ---
        pdf.addPage();
        y = margin;
        addTextBox('Resumen del Reporte', { fontSize: 18, fontStyle: 'bold' });
        addTextBox(reportDescription, { fontSize: 11 });


        // --- PAGE 3: IMPACT ANALYSIS ---
        if (impactAnalysis) {
            pdf.addPage();
            y = margin;
            addTextBox('Análisis de Impacto General (Generado por IA)', { fontSize: 18, fontStyle: 'bold' });
            addTextBox(impactAnalysis, { fontSize: 11 });
        }
        
        // --- SUBSEQUENT PAGES: FAILED TEST CASES ---
        if (failedCases.length > 0) {
            pdf.addPage();
            y = margin;
            addTextBox('Detalle de Casos de Prueba Fallidos', { fontSize: 18, fontStyle: 'bold' });
            y += 5;
            
            for (const tc of failedCases) {
                const cardStartY = y;
                
                let estimatedHeight = 25;
                const fieldsToEstimate = [tc.descripcion, tc.pasoAPaso, tc.datosPrueba, tc.resultadoEsperado, tc.comentarios];
                fieldsToEstimate.forEach(field => {
                  estimatedHeight += (pdf.splitTextToSize(field || '-', contentWidth).length * (pdf.getLineHeight() / pdf.internal.scaleFactor) + 4);
                })
                if (tc.evidencia && tc.evidencia.startsWith('data:image')) {
                    estimatedHeight += 50;
                } else if (tc.evidencia) {
                    estimatedHeight += 15;
                }

                if (y + estimatedHeight > pdfHeight - margin) {
                   pdf.addPage();
                   y = margin;
                   addTextBox('Detalle de Casos de Prueba Fallidos (cont.)', { fontSize: 16, fontStyle: 'bold' });
                   y += 5;
                }

                const headerText = `CASO: ${tc.casoPrueba} — ${tc.proceso}`;
                addTextBox(headerText, { fontSize: 12, fontStyle: 'bold' });
                y += 2;
                
                const renderField = (label: string, value: string, isCode = false, color = [0,0,0]) => {
                  if (!value) return;
                  addTextBox(label, { fontSize: 10, fontStyle: 'bold' });
                  addTextBox(value, { isCode, color, fontSize: 10 });
                }

                renderField('Descripción:', tc.descripcion);
                renderField('Paso a Paso:', tc.pasoAPaso, true);
                renderField('Datos de Prueba:', tc.datosPrueba);
                renderField('Resultado Esperado:', tc.resultadoEsperado);
                renderField('Comentarios de QA:', tc.comentarios, false, [192, 57, 43]);
                
                addTextBox('Evidencia:', { fontSize: 10, fontStyle: 'bold' });
                if (tc.evidencia && tc.evidencia.startsWith('data:image')) {
                    try {
                        const { width, height } = await getImageDimensions(tc.evidencia);
                        const imgWidth = contentWidth / 2;
                        const imgHeight = (height * imgWidth) / width;
                        
                        if (y + imgHeight > pdfHeight - margin) {
                          pdf.addPage();
                          y = margin;
                        }
                        pdf.addImage(tc.evidencia, 'PNG', margin, y, imgWidth, imgHeight, undefined, 'FAST');
                        y += imgHeight + 5;
                    } catch (e) { addTextBox('Error al cargar imagen', {}); }
                } else if (tc.evidencia) {
                    addTextBox(tc.evidencia, { color: [41, 128, 185], fontSize: 10 });
                } else {
                    addTextBox('-', { fontSize: 10 });
                }
                
                y += 10;
                pdf.setLineWidth(0.2).line(margin, y, pdfWidth - margin, y);
                y += 10;
            }
        }
        
        // --- LAST PAGE: STATISTICS ---
        pdf.addPage();
        y = margin;
        addTextBox('Estadísticas y Visualización', { fontSize: 18, fontStyle: 'bold' });

        const pieChartEl = document.getElementById('pdf-pie-chart-card');
        const barChartEl = document.getElementById('pdf-bar-chart-card');
        
        if (pieChartEl && barChartEl) {
          const addChart = async (element: HTMLElement) => {
              const canvas = await html2canvas(element, { scale: 3, backgroundColor: '#ffffff', useCORS: true });
              return canvas.toDataURL('image/png', 1.0);
          };
          
          const pieImgData = await addChart(pieChartEl);
          const barImgData = await addChart(barChartEl);

          const chartWidth = contentWidth / 2 - 5;

          const pieDimensions = await getImageDimensions(pieImgData);
          const barDimensions = await getImageDimensions(barImgData);
          
          const pieHeight = pieDimensions.width > 0 ? (pieDimensions.height * chartWidth) / pieDimensions.width : 0;
          const barHeight = barDimensions.width > 0 ? (barDimensions.height * chartWidth) / barDimensions.width : 0;

          if (pieHeight > 0 && barHeight > 0) {
              if (y + Math.max(pieHeight, barHeight) > pdfHeight - margin) {
                pdf.addPage();
                y = margin;
                addTextBox('Estadísticas y Visualización (cont.)', { fontSize: 16, fontStyle: 'bold' });
              }

              pdf.addImage(pieImgData, 'PNG', margin, y, chartWidth, pieHeight, undefined, 'FAST');
              pdf.addImage(barImgData, 'PNG', margin + chartWidth + 10, y, chartWidth, barHeight, undefined, 'FAST');
          }
        }

        pdf.save(`reporte-fallos-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
        console.error("Error generating PDF:", error);
        toast({ title: "Error de PDF", description: "No se pudo generar el archivo PDF.", variant: "destructive" });
    } finally {
        setIsDownloadingPdf(false);
    }
  };

  const resetDialog = () => {
    setImpactAnalysis(null);
    setReportDescription('');
    setAuthorName('');
    setIsLoading(false);
  }

  const dialogTrigger = children || <Button variant="destructive" disabled={!failedCases.length}><Bug /> Informe de Fallos ({failedCases.length})</Button>;

  return (
    <Dialog onOpenChange={(open) => !open && resetDialog()}>
      <DialogTrigger asChild>{dialogTrigger}</DialogTrigger>
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
              <Label htmlFor="author-name-failure" className="font-semibold">Elaborado por</Label>
              <Input
                id="author-name-failure"
                placeholder="Ingresa tu nombre completo"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="report-description-failure" className="font-semibold">Resumen del Reporte</Label>
              <Textarea
                id="report-description-failure"
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

const ImprovementReportDialog: React.FC<{ commentedCases: TestCase[]; allCases: TestCase[]; stats: any, children?: React.ReactNode }> = ({ commentedCases, allCases, stats, children }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
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
    setAnalysis(null);
    const aiCases = commentedCases.map(({ id, updatedAt, updatedBy, ...rest }) => rest);
    
    try {
      const result = await generateImprovementReportAction({ commentedTestCases: aiCases, reportDescription });
      setAnalysis(result.improvementAnalysis);
    } catch (error) {
      console.error("Error generating improvement report from AI", error);
      toast({ title: "Fallo la Generación del Reporte", description: "Ocurrió un error al contactar a la IA.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    try {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 15;
        const contentWidth = pdfWidth - (margin * 2);
        let y = margin;

        const addTextBox = (text: string, options: any = {}) => {
            const { fontSize = 10, fontStyle = 'normal', isCode = false, color = [0, 0, 0] } = options;
            pdf.setFont('helvetica', fontStyle);
            if (isCode) pdf.setFont('courier', 'normal');
            pdf.setFontSize(fontSize).setTextColor(color[0], color[1], color[2]);

            const lines = pdf.splitTextToSize(text || '-', contentWidth);
            const textHeight = (pdf.getLineHeight() / pdf.internal.scaleFactor) * lines.length;

            if (y + textHeight > pdfHeight - margin) {
                pdf.addPage();
                y = margin;
                pdf.setFontSize(10).setTextColor(100);
                pdf.text('Informe de Observaciones (cont.)', margin, y);
                y += 12;
            }
            pdf.text(lines, margin, y);
            y += textHeight + 4;
        };

        // --- PAGE 1: COVER ---
        const currentDate = new Date();
        const uniqueProcesses = [...new Set(allCases.map(tc => tc.proceso).filter(Boolean))];
        
        y = 60;
        pdf.setFontSize(32).setFont('helvetica', 'bold').setTextColor(93, 84, 164).text('Informe de Observaciones', pdfWidth / 2, y, { align: 'center' });
        y += 10;
        pdf.setFontSize(16).setFont('helvetica', 'normal').setTextColor(119, 119, 119).text('TESTWARE', pdfWidth / 2, y, { align: 'center' });
        
        y = 110;
        addTextBox(`Elaborado por: ${authorName}`, { fontSize: 12 });
        y += 2;
        addTextBox(`Fecha: ${format(currentDate, 'dd / MM / yyyy')}`, { fontSize: 12 });
        y += 2;
        const capitalizedPeriod = format(currentDate, 'MMMM yyyy', { locale: es }).replace(/^\w/, c => c.toUpperCase());
        addTextBox(`Período Evaluado: ${capitalizedPeriod}`, { fontSize: 12 });
        y += 10;
        addTextBox('Procesos Evaluados:', { fontSize: 14, fontStyle: 'bold' });
        addTextBox(uniqueProcesses.join(', '), { fontSize: 12 });
        y += 10;

        // --- PAGE 2: SUMMARY & AI ANALYSIS ---
        pdf.addPage();
        y = margin;
        addTextBox('Resumen del Reporte', { fontSize: 18, fontStyle: 'bold' });
        addTextBox(reportDescription, { fontSize: 11 });
        y += 5;

        if (analysis) {
            addTextBox('Análisis de Mejoras y Observaciones (IA)', { fontSize: 18, fontStyle: 'bold' });
            addTextBox(analysis, { fontSize: 11 });
            y += 5;

            const conclusionText = 'Se deja constancia de que la ejecución de los casos de prueba se ha completado satisfactoriamente, cumpliendo con los resultados esperados para los flujos evaluados. Las observaciones detalladas en este informe tienen como único fin la mejora continua del producto y no representan fallos funcionales.';
            addTextBox('Conclusión General', { fontSize: 14, fontStyle: 'bold' });
            addTextBox(conclusionText, { fontSize: 11, fontStyle: 'italic', color: [100, 100, 100] });
        }
        
        // --- SUBSEQUENT PAGES: COMMENTED TEST CASES ---
        if (commentedCases.length > 0) {
            pdf.addPage();
            y = margin;
            addTextBox('Detalle de Casos de Prueba Comentados', { fontSize: 18, fontStyle: 'bold' });
            y += 5;
            
            for (const tc of commentedCases) {
                const statusColor = tc.estado === 'Failed' ? '#e53935' : tc.estado === 'Passed' ? '#43a047' : '#757575';
                
                let estimatedHeight = 25;
                const fieldsToEstimate = [tc.descripcion, tc.pasoAPaso, tc.datosPrueba, tc.resultadoEsperado, tc.comentarios];
                fieldsToEstimate.forEach(field => {
                  estimatedHeight += (pdf.splitTextToSize(field || '-', contentWidth).length * (pdf.getLineHeight() / pdf.internal.scaleFactor) + 4);
                })
                if (tc.evidencia) estimatedHeight += (tc.evidencia.startsWith('data:image') ? 50 : 15);

                if (y + estimatedHeight > pdfHeight - margin) {
                    pdf.addPage();
                    y = margin;
                    addTextBox('Detalle de Casos de Prueba Comentados (cont.)', { fontSize: 16, fontStyle: 'bold' });
                    y += 5;
                }
                const startYForStatus = y;
                addTextBox(`CASO: ${tc.casoPrueba} — ${tc.proceso}`, { fontSize: 12, fontStyle: 'bold' });
                pdf.setFont('helvetica', 'bold').setFontSize(10).setTextColor(statusColor);
                pdf.text(`[${statusMap[tc.estado]}]`, pdfWidth - margin, startYForStatus + 4, { align: 'right' }); 
                y += 2;
                
                const renderField = (label: string, value: string, isCode = false, color = [0,0,0]) => {
                  if (!value) return;
                  addTextBox(label, { fontSize: 10, fontStyle: 'bold' });
                  addTextBox(value, { isCode, color, fontSize: 10 });
                }

                renderField('Descripción:', tc.descripcion);
                renderField('Paso a Paso:', tc.pasoAPaso, true);
                renderField('Datos de Prueba:', tc.datosPrueba);
                renderField('Resultado Esperado:', tc.resultadoEsperado);
                if(tc.comentarios) {
                  renderField('Comentarios:', tc.comentarios, false, tc.estado === 'Failed' ? [192, 57, 43] : [0, 0, 0]);
                }
                
                addTextBox('Evidencia:', { fontSize: 10, fontStyle: 'bold' });
                if (tc.evidencia && tc.evidencia.startsWith('data:image')) {
                    try {
                        const { width, height } = await getImageDimensions(tc.evidencia);
                        const imgWidth = contentWidth / 2;
                        const imgHeight = (height * imgWidth) / width;
                        if (y + imgHeight > pdfHeight - margin) {
                          pdf.addPage();
                          y = margin;
                        }
                        pdf.addImage(tc.evidencia, 'PNG', margin, y, imgWidth, imgHeight, undefined, 'FAST');
                        y += imgHeight + 5;
                    } catch (e) { addTextBox('Error al cargar imagen', {}); }
                } else if (tc.evidencia) {
                    addTextBox(tc.evidencia, { color: [41, 128, 185], fontSize: 10 });
                } else {
                    addTextBox('-', { fontSize: 10 });
                }
                
                y += 10;
                pdf.setLineWidth(0.2).line(margin, y, pdfWidth - margin, y);
                y += 10;
            }
        }

        // --- LAST PAGE: STATISTICS ---
        pdf.addPage();
        y = margin;
        addTextBox('Estadísticas y Visualización', { fontSize: 18, fontStyle: 'bold' });

        const pieChartEl = document.getElementById('pdf-pie-chart-card');
        const barChartEl = document.getElementById('pdf-bar-chart-card');
        
        if (pieChartEl && barChartEl) {
          const addChart = async (element: HTMLElement) => {
              const canvas = await html2canvas(element, { scale: 3, backgroundColor: '#ffffff', useCORS: true });
              return canvas.toDataURL('image/png', 1.0);
          };
          
          const pieImgData = await addChart(pieChartEl);
          const barImgData = await addChart(barChartEl);

          const chartWidth = contentWidth / 2 - 5;
          
          const pieDimensions = await getImageDimensions(pieImgData);
          const barDimensions = await getImageDimensions(barImgData);

          const pieHeight = pieDimensions.width > 0 ? (pieDimensions.height * chartWidth) / pieDimensions.width : 0;
          const barHeight = barDimensions.width > 0 ? (barDimensions.height * chartWidth) / barDimensions.width : 0;

          if (pieHeight > 0 && barHeight > 0) {
            if (y + Math.max(pieHeight, barHeight) > pdfHeight - margin) {
              pdf.addPage();
              y = margin;
              addTextBox('Estadísticas y Visualización (cont.)', { fontSize: 16, fontStyle: 'bold' });
            }

            pdf.addImage(pieImgData, 'PNG', margin, y, chartWidth, pieHeight, undefined, 'FAST');
            pdf.addImage(barImgData, 'PNG', margin + chartWidth + 10, y, chartWidth, barHeight, undefined, 'FAST');
          }
        }
        
        pdf.save(`reporte-observaciones-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
        console.error("Error generating PDF:", error);
        toast({ title: "Error de PDF", description: "No se pudo generar el archivo PDF.", variant: "destructive" });
    } finally {
        setIsDownloadingPdf(false);
    }
  };

  const resetDialog = () => {
    setAnalysis(null);
    setReportDescription('');
    setAuthorName('');
    setIsLoading(false);
    setIsDownloadingPdf(false);
  };
  
  const dialogTrigger = children || <Button variant="outline" disabled={!commentedCases.length}><Lightbulb /> Informe de Observaciones ({commentedCases.length})</Button>;

  return (
    <Dialog onOpenChange={(open) => !open && resetDialog()}>
      <DialogTrigger asChild>{dialogTrigger}</DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Generar Informe de Observaciones con IA</DialogTitle>
        </DialogHeader>
        
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="ml-4">Generando análisis de mejoras...</p>
          </div>
        )}

        {!isLoading && !analysis && (
           <div className="space-y-4 py-4">
            <p>Genera un reporte inteligente para los {commentedCases.length} caso(s) de prueba que tienen comentarios. La IA analizará los comentarios para sugerir mejoras y observaciones.</p>
            <div>
              <Label htmlFor="author-name-improvement" className="font-semibold">Elaborado por</Label>
              <Input
                id="author-name-improvement"
                placeholder="Ingresa tu nombre completo"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="report-description-improvement" className="font-semibold">Resumen del Reporte</Label>
              <Textarea
                id="report-description-improvement"
                placeholder="Proporciona un resumen general o contexto. La IA lo usará para su análisis."
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                className="mt-2 min-h-[100px]"
              />
            </div>
            <Button onClick={handleGenerate} className="w-full bg-primary hover:bg-primary/90">Generar Análisis de IA</Button>
          </div>
        )}
        
        {!isLoading && analysis && (
          <>
            <div className="space-y-4 py-2">
                <h3 className="font-semibold">Análisis de Mejoras y Observaciones (IA):</h3>
                 <div className="max-h-[30vh] overflow-y-auto p-4 bg-muted/50 rounded-md">
                    <pre className="whitespace-pre-wrap font-sans text-sm">{analysis}</pre>
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

    
