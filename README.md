# TestWare

**TestWare** es una aplicación web moderna y colaborativa diseñada para optimizar el proceso de ejecución de pruebas de QA. Centraliza la gestión de casos de prueba en un entorno interactivo, en tiempo real y potenciado con inteligencia artificial para generar informes inteligentes.

---

## 🚀 Características Principales

### 🔐 Autenticación de Usuarios

- Acceso restringido mediante inicio de sesión seguro.
- Los usuarios se gestionan desde Firebase Authentication.
- Sin registro público: control total sobre quién accede.

### ⚙️ Creación y Unión a Sesiones

- Usuarios autenticados pueden crear sesiones con códigos únicos de 6 caracteres.
- Otros miembros se conectan a sesiones existentes mediante estos códigos.

### 👁️ Modo Espectador (Solo Lectura)

- Acceso limitado a visualización de la sesión.
- Ideal para stakeholders: clientes, gerentes, etc.

### ⏰ Cierre Automático por Inactividad

- Las sesiones se cierran tras 20 minutos sin cambios.
- Notificación al usuario al cerrarse.

### ❌ Doble Control de Salida

- **Terminar sesión**: Salir de la sesión actual.
- **Cerrar sesión**: Salir completamente de la app.

---

## 🔹 Gestión de Casos de Prueba

### ⇩ Carga Masiva desde JSON

- Importa casos de prueba desde archivos `.json`.

### 📂 Interfaz de Tarjetas

- Cada caso se presenta en una tarjeta editable con todos sus campos:
  - Proceso
  - ID
  - Descripción
  - Datos de prueba
  - Pasos
  - Resultado esperado

### ✏️ Edición en Línea

- Todos los campos son editables directamente en la interfaz.

### 🔒 Gestión de Estado y Auditoría

- Estados disponibles: Aprobado, Fallido, N/A, Pendiente.
- Se registra quién hizo el cambio y cuándo.

### 📷 Evidencia Adjunta

- Se puede adjuntar una URL o imagen.
- Previsualización directa en la tarjeta.

### ⚠️ Operaciones Protegidas

- Eliminación de casos o sesión completa requiere confirmación.

---

## 🌐 Panel de Control y Estadísticas

### ⚖️ Estadísticas en Tiempo Real

- Porcentaje completado.
- Cantidad por estado: Aprobado, Fallido, N/A, Pendiente.

### 📊 Visualización de Datos

- Gráficos de torta y barras.
- Vista rápida del estado general de ejecución.

### 🔍 Filtros Dinámicos

- Filtrado por Proceso y Estado.

---

## 🧰 Inteligencia Artificial

### 📄 Informe de Fallos (PDF)

- Reporte con todos los casos fallidos.
- Contexto personalizado y datos del autor.
- Análisis de impacto generado por IA.

### 📊 Informe de Observaciones (PDF)

- A partir de comentarios.
- Análisis de mejoras, observaciones clave y sugerencias.

---

## 🌐 Interfaz y Estilo

### 💡 Diseño Responsivo

- Compatible con escritorio, tablet y móvil.

### 🎨 Estética Moderna

- Colores: Morado, gris, turquesa.
- Tipografías: Inter, Source Code Pro.
- Basado en la librería de componentes **ShadCN**.

---

## 📂 Tecnologías Usadas

- **Next.js** + **React**
- **Firebase (Auth + Firestore)**
- **TailwindCSS**
- **ShadCN UI**
- **AI Toolkit** (para generación de informes)

---

## 🚧 Por Hacer / Mejoras Futuras

- Configuración avanzada de permisos por rol.
- Exportación de informes en Excel.
- Integración con plataformas de bug tracking (Jira, Trello).

---

## ✨ Contribuciones

Las contribuciones están abiertas. Sólo usuarios autorizados mediante Firebase podrán acceder a entornos productivos.

---

## 🙏 Autor

**TestWare** fue creada para optimizar la eficiencia y trazabilidad en procesos de QA modernos, promoviendo colaboración, seguridad y análisis inteligente.

