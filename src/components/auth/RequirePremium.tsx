import React, { useEffect } from 'react';
import { useAuth } from "@/App";
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';

const RequirePremium: React.FC = () => {
  const { user, isPremium, openPremiumDialog, isLoading, isModalOpen } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Wait for auth and premium status to load
  if (isLoading) {
    return null; // Or a loading spinner
  }

  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  // If authenticated but not premium
  if (!isPremium) {
    // Open dialog when entering a premium route and not already in the modal
    useEffect(() => {
      if (!isModalOpen) {
        openPremiumDialog();
      }
    }, [isPremium, isModalOpen, openPremiumDialog]);

    // Redirect to root if modal is closed while on a premium route
    useEffect(() => {
      if (!isPremium && !isModalOpen && location.pathname === '/accounting') {
        navigate('/', { replace: true });
      }
    }, [isPremium, isModalOpen, location.pathname, navigate]);

    return null; // Render nothing while the modal is open or redirecting
  }

  // If authenticated and premium, render the child routes
  return <Outlet />;
};

export default RequirePremium; 