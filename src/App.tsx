import "./App.css";
import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import config from "./Config";

function AuthContent() {
  const { isAuthenticated, loginWithRedirect } = useAuth0();

  return (
    <div>
      {isAuthenticated ? (
        "Welcome back!"
      ) : (
        <button onClick={() => loginWithRedirect()}>Log In</button>
      )}
    </div>
  );
}

function App() {
  return (
    <Auth0Provider
      domain={config.domain}
      clientId={config.clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
      }}
    >
      <AuthContent />
    </Auth0Provider>
  );
}

export default App;
