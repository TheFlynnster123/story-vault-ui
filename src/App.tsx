import "./App.css";
import { Auth0Provider } from "@auth0/auth0-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import config from "./Config";
import React from "react";
import LandingPage from "./pages/LandingPage";
import ChatMenuPage from "./pages/ChatMenuPage";
import SystemSettingsPage from "./pages/SystemSettingsPage";
import ChatPage from "./pages/ChatPage";

const queryClient = new QueryClient();

interface AppProps {}

const App: React.FC<AppProps> = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Auth0Provider
        domain={config.domain}
        clientId={config.clientId}
        authorizationParams={{
          redirect_uri: window.location.origin,
          audience: config.audience,
        }}
      >
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/chat" element={<ChatMenuPage />} />
            <Route path="/chat/:chatId" element={<ChatPage />} />
            <Route path="/settings" element={<SystemSettingsPage />} />
          </Routes>
        </Router>
      </Auth0Provider>
    </QueryClientProvider>
  );
};

export default App;
