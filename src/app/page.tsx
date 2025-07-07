"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogIn } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { cn } from "@/lib/utils";

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


const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!auth) {
      setIsCheckingAuth(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/dashboard');
      } else {
        setIsCheckingAuth(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
        toast({ title: "Error de Configuración", description: "Firebase no está configurado.", variant: "destructive" });
        return;
    }
    if (!email || !password) {
      toast({ title: "Campos requeridos", description: "Por favor, ingresa tu correo y contraseña.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Inicio de sesión exitoso", description: "Redirigiendo al panel..." });
    } catch (error: any) {
      console.error("Login error:", error.code);
      let description = "Ocurrió un error inesperado.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = "Credenciales incorrectas. Por favor, verifica tu correo y contraseña.";
      }
      toast({ title: "Error de inicio de sesión", description, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground font-body">
      <div className="flex gap-2 items-center mb-8">
        <TestwareLogo className="h-10 w-10"/>
        <h1 className="text-4xl font-bold tracking-tight font-headline">TESTWARE</h1>
      </div>
      <Card className="w-full max-w-md p-8 shadow-2xl">
        <CardHeader className="text-center p-0 mb-6">
          <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
          <CardDescription>Ingresa tus credenciales para acceder a tu panel.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : <LogIn />}
              Ingresar
            </Button>
          </form>
        </CardContent>
      </Card>
      {!auth && (
        <div className="mt-8 text-center text-red-500 max-w-md">
          <p className="font-bold">Error de Configuración de Firebase</p>
          <p className="text-sm">Las funciones de la aplicación están desactivadas. Por favor, asegúrate de que tus variables de entorno de Firebase estén configuradas correctamente.</p>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
