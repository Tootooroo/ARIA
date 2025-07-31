
import { useUser } from '@clerk/clerk-expo';
import { useEffect } from 'react';
import { createUserProfile, getUserProfile } from './memory';

export function useUserSync() {
  const { user, isSignedIn } = useUser();

  useEffect(() => {
    if (isSignedIn && user) {
      // Sync user data to Firebase when they sign in
      const syncUserToFirebase = async () => {
        try {
          // Check if profile already exists
          const existingProfile = await getUserProfile(user.id);
          
          if (!existingProfile) {
            // Create new profile only if one doesn't exist
            const email = user.emailAddresses[0]?.emailAddress || '';
            const firstName = user.firstName || '';
            
            // Generate username from email or name
            let generatedUsername = '';
            if (email) {
              generatedUsername = email.split('@')[0]; // Use part before @
            } else if (firstName) {
              generatedUsername = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
            } else {
              generatedUsername = `user${Date.now()}`;
            }
            
            await createUserProfile(user.id, {
              email: email,
              firstName: firstName,
              lastName: user.lastName || '',
              displayName: user.fullName || firstName || '',
              username: generatedUsername,
              createdAt: Date.now(),
            });
            console.log('✅ New user profile created in Firebase');
          } else {
            console.log('✅ User profile already exists in Firebase');
          }
        } catch (error) {
          console.log('ℹ️ User sync failed:', error);
        }
      };

      syncUserToFirebase();
    }
  }, [isSignedIn, user]);
} 
