import "./App.css";
import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import config from "./Config";

function App() {
  const { isAuthenticated } = useAuth0();
  return (
    <Auth0Provider
      domain={config.domain}
      clientId={config.clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
      }}
    >
      <div> {isAuthenticated ? "Welcome back!" : "Please log in"} </div>
    </Auth0Provider>
  );
}

export default App;
