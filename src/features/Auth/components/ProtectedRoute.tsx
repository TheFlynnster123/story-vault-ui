import React from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth0Setup } from "../hooks/useAuth0Setup";
import { useOpenRouterKey } from "../../OpenRouter/hooks/useOpenRouterKey";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOpenRouterKey?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireOpenRouterKey = true,
}) => {
  const { isLoading, isAuthenticated } = useAuth0();
  const { hasValidOpenRouterKey } = useOpenRouterKey();
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

  if (requireOpenRouterKey && hasValidOpenRouterKey === undefined) {
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
        Loading OpenRouter Key status...
      </div>
    );
  }

  if (requireOpenRouterKey && hasValidOpenRouterKey === false) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
