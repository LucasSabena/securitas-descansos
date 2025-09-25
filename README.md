# Planificador de Descansos para Operadores

Esta es una aplicación web diseñada para solucionar un problema común en entornos de trabajo por turnos: la coordinación de los tiempos de descanso. Permite a los operadores reservar sus bloques de descanso de forma justa y transparente, eliminando conflictos y discusiones bajo el principio de "primero en llegar, primero en ser servido".

![Captura de Pantalla del Dashboard](URL_DE_TU_CAPTURA_DE_PANTALLA_AQUI)  <!-- Sube una captura a GitHub y pega el link aquí -->

---

## 🚀 Funcionalidades Principales

*   **Sistema de Turnos:** Visualización clara de los horarios disponibles según los tres turnos rotativos.
*   **Reservas en Tiempo Real:** Gracias a las suscripciones de Supabase, cuando un usuario reserva un horario, la disponibilidad se actualiza instantáneamente para todos los demás sin necesidad de recargar la página.
*   **Gestión de Descansos:**
    *   Cada usuario dispone de un total de 30 minutos de descanso por turno.
    *   Puede reservar su tiempo en bloques de 10, 20 o 30 minutos.
    *   La aplicación valida y bloquea la posibilidad de reservar más tiempo del permitido.
*   **Autenticación Flexible:**
    *   **Login Social con Google:** Para usuarios recurrentes, permitiendo una autenticación segura y rápida.
    *   **Modo Invitado:** Para un acceso rápido y sin registro, ideal para nuevos operadores o uso esporádico. La sesión de invitado se guarda localmente en el navegador.
*   **Perfiles de Usuario Persistentes:** Los usuarios que se registran con Google deben establecer un nombre de visualización la primera vez que inician sesión, el cual será permanente y visible para los demás.
*   **Cancelación de Reservas:** Los usuarios autenticados pueden cancelar sus propias reservas, liberando el horario para otros en tiempo real.

---

## 🛠️ Stack Tecnológico

Este proyecto fue construido utilizando un stack moderno, eficiente y enfocado en la gratuidad de los servicios para un despliegue de bajo costo.

*   **Framework Frontend:** [**Next.js (App Router)**](https://nextjs.org/) - Para una aplicación React robusta, rápida y con renderizado en el lado del servidor.
*   **Lenguaje:** [**TypeScript**](https://www.typescriptlang.org/) - Para un código más seguro, mantenible y con una mejor experiencia de desarrollo.
*   **Estilos:** [**Tailwind CSS**](https://tailwindcss.com/) - Un framework "utility-first" para un diseño rápido, consistente y personalizable, configurado con la sintaxis de la v4.
*   **Backend como Servicio (BaaS):** [**Supabase**](https://supabase.io/)
    *   **Base de Datos:** PostgreSQL.
    *   **Autenticación:** Manejo de usuarios, login social con Google y seguridad a nivel de fila (RLS).
    *   **Realtime:** Suscripciones a la base de datos para la sincronización instantánea de la UI.
*   **Alojamiento:** [**Vercel**](https://vercel.com/) - Plataforma de despliegue optimizada para Next.js con integración continua y un generoso plan gratuito.
*   **Notificaciones:** [**React Hot Toast**](https://react-hot-toast.com/) - Para notificaciones "toast" elegantes y no intrusivas.

---

## ⚙️ Cómo Empezar Localmente

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git
    cd TU_REPOSITORIO
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configurar las variables de entorno:**
    *   Crea una cuenta en [Supabase](https://supabase.io/) y un nuevo proyecto.
    *   Crea las tablas `profiles` y `reservas` como se especifica en la lógica de la aplicación.
    *   Crea un archivo `.env.local` en la raíz del proyecto.
    *   Copia tus claves de API de Supabase en el archivo:
      ```env
      NEXT_PUBLIC_SUPABASE_URL=TU_URL_DE_SUPABASE
      NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_CLAVE_ANON_DE_SUPABASE
      ```

4.  **Ejecutar el servidor de desarrollo:**
    ```bash
    npm run dev
    ```

5.  Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la aplicación.

---

¡Felicidades de nuevo por llegar hasta aquí! Ha sido un placer trabajar contigo en este proyecto.