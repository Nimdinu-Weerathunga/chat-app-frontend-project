import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { getFirestore, setDoc, doc, collection, query, where, getDoc, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-toastify';


const firebaseConfig = {
  apiKey: "AIzaSyBIIg-a5ZcvsZWjPxwaSCo-9R-XCQtYJvE",
  authDomain: "chat-app-404-18c19.firebaseapp.com",
  projectId: "chat-app-404-18c19",
  storageBucket: "chat-app-404-18c19.firebasestorage.app",
  messagingSenderId: "194674979313",
  appId: "1:194674979313:web:886b964f670648aa779450"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Utility function for error handling
const showToastError = (error) => {
  const errorMessage = error.message || error.code.split('/')[1].split('-').join(' ');
  toast.error(errorMessage);
};

// Validate file (avatar) size and type
const validateFile = (file) => {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSize = 2 * 1024 * 1024; // 2MB
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Upload a JPEG, PNG, or WEBP image.');
  }
  if (file.size > maxSize) {
    throw new Error('File size exceeds 2MB.');
  }
};

// Upload image function to Firebase Storage
const uploadImage = async (file) => {
  const fileRef = ref(storage, `images/${Date.now()}_${file.name}`);
  try {
    const uploadResult = await uploadBytes(fileRef, file);
    return await getDownloadURL(uploadResult.ref);
  } catch (error) {
    console.error('Upload error:', error);
    throw new Error('Failed to upload image');
  }
};

// Signup function
const signup = async (username, email, password, avatarFile = null) => {
  try {
    if (!username || !email || !password) {
      throw new Error('All fields are required.');
    }

    // Basic password validation (minimum 6 characters)
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const res = await createUserWithEmailAndPassword(auth, email, password);
    const user = res.user;

    let avatarUrl = 'https://example.com/default-avatar.png'; // Default avatar URL
    if (avatarFile) {
      validateFile(avatarFile); // Validate file before upload
      avatarUrl = await uploadImage(avatarFile).catch(() => avatarUrl); // If upload fails, fallback to default avatar
    }

    // Add user details to Firestore
    await setDoc(doc(db, 'users', user.uid), {
      id: user.uid,
      username: username.toLowerCase(),
      email,
      name: '',
      avatar: avatarUrl,
      bio: 'Hey, there! I am using chat app.',
      lastSeen: Date.now(),
    });

    // Initialize empty chats for the user
    await setDoc(doc(db, 'chats', user.uid), {
      chatData: [],
    });

    toast.success(`Welcome, ${username}! Signup successful.`);
  } catch (error) {
    console.error(error);
    showToastError(error);
  }
};

// Login function
const login = async (email, password) => {
  try {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    await signInWithEmailAndPassword(auth, email, password);
    toast.success('Login successful!');
  } catch (error) {
    console.error(error);
    showToastError(error);
  }
};

// Logout function
const logout = async () => {
  try {
    await signOut(auth);
    toast.success('Logout successful!');
  } catch (error) {
    console.error(error);
    showToastError(error);
  }
};

const resetPass = async (email) => {
  if (!email) {
    toast.error("Enter your email");
    return null;
  }
  try {
    const userRef = collection(db,'users');
    const q = query(userRef,where("email","==",email));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      await sendPasswordResetEmail(auth,email);
      toast.success("Reset Email Sent")
    }
    else{
      toast.error("Email doesn't exists")
    }
  } catch (error) {
    console.error(error);
    toast.error(error.message);
  }
}

export { signup, login, logout, uploadImage, auth, db, storage,resetPass };
