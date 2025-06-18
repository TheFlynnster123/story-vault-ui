import "./App.css";
import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import config from "./Config";
import { useGrokKey } from "./hooks/useGrokKey";
import { GrokKeyInput } from "./GrokKeyInput";

function App() {
  return (
    <Auth0Provider
      domain={config.domain}
      clientId={config.clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: config.audience,
      }}
    >
      <LoginBarrier />
    </Auth0Provider>
  );
}

function LoginBarrier() {
  const { isAuthenticated, loginWithRedirect } = useAuth0();

  return (
    <>
      {isAuthenticated ? (
        <AuthenticatedContent />
      ) : (
        <button onClick={() => loginWithRedirect()}>Log in</button>
      )}
    </>
  );
}

const AuthenticatedContent: React.FC = () => {
  const { user } = useAuth0();
  const { hasValidGrokKey, refreshGrokKeyStatus } = useGrokKey();

  return hasValidGrokKey ? (
    <h1>Welcome back, {user?.name}!</h1>
  ) : (
    <GrokKeyInput onGrokKeyUpdated={refreshGrokKeyStatus} />
  );
};

export default App;
