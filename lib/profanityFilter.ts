
// Profanity and inappropriate content filter for usernames
const BLOCKED_WORDS = [
    // Profanity (keeping list clean - add more as needed)
    'damn', 'hell', 'shit', 'fuck', 'bitch', 'ass', 'piss', 'crap', 
    'bastard', 'slut', 'whore', 'dick', 'cock', 'pussy', 'tits',
    
    // Racial/offensive terms (sample - expand as needed)
    'nazi', 'hitler', 'terrorist', 'isis', 'kkk', 'fag', 'retard',
    'nigger', 'nigga', 'chink', 'spic', 'wetback', 'kike', 'gook',
    
    // Sexual content
    'porn', 'sex', 'nude', 'naked', 'penis', 'vagina', 'anal',
    
    // Violence/harmful
    'kill', 'murder', 'suicide', 'bomb', 'gun', 'weapon', 'rape',
    
    // Admin/system terms that might confuse users
    'admin', 'root', 'system', 'support', 'help', 'official', 'staff',
    'moderator', 'bot', 'api', 'null', 'undefined', 'test', 'demo',
    
    // Common inappropriate patterns
    'xxx', '666', 'hate', 'death', 'drugs', 'cocaine', 'heroin',
  ];
  
  // Leetspeak and common substitutions
  const SUBSTITUTIONS: { [key: string]: string } = {
    '3': 'e',
    '4': 'a', 
    '1': 'i',
    '0': 'o',
    '5': 's',
    '7': 't',
    '@': 'a',
    '$': 's',
    '!': 'i',
    '+': 't',
  };
  
  /**
   * Normalize text by replacing common leetspeak substitutions
   */
  function normalizeText(text: string): string {
    let normalized = text.toLowerCase();
    
    // Replace leetspeak substitutions
    for (const [symbol, letter] of Object.entries(SUBSTITUTIONS)) {
      normalized = normalized.replace(new RegExp(`\\${symbol}`, 'g'), letter);
    }
    
    // Remove common separators that might be used to bypass filters
    normalized = normalized.replace(/[_\-\.]/g, '');
    
    return normalized;
  }
  
  /**
   * Check if a username contains inappropriate content
   */
  export function isUsernameAppropriate(username: string): { 
    isValid: boolean; 
    reason?: string; 
  } {
    if (!username || username.length < 3) {
      return { isValid: false, reason: 'Username must be at least 3 characters long' };
    }
    
    if (username.length > 20) {
      return { isValid: false, reason: 'Username must be 20 characters or less' };
    }
    
    // Only allow alphanumeric and underscores
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return { isValid: false, reason: 'Username can only contain letters, numbers, and underscores' };
    }
    
    const normalizedUsername = normalizeText(username);
    
    // Check against blocked words
    for (const blockedWord of BLOCKED_WORDS) {
      if (normalizedUsername.includes(blockedWord)) {
        return { 
          isValid: false, 
          reason: 'Username contains inappropriate content. Please choose a different username.' 
        };
      }
    }
    
    // Check for consecutive repeated characters (like "aaaaaaa")
    if (/(.)\1{4,}/.test(username)) {
      return { 
        isValid: false, 
        reason: 'Username cannot contain more than 4 consecutive repeated characters' 
      };
    }
    
    // Check for common spam patterns
    const spamPatterns = [
      /^\d+$/, // All numbers
      /^[_]+$/, // All underscores
    ];
    
    for (const pattern of spamPatterns) {
      if (pattern.test(username)) {
        return { 
          isValid: false, 
          reason: 'Please choose a more creative username' 
        };
      }
    }
    
    return { isValid: true };
  }
  
  /**
   * Generate a clean username suggestion based on email or name
   */
  export function generateCleanUsername(email?: string, firstName?: string): string {
    let baseUsername = '';
    
    if (email) {
      baseUsername = email.split('@')[0];
    } else if (firstName) {
      baseUsername = firstName;
    } else {
      baseUsername = 'user';
    }
    
    // Clean the base username
    baseUsername = baseUsername.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // If it's too short or inappropriate, add random numbers
    const validation = isUsernameAppropriate(baseUsername);
    if (!validation.isValid || baseUsername.length < 3) {
      baseUsername = `user${Math.floor(Math.random() * 10000)}`;
    }
    
    return baseUsername;
  }
  