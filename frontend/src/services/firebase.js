import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const missingFirebaseEnvVars = Object.entries({
  VITE_FIREBASE_API_KEY: firebaseConfig.apiKey,
  VITE_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
  VITE_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
  VITE_FIREBASE_APP_ID: firebaseConfig.appId
})
  .filter(([, value]) => !value)
  .map(([key]) => key);

const isFirebaseConfigured = missingFirebaseEnvVars.length === 0;

let auth = null;
if (isFirebaseConfigured) {
  if (import.meta.env.DEV) {
    // Safe debug logs: do not print full API key.
    // Helps confirm env wiring and project target during local troubleshooting.
    // eslint-disable-next-line no-console
    console.info("[Firebase] Config detected", {
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain,
      appIdSuffix: firebaseConfig.appId?.slice(-8),
      apiKeyPrefix: firebaseConfig.apiKey?.slice(0, 8)
    });
  }
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
} else if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.warn("[Firebase] Missing env vars", missingFirebaseEnvVars);
}

export { auth, isFirebaseConfigured, missingFirebaseEnvVars };
