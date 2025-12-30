import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import React from "react";
import LandingPage from "./pages/LandingPage";
import ChatMenuPage from "./pages/ChatMenuPage";
import SystemSettingsPage from "./pages/SystemSettingsPage";
import ImageSettingsPage from "./pages/ImageSettingsPage";
import ImageModelEditPage from "./pages/ImageModelEditPage";
import { ChatEditorPage } from "./pages/ChatEditorPage";
import ChatPage from "./pages/ChatPage";
import { PlanPage } from "./pages/PlanPage";
import { MemoriesPage } from "./pages/MemoriesPage";
import { StoryEditorPage } from "./pages/StoryEditorPage";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import { ChatCreationWizard } from "./components/ChatCreationWizard/ChatCreationWizard";

export const QUERY_CLIENT = new QueryClient();

interface AppProps {}

const App: React.FC<AppProps> = () => {
  return (
    <QueryClientProvider client={QUERY_CLIENT}>
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
            path="/chat/:chatId/plan"
            element={
              <ProtectedRoute>
                <PlanPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:chatId/memories"
            element={
              <ProtectedRoute>
                <MemoriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:chatId/story/edit"
            element={
              <ProtectedRoute>
                <StoryEditorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/new"
            element={
              <ProtectedRoute>
                <ChatCreationWizard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/system-settings"
            element={
              <ProtectedRoute requireGrokKey={false}>
                <SystemSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/image-settings"
            element={
              <ProtectedRoute requireGrokKey={false}>
                <ImageSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/image-settings/edit/:modelId"
            element={
              <ProtectedRoute requireGrokKey={false}>
                <ImageModelEditPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
};

export default App;
