import { useAuth } from '../contexts/AuthContext';

/**
 * Hook to get current authenticated user
 * Throws error if used outside AuthProvider
 */
export const useCurrentUser = () => {
  const { user, isLoading, isAuthenticated } = useAuth();
  
  return {
    user,
    isLoading,
    isAuthenticated,
  };
};

export default useCurrentUser;
