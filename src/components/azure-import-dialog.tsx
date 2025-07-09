"use client";

import React, { useState, useEffect } from 'react';
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
import { 
    getAzureOrganizationsAction,
    getAzureProjectsAction,
    getAzureTestPlansAction, 
    importFromAzureAction,
    type AzureOrganization,
    type AzureProject,
    type AzureTestPlan 
} from '@/app/actions';
import type { TestCase } from '@/lib/types';

interface AzureImportDialogProps {
  onImport: (cases: Omit<TestCase, 'id'>[]) => void;
  children?: React.ReactNode;
}

export const AzureImportDialog: React.FC<AzureImportDialogProps> = ({ onImport, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // State for the flow
  const [pat, setPat] = useState('');
  const [organizations, setOrganizations] = useState<AzureOrganization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [projects, setProjects] = useState<AzureProject[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [testPlans, setTestPlans] = useState<AzureTestPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  
  // Loading states
  const [isFetching, setIsFetching] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const { toast } = useToast();

  const handleFetchOrganizations = async () => {
    if (!pat) {
      toast({ title: "Token Requerido", description: "Por favor, ingresa un Personal Access Token (PAT).", variant: "destructive" });
      return;
    }
    setIsFetching(true);
    resetProjectSelection();
    resetOrgSelection();
    try {
      const result = await getAzureOrganizationsAction({ pat });
      if (result.success && result.organizations) {
        setOrganizations(result.organizations);
        if (result.organizations.length === 0) {
            toast({ title: "No se encontraron organizaciones", description: "Asegúrate de que el PAT tenga los permisos correctos.", variant: "default" });
        }
      } else {
        throw new Error(result.error || 'Error desconocido al buscar organizaciones.');
      }
    } catch (error: any) {
      toast({ title: "Error al buscar", description: error.message, variant: "destructive" });
    } finally {
      setIsFetching(false);
    }
  };
  
  // Use effects to chain the fetching
  useEffect(() => {
    const fetchProjects = async () => {
      if (!selectedOrg || !pat) return;
      
      setIsFetching(true);
      resetProjectSelection();
      try {
        const result = await getAzureProjectsAction({ organization: selectedOrg, pat });
        if (result.success && result.projects) {
          setProjects(result.projects);
           if (result.projects.length === 0) {
            toast({ title: "No se encontraron proyectos", description: "No se encontraron proyectos en esta organización.", variant: "default" });
          }
        } else {
          throw new Error(result.error || 'Error desconocido al buscar proyectos.');
        }
      } catch (error: any) {

        toast({ title: "Error al buscar", description: error.message, variant: "destructive" });
      } finally {
        setIsFetching(false);
      }
    };
    fetchProjects();
  }, [selectedOrg, pat, toast]);
  
  useEffect(() => {
    const fetchTestPlans = async () => {
      if (!selectedOrg || !selectedProject || !pat) return;

      setIsFetching(true);
      setTestPlans([]);
      setSelectedPlanId('');
      try {
        const result = await getAzureTestPlansAction({ organization: selectedOrg, project: selectedProject, pat });
        if (result.success && result.plans) {
          setTestPlans(result.plans);
          if (result.plans.length === 0) {
            toast({ title: "No se encontraron planes", description: "No se encontraron planes de prueba en este proyecto.", variant: "default" });
          }
        } else {
          throw new Error(result.error || 'Error desconocido al buscar planes.');
        }
      } catch (error: any) {

        toast({ title: "Error al buscar", description: error.message, variant: "destructive" });
      } finally {
        setIsFetching(false);
      }
    };
    fetchTestPlans();
  }, [selectedOrg, selectedProject, pat, toast]);

  const handleImport = async () => {
    if (!selectedPlanId) {
      toast({ title: "Selección Requerida", description: "Por favor, selecciona un plan de pruebas.", variant: "destructive" });
      return;
    }
    setIsImporting(true);
    try {
      const result = await importFromAzureAction({ organization: selectedOrg, project: selectedProject, planId: selectedPlanId, pat });
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
      setIsImporting(false);
    }
  };

  const resetDialog = () => {
    setPat('');
    resetOrgSelection();
    setIsFetching(false);
    setIsImporting(false);
  };
  
  const resetOrgSelection = () => {
    setOrganizations([]);
    setSelectedOrg('');
    resetProjectSelection();
  }

  const resetProjectSelection = () => {
      setProjects([]);
      setSelectedProject('');
      setTestPlans([]);
      setSelectedPlanId('');
  }

  const dialogTrigger = children || <Button variant="outline"><Cloud /> Importar desde Azure</Button>;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetDialog(); }}>
      <DialogTrigger asChild>{dialogTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar desde Azure DevOps</DialogTitle>
          <DialogDescription>
            Conéctate a tu cuenta para importar planes de prueba de forma dinámica.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
            <div className="space-y-2">
                <Label htmlFor="pat">Personal Access Token (PAT)</Label>
                <div className="flex gap-2">
                    <Input id="pat" type="password" placeholder="••••••••••••••••••" value={pat} onChange={(e) => setPat(e.target.value)} disabled={isFetching}/>
                    <Button onClick={handleFetchOrganizations} disabled={isFetching || !pat} className="w-40">
                        {isFetching && organizations.length === 0 ? <Loader2 className="animate-spin" /> : <Search />}
                        <span>Buscar</span>
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground pt-1">Tu PAT solo se usa para esta solicitud y no se almacena.</p>
            </div>
            
            {organizations.length > 0 && (
                <div className="space-y-2">
                    <Label htmlFor="organization">Organización</Label>
                    <Select value={selectedOrg} onValueChange={setSelectedOrg} disabled={isFetching}>
                        <SelectTrigger id="organization"><SelectValue placeholder="Selecciona una organización..." /></SelectTrigger>
                        <SelectContent>
                            {organizations.map(org => <SelectItem key={org.id} value={org.name}>{org.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            )}
            
            {selectedOrg && projects.length > 0 && (
                 <div className="space-y-2">
                    <Label htmlFor="project">Proyecto</Label>
                    <Select value={selectedProject} onValueChange={setSelectedProject} disabled={isFetching}>
                        <SelectTrigger id="project"><SelectValue placeholder="Selecciona un proyecto..." /></SelectTrigger>
                        <SelectContent>
                            {projects.map(proj => <SelectItem key={proj.id} value={proj.name}>{proj.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                 </div>
            )}
            
            {selectedProject && testPlans.length > 0 && (
                <div className="space-y-2">
                    <Label htmlFor="planId">Plan de Pruebas</Label>
                    <Select value={selectedPlanId} onValueChange={setSelectedPlanId} disabled={isFetching}>
                        <SelectTrigger id="planId"><SelectValue placeholder="Selecciona un plan..." /></SelectTrigger>
                        <SelectContent>
                            {testPlans.map(plan => <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {isFetching && organizations.length > 0 && (
                <div className="flex items-center justify-center pt-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary"/>
                    <p className="ml-2 text-muted-foreground">Buscando...</p>
                </div>
            )}
        </div>

        <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline" disabled={isImporting}>Cancelar</Button>
            </DialogClose>
            <Button onClick={handleImport} disabled={isImporting || !selectedPlanId}>
                {isImporting ? <Loader2 className="animate-spin" /> : <Download />}
                Importar Casos
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
