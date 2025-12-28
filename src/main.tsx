import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import App from "./App.tsx";

// core styles are required for all packages
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { GlobalStyles } from "./index.styled";
import { Auth0Provider } from "@auth0/auth0-react";
import Config from "./components/Common/Config.ts";
import { Notifications } from "@mantine/notifications";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Auth0Provider
      domain={Config.domain}
      clientId={Config.clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: Config.audience,
      }}
    >
      <MantineProvider defaultColorScheme="dark">
        <GlobalStyles />
        <Notifications />
        <App />
      </MantineProvider>
    </Auth0Provider>
  </StrictMode>
);
