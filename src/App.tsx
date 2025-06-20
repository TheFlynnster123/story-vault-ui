import "./App.css";
import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import config from "./Config";
import { useGrokKey } from "./hooks/useGrokKey";
import { GrokKeyInput } from "./GrokKeyInput";
import { Chat } from "./Chat/Chat";

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
    <div>
      {isAuthenticated ? (
        <AuthenticatedContent />
      ) : (
        <div
          style={{
            width: "100%",
            margin: "auto",
            alignContent: "center",
            height: "100vh",
          }}
        >
          <button onClick={() => loginWithRedirect()}>Log in</button>
        </div>
      )}
    </div>
  );
}

const AuthenticatedContent: React.FC = () => {
  const { hasValidGrokKey, refreshGrokKeyStatus } = useGrokKey();

  if (hasValidGrokKey === undefined) {
    return (
      <div
        style={{
          width: "100%",
          margin: "auto",
          alignContent: "center",
          height: "100vh",
        }}
      >
        Loading Grok Key status...
      </div>
    );
  }

  if (hasValidGrokKey) {
    return (
      <>
        <Chat />
      </>
    );
  }

  return <GrokKeyInput onGrokKeyUpdated={refreshGrokKeyStatus} />;
};

export default App;
