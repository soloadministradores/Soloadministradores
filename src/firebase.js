import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 1. Andá a https://console.firebase.google.com → creá un proyecto.
// 2. Dentro del proyecto: "Agregar app" → ícono web (</>) → registrá la app.
// 3. Firebase te muestra un objeto firebaseConfig: copialo y pegalo acá abajo,
//    reemplazando todo este bloque.
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
