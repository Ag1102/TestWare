"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Cloud, Download, Search } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { getAzureTestPlansAction, importFromAzureAction, type AzureTestPlan } from '@/app/actions';
import type { TestCase } from '@/lib/types';
import { simpleUUID } from '@/lib/utils';

interface AzureImportDialogProps {
  onImport: (cases: Omit<TestCase, 'id'>[]) => void;
  children?: React.ReactNode;
}

export const AzureImportDialog: React.FC<AzureImportDialogProps> = ({ onImport, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingPlans, setIsFetchingPlans] = useState(false);
  const [step, setStep] = useState<'config' | 'select'>('config');
  
  const [azureData, setAzureData] = useState({
    organization: '',
    project: '',
    pat: '',
  });
  const [testPlans, setTestPlans] = useState<AzureTestPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setAzureData(prev => ({ ...prev, [id]: value }));
  };

  const handleFetchPlans = async () => {
    const { organization, project, pat } = azureData;
    if (!organization || !project || !pat) {
      toast({ title: "Campos Requeridos", description: "Todos los campos son obligatorios para buscar planes.", variant: "destructive" });
      return;
    }
    setIsFetchingPlans(true);
    try {
      const result = await getAzureTestPlansAction({ organization, project, pat });
      if (result.success && result.plans) {
        if (result.plans.length === 0) {
            toast({ title: "No se encontraron planes", description: "No se encontraron planes de prueba en el proyecto especificado.", variant: "default" });
        }
        setTestPlans(result.plans);
        setStep('select');
      } else {
        throw new Error(result.error || 'Error desconocido al buscar planes de prueba.');
      }
    } catch (error: any) {
      toast({ title: "Error al buscar", description: error.message, variant: "destructive" });
    } finally {
      setIsFetchingPlans(false);
    }
  };

  const handleImport = async () => {
    if (!selectedPlanId) {
      toast({ title: "Selección Requerida", description: "Por favor, selecciona un plan de pruebas.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const result = await importFromAzureAction({ ...azureData, planId: selectedPlanId });
      
      if (result.success && result.testCases) {
        onImport(result.testCases);
        toast({ title: "Importación Exitosa", description: `${result.testCases.length} casos de prueba importados.` });
        setIsOpen(false);
      } else {
        throw new Error(result.error || 'Error desconocido al importar desde Azure.');
      }
    } catch (error: any) {
      toast({ title: "Error de Importación", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const resetDialog = () => {
    setAzureData({ organization: '', project: '', pat: '' });
    setTestPlans([]);
    setSelectedPlanId('');
    setStep('config');
    setIsLoading(false);
    setIsFetchingPlans(false);
  };

  const dialogTrigger = children || <Button variant="outline"><Cloud /> Importar desde Azure</Button>;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetDialog(); }}>
      <DialogTrigger asChild>{dialogTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar desde Azure DevOps</DialogTitle>
          <DialogDescription>
            {step === 'config'
              ? "Ingresa los detalles de tu proyecto para buscar planes de prueba."
              : "Selecciona un plan de pruebas de la lista para importar los casos."}
          </DialogDescription>
        </DialogHeader>
        
        {step === 'config' && (
            <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="organization">Organización</Label>
                <Input id="organization" placeholder="tu_organizacion" value={azureData.organization} onChange={handleInputChange} disabled={isFetchingPlans}/>
            </div>
            <div className="space-y-2">
                <Label htmlFor="project">Proyecto</Label>
                <Input id="project" placeholder="Nombre del Proyecto" value={azureData.project} onChange={handleInputChange} disabled={isFetchingPlans}/>
            </div>
            <div className="space-y-2">
                <Label htmlFor="pat">Personal Access Token (PAT)</Label>
                <Input id="pat" type="password" placeholder="••••••••••••••••••" value={azureData.pat} onChange={handleInputChange} disabled={isFetchingPlans}/>
                <p className="text-xs text-muted-foreground pt-1">Tu PAT solo se usa para esta solicitud y no se almacena.</p>
            </div>
            </div>
        )}

        {step === 'select' && (
          <div className="py-4">
             <Label htmlFor="planId">Plan de Pruebas</Label>
             <Select value={selectedPlanId} onValueChange={setSelectedPlanId} disabled={isLoading}>
                <SelectTrigger id="planId" className="w-full mt-2">
                    <SelectValue placeholder="Selecciona un plan..." />
                </SelectTrigger>
                <SelectContent>
                    {testPlans.map(plan => (
                        <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                    ))}
                </SelectContent>
             </Select>
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          {step === 'select' && (
             <Button variant="ghost" onClick={() => setStep('config')} disabled={isLoading}>Atrás</Button>
          )}
          <div className="flex gap-2">
            <DialogClose asChild>
                <Button variant="outline" disabled={isLoading || isFetchingPlans}>Cancelar</Button>
            </DialogClose>
            {step === 'config' ? (
                 <Button onClick={handleFetchPlans} disabled={isFetchingPlans}>
                    {isFetchingPlans ? <Loader2 className="animate-spin" /> : <Search />}
                    Buscar Planes
                </Button>
            ) : (
                <Button onClick={handleImport} disabled={isLoading || !selectedPlanId}>
                    {isLoading ? <Loader2 className="animate-spin" /> : <Download />}
                    Importar
                </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
