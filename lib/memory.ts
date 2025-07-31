import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as limitFn,
  orderBy,
  query,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from './firebaseclient';

// --- SHARED TYPE ---
export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  userId?: string;
};

// --- STORE USER MESSAGE ---
export async function storeUserMessage(userId: string, content: string) {
  await addDoc(
    collection(doc(collection(db, 'memory'), userId), 'history'),
    {
      role: 'user',
      content,
      timestamp: Date.now(),
      userId,
    }
  );
}

// --- STORE ASSISTANT REPLY ---
export async function storeAssistantReply(userId: string, content: string) {
  await addDoc(
    collection(doc(collection(db, 'memory'), userId), 'history'),
    {
      role: 'assistant',
      content,
      timestamp: Date.now(),
      userId,
    }
  );
}

// --- GET USER MEMORY (returns ChatMessage[]) ---
export async function getUserMemory(userId: string, limit = 10): Promise<ChatMessage[]> {
  const q = query(
    collection(doc(collection(db, 'memory'), userId), 'history'),
    orderBy('timestamp', 'desc'),
    limitFn(limit)
  );
  const snapshot = await getDocs(q);

  // Reverse so oldest is first
  return snapshot.docs
    .map(doc => doc.data())
    .reverse()
    .map(data => ({
      role: data.role as 'user' | 'assistant',
      content: String(data.content),
      timestamp: Number(data.timestamp),
      userId: String(data.userId),
    }));
}

// --- USER PROFILE TYPES ---
export type UserProfile = {
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  username?: string;
  profilePictureUrl?: string;
  mfaEnabled?: boolean;
  mfaMethod?: 'email' | 'sms';
  createdAt: number;
  updatedAt: number;
};

// --- CREATE USER PROFILE IN FIREBASE ---
export async function createUserProfile(userId: string, userData: {
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  username?: string;
  profilePictureUrl?: string;
  createdAt: number;
}) {
  const userDoc = doc(db, 'users', userId);
  await setDoc(userDoc, {
    clerkId: userId,
    ...userData,
    updatedAt: Date.now(),
  });
}

// --- GET USER PROFILE ---
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const userDoc = doc(db, 'users', userId);
    const userSnap = await getDoc(userDoc);
    
    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

// --- UPDATE USER PROFILE ---
export async function updateUserProfile(userId: string, updates: Partial<UserProfile>) {
  try {
    const userDoc = doc(db, 'users', userId);
    await updateDoc(userDoc, {
      ...updates,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

// --- UPDATE PROFILE PICTURE ---
export async function updateProfilePicture(userId: string, imageUri: string) {
  try {
    // In a real app, you'd upload to Firebase Storage first
    // For now, we'll just store the local URI
    await updateUserProfile(userId, {
      profilePictureUrl: imageUri,
    });
  } catch (error) {
    console.error('Error updating profile picture:', error);
    throw error;
  }
}

// --- MFA FUNCTIONS ---

// Generate a 6-digit verification code
export function generateMFACode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Store MFA code temporarily (in a real app, use a secure backend)
const mfaCodes = new Map<string, { code: string; timestamp: number; email: string }>();

// Send MFA code via email (simulated - in production use a real email service)
export async function sendMFACode(userId: string, email: string): Promise<string> {
  const code = generateMFACode();
  const timestamp = Date.now();
  
  // Store code with 10-minute expiration
  mfaCodes.set(userId, { code, timestamp, email });
  
  // In a real app, send email here using SendGrid, AWS SES, etc.
  console.log(`📧 MFA Code for ${email}: ${code}`);
  
  // Simulate email sending delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return code; // Return for demo purposes - remove in production
}

// Verify MFA code
export function verifyMFACode(userId: string, enteredCode: string): boolean {
  const stored = mfaCodes.get(userId);
  
  if (!stored) {
    return false;
  }
  
  // Check if code is expired (10 minutes)
  const isExpired = Date.now() - stored.timestamp > 10 * 60 * 1000;
  if (isExpired) {
    mfaCodes.delete(userId);
    return false;
  }
  
  // Check if code matches
  const isValid = stored.code === enteredCode.trim();
  
  if (isValid) {
    mfaCodes.delete(userId); // Remove used code
  }
  
  return isValid;
}

// Enable MFA for user
export async function enableMFA(userId: string, method: 'email' | 'sms' = 'email') {
  try {
    await updateUserProfile(userId, {
      mfaEnabled: true,
      mfaMethod: method,
    });
  } catch (error) {
    console.error('Error enabling MFA:', error);
    throw error;
  }
}

// Disable MFA for user
export async function disableMFA(userId: string) {
  try {
    await updateUserProfile(userId, {
      mfaEnabled: false,
      mfaMethod: undefined,
    });
  } catch (error) {
    console.error('Error disabling MFA:', error);
    throw error;
  }
}

// --- DELETE FUNCTIONS ---

// Delete all chat history for a user
export async function deleteChatHistory(userId: string) {
  try {
    const historyRef = collection(doc(collection(db, 'memory'), userId), 'history');
    const snapshot = await getDocs(historyRef);
    
    // Delete all documents in the history collection
    const deletePromises = snapshot.docs.map(document => deleteDoc(document.ref));
    await Promise.all(deletePromises);
    
    console.log(`✅ Deleted ${snapshot.docs.length} chat messages for user ${userId}`);
  } catch (error) {
    console.error('Error deleting chat history:', error);
    throw error;
  }
}

// Delete user's entire account and all associated data
export async function deleteUserAccount(userId: string) {
  try {
    // 1. Delete chat history first
    await deleteChatHistory(userId);
    
    // 2. Delete user profile
    const userDocRef = doc(db, 'users', userId);
    await deleteDoc(userDocRef);
    
    // 3. Delete the main memory document
    const memoryDocRef = doc(collection(db, 'memory'), userId);
    await deleteDoc(memoryDocRef);
    
    console.log(`✅ Completely deleted account and all data for user ${userId}`);
  } catch (error) {
    console.error('Error deleting user account:', error);
    throw error;
  }
}