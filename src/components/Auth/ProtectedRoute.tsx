import React from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth0Setup } from "./useAuth0Setup";
import { useGrokKey } from "../Grok/useGrokKey";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireGrokKey?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireGrokKey = true,
}) => {
  const { isLoading, isAuthenticated } = useAuth0();
  const { hasValidGrokKey } = useGrokKey();
  const location = useLocation();

  useAuth0Setup();

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          backgroundColor: "#0f0f0f",
          color: "white",
        }}
      >
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (requireGrokKey && hasValidGrokKey === undefined) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          backgroundColor: "#0f0f0f",
          color: "white",
        }}
      >
        Loading Grok Key status...
      </div>
    );
  }

  if (requireGrokKey && hasValidGrokKey === false) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
