import { useUser } from '@clerk/clerk-expo';
import { useEffect } from 'react';
import { createUserProfile } from './memory';

export function useUserSync() {
  const { user, isSignedIn } = useUser();

  useEffect(() => {
    if (isSignedIn && user) {
      // Sync user data to Firebase when they sign in
      const syncUserToFirebase = async () => {
        try {
          await createUserProfile(user.id, {
            email: user.emailAddresses[0]?.emailAddress || '',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            createdAt: Date.now(),
          });
          console.log('✅ User synced to Firebase');
        } catch (error) {
          console.log('ℹ️ User already exists in Firebase or sync failed:', error);
        }
      };

      syncUserToFirebase();
    }
  }, [isSignedIn, user]);
} 