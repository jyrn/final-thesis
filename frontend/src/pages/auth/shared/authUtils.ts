// Firebase handles Google OAuth internally, so we don't need these utilities
// Keeping this file for other auth-related utilities

// Type definitions for Google OAuth (if needed for future reference)
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

// Note: Google OAuth is handled by Firebase Auth Service
// These functions are kept for reference but not used in the current implementation

export const parseJwt = (token: string) => {
  try {
    const base64Url = token.split(".")[1]
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    throw new Error("Invalid token")
  }
}

// Firebase Auth handles user data processing
// This utility function parses display names for Firebase users
export const parseDisplayName = (displayName: string | null) => {
  if (!displayName) {
    return { firstName: "", middleName: "", lastName: "" };
  }

  const parts = displayName.trim().split(/\s+/);
  const firstName = parts[0] || "";
  const middleName = parts.length > 2 ? parts.slice(1, -1).join(" ") : "";
  const lastName = parts.length > 1 ? parts[parts.length - 1] : "";

  return { firstName, middleName, lastName };
};

// Store user authentication state
export const setAuthState = (user: any, role: string) => {
  const userData = {
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    displayName: user.displayName,
    photoURL: user.photoURL,
    role,
    loginTime: new Date().toISOString(),
  };

  localStorage.setItem("user", JSON.stringify(userData));
  localStorage.setItem("isAuthenticated", "true");
  
  return userData;
};

// Clear authentication state
export const clearAuthState = () => {
  localStorage.removeItem("user");
  localStorage.removeItem("isAuthenticated");
};

// Get stored user data
export const getStoredUser = () => {
  try {
    const userData = localStorage.getItem("user");
    return userData ? JSON.parse(userData) : null;
  } catch (error) {    return null;
  }
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return localStorage.getItem("isAuthenticated") === "true";
};
