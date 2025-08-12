import "./App.css";
import { Auth0Provider } from "@auth0/auth0-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import config from "./Config";
import React from "react";
import LandingPage from "./pages/LandingPage";
import ChatMenuPage from "./pages/ChatMenuPage";
import SystemSettingsPage from "./pages/SystemSettingsPage";
import { ChatEditorPage } from "./pages/ChatEditorPage";
import ChatPage from "./pages/ChatPage";
import { StoryNotesPage } from "./pages/StoryNotesPage";
import ProtectedRoute from "./components/ProtectedRoute";

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
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <ChatMenuPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat/:chatId"
              element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat/:id/edit"
              element={
                <ProtectedRoute>
                  <ChatEditorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat/:chatId/notes"
              element={
                <ProtectedRoute>
                  <StoryNotesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat/new"
              element={
                <ProtectedRoute>
                  <ChatEditorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute requireGrokKey={false}>
                  <SystemSettingsPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </Auth0Provider>
    </QueryClientProvider>
  );
};

export default App;
