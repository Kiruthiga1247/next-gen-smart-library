import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { RegisterFormData } from '../schemas';

export const authService = {
  async register(data: Omit<RegisterFormData, 'confirmPassword'>) {
    const credential = await createUserWithEmailAndPassword(
      auth,
      data.email,
      data.password
    );
    const { uid } = credential.user;

    await updateProfile(credential.user, { displayName: data.displayName });

    // Create user profile document (role is always 'student' on self-register)
    await setDoc(doc(db, 'users', uid), {
      displayName: data.displayName,
      email: data.email,
      studentId: data.studentId ?? '',
      role: 'student',
      createdAt: serverTimestamp(),
    });

    return credential.user;
  },

  async login(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
  },

  async logout() {
    return signOut(auth);
  },
};
