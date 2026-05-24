import React from "react";
import { useAuth0 } from "@auth0/auth0-react";

const LogoutPage: React.FC = () => {
  const { logout } = useAuth0();

  React.useEffect(() => {
    logout({ logoutParams: { returnTo: window.location.origin } });
  }, [logout]);

  return null;
};

export default LogoutPage;
