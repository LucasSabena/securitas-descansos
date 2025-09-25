# 🛡️ Securitas - Planificador de Descansos

**Sistema de reservas de horarios de descanso para operadores de seguridad**

Esta aplicación web resuelve el problema de coordinación de descansos en turnos de trabajo. Los operadores pueden reservar sus 30 minutos de descanso por turno de manera justa y transparente, eliminando conflictos bajo el principio **First-Come, First-Served**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/LucasSabena/securitas-descansos)

---

## 🚀 Características Principales

### ⏰ **Sistema de Turnos Inteligente**
- **3 turnos configurados:** Mañana (06:45-14:45), Tarde (14:45-23:45), Noche (23:45-06:45)
- Slots de 10 minutos para máxima flexibilidad
- Visualización clara de disponibilidad en tiempo real

### 🔄 **Reservas en Tiempo Real**
- Sincronización instantánea con **Supabase Realtime**
- Actualizaciones automáticas sin recargar página
- Prevención de conflictos de concurrencia

### ⚡ **Gestión Flexible de Descansos**
- **30 minutos máximo por turno** por operador
- Múltiples combinaciones: `1×30min`, `2×15min`, `3×10min`
- Validación automática de límites
- Cancelación sencilla de reservas propias

### 🔐 **Autenticación Dual**
- **Google OAuth:** Para usuarios recurrentes con perfiles persistentes
- **Modo Invitado:** Acceso rápido sin registro (sesión local)
- Onboarding automático para nuevos usuarios OAuth

### 🎨 **Design System Corporativo**
---

## 🛠️ Stack Tecnológico

**Frontend moderno y robusto:**
- **[Next.js 15](https://nextjs.org/) + App Router** - Framework React con SSR optimizado
- **[TypeScript](https://www.typescriptlang.org/)** - Tipado estático para mayor confiabilidad
- **[Tailwind CSS v4](https://tailwindcss.com/)** - Utility-first CSS con design system personalizado
- **[React Hot Toast](https://react-hot-toast.com/)** - Notificaciones elegantes

**Backend como Servicio:**
- **[Supabase](https://supabase.io/)** - PostgreSQL + Auth + Realtime
- **Google OAuth** - Autenticación social segura
- **Row Level Security (RLS)** - Políticas de seguridad a nivel de base de datos

**Deployment & Hosting:**
- **[Vercel](https://vercel.com/)** - Hosting optimizado para Next.js
- **GitHub Actions** - CI/CD automático

---

## 🚀 Instalación Rápida

### 1️⃣ **Clonar y configurar**
```bash
git clone https://github.com/LucasSabena/securitas-descansos.git
cd securitas-descansos
npm install
```

### 2️⃣ **Configurar Supabase**
```bash
# Copiar variables de entorno
cp .env.example .env.local

# Editar .env.local con tus credenciales de Supabase:
# NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon_aqui
```

### 3️⃣ **Configurar Base de Datos**
Ejecuta este SQL en tu proyecto Supabase:

```sql
-- Crear tabla de perfiles
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  display_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de reservas
CREATE TABLE reservas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT NOT NULL,
  shift TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL
);

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Usuarios pueden ver todos los perfiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Usuarios pueden crear su propio perfil" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Usuarios pueden ver todas las reservas" ON reservas
  FOR SELECT USING (true);

CREATE POLICY "Usuarios pueden crear reservas" ON reservas
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Usuarios pueden eliminar sus propias reservas" ON reservas
  FOR DELETE USING (auth.uid() = user_id);
```

### 4️⃣ **Configurar Google OAuth**
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un proyecto y habilita Google+ API
3. En "Credenciales" → "OAuth 2.0" → Agregar URIs:
   - **Desarrollo:** `http://localhost:3000/auth/callback`
   - **Producción:** `https://tu-dominio.vercel.app/auth/callback`
4. En Supabase → Authentication → Settings → OAuth → Google → Pega Client ID y Secret

### 5️⃣ **Ejecutar**
```bash
npm run dev
```

🎉 **¡Listo!** Ve a `http://localhost:3000`
    *   Crea las tablas `profiles` y `reservas` como se especifica en la lógica de la aplicación.
    *   Crea un archivo `.env.local` en la raíz del proyecto.
    *   Copia tus claves de API de Supabase en el archivo:
      ```env
      NEXT_PUBLIC_SUPABASE_URL=TU_URL_DE_SUPABASE
      NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_CLAVE_ANON_DE_SUPABASE
      ```

---

## 📁 Estructura del Proyecto

```
securitas-descansos/
├── app/                    # Next.js App Router
│   ├── (main)/            # Rutas protegidas
│   │   ├── dashboard/     # Dashboard principal
│   │   └── layout.tsx     # Layout con auth guard
│   ├── auth/              # Autenticación
│   │   ├── login/         # Página de login
│   │   └── callback/      # OAuth callback
│   ├── welcome/           # Onboarding nuevos usuarios
│   ├── layout.tsx         # Layout global
│   └── globals.css        # Estilos globales + design system
├── components/            # Componentes reutilizables
├── lib/                   # Utilidades (Supabase client)
├── types/                 # Definiciones TypeScript
├── design_system.json     # Tokens de diseño
└── instrucciones.json     # Documentación del proyecto
```

## 🔄 Flujo de Usuario

1. **Acceso inicial:** `/` → Verifica sesión → Redirige según estado
2. **Sin sesión:** `/auth/login` → Google OAuth o modo invitado
3. **Primera vez OAuth:** `/welcome` → Configurar nombre de usuario
4. **Usuario válido:** `/dashboard` → Gestión de reservas

## 🚀 Deploy en Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/LucasSabena/securitas-descansos)

1. **Fork o clona** este repositorio
2. **Importa** en Vercel desde GitHub
3. **Configura** las variables de entorno en Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Deploy automático** en cada push a main

## 🛡️ Licencia

Este proyecto está bajo la licencia **MIT**. Ver [LICENSE](./LICENSE) para más detalles.

---

<div align="center">

**Desarrollado para Securitas** 🛡️  
*Sistema de gestión de descansos para operadores*

[**📋 Reporte de Issues**](https://github.com/LucasSabena/securitas-descansos/issues) • [**💡 Solicitar Feature**](https://github.com/LucasSabena/securitas-descansos/issues/new)

</div>