// Auth context: wraps Firebase Auth so the rest of the app can read the current
// user and call signup/login/logout without touching the SDK directly.
import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // `loading` is true until Firebase reports the first auth state. Protected
  // routes must wait for this before deciding, so they don't flash to /login
  // while the session is still being restored (or right after sign-in, before
  // onAuthStateChanged has propagated the freshly authenticated user).
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fires once on load with the restored user (or null), and again on every
    // subsequent sign-in/sign-out. The first call is what flips `loading` off.
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function signup(email, password, displayName) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }
    // The client API auto-creates the user record on the first authenticated
    // request (firebaseAuth middleware upserts users), so no explicit call here.
    return cred.user;
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  const value = { user, loading, signup, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
