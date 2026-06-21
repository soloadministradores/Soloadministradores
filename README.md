# Centinela

Registro de moderación entre comunidades: administradores reportan usuarios
problemáticos, el propietario aprueba cada caso, y queda visible un mapa de
conexiones entre comunidades y personas reportadas.

## ⚠️ Antes de nada: seguridad

Esta app **no usa autenticación real** (Firebase Auth). El login de
administrador es solo una verificación dentro de la app, y las reglas de
Firestore (`firestore.rules`) están abiertas: cualquiera con tu
configuración pública de Firebase podría leer o escribir los datos
directamente, sin pasar por la pantalla de login. Esto incluye los números
de teléfono de las personas reportadas.

Es aceptable para un equipo chico de confianza que solo va a compartir el
link entre ustedes. Si esto crece o vas a manejar más datos sensibles,
conviene agregar Firebase Authentication más adelante y restringir las
reglas a usuarios autenticados — avisame si llegás a ese punto y te ayudo
con la migración.

---

## 1. Crear el proyecto en Firebase

1. Andá a [console.firebase.google.com](https://console.firebase.google.com) y creá un proyecto nuevo.
2. Dentro del proyecto, click en el ícono web `</>` para "Agregar app" → registrala con cualquier nombre (ej. "centinela-web").
3. Firebase te muestra un objeto `firebaseConfig`. Copialo entero.
4. Abrí `src/firebase.js` en este proyecto y reemplazá el bloque `firebaseConfig` por el que copiaste.
5. En el menú lateral de Firebase, andá a **Build → Firestore Database** → "Crear base de datos" → modo producción → elegí una región.
6. Andá a la pestaña **Reglas** de Firestore y pegá el contenido de `firestore.rules` (ya viene en este proyecto). Publicá.

## 2. Probarlo en tu computadora

Necesitás [Node.js](https://nodejs.org) instalado (versión 18 o más).

```bash
npm install
npm run dev
```

Abrí la URL que te muestra la terminal (normalmente `http://localhost:5173`). Probá registrarte como admin, aprobarte desde el panel del propietario (contraseña en `src/App.jsx`, constante `OWNER_PASSWORD` — cambiala antes de desplegar), y enviar un reporte.

## 3. Subir el código a GitHub

```bash
git init
git add .
git commit -m "Centinela: primera versión"
```

Creá un repositorio nuevo en [github.com/new](https://github.com/new) (puede ser privado), y luego:

```bash
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git branch -M main
git push -u origin main
```

`node_modules` y `dist` no se suben gracias al `.gitignore` que ya incluye este proyecto.

> Nota: `src/firebase.js` queda en el repo con tu configuración de Firebase. Esos valores son públicos por diseño (no son contraseñas secretas), así que no hay problema en que estén en el código — pero si el repo es público, cualquiera puede verlos, lo cual es normal y esperado en proyectos Firebase.

## 4. Desplegar con Firebase Hosting

Esta es la forma más simple, ya que estás en el mismo ecosistema que la base de datos.

```bash
npm install -g firebase-tools
firebase login
firebase init
```

En `firebase init`:
- Elegí **Hosting** y **Firestore**.
- Seleccioná el proyecto que ya creaste.
- Directorio público: `dist`
- Configurar como single-page app: **Sí**
- No sobrescribas `firestore.rules` si te pregunta (ya está listo).

Luego, cada vez que quieras publicar cambios:

```bash
npm run build
firebase deploy
```

Al terminar te da una URL tipo `https://tu-proyecto.web.app` — ese es el sitio que les compartís a tus administradores.

### Alternativa: GitHub Pages

Si preferís alojarlo en GitHub Pages en vez de Firebase Hosting, avisame y te paso la configuración (`vite.config.js` con `base` y un workflow de GitHub Actions) — Firebase Hosting es más directo porque ya estás usando Firestore en el mismo proyecto.
