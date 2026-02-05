import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import React from "react";
import LandingPage from "./pages/LandingPage";
import ChatMenuPage from "./pages/ChatMenuPage";
import SystemSettingsPage from "./pages/SystemSettingsPage";
import SystemPromptsPage from "./pages/SystemPromptsPage";
import DefaultImageModelsPage from "./pages/DefaultImageModelsPage";
import ImageModelEditPage from "./pages/ImageModelEditPage";
import { ChatEditorPage } from "./pages/ChatEditorPage";
import ChatPage from "./pages/ChatPage";
import { PlanPage } from "./pages/PlanPage";
import { MemoriesPage } from "./pages/MemoriesPage";
import { StoryEditorPage } from "./pages/StoryEditorPage";
import { ChatImageModelsPage } from "./pages/ChatImageModelsPage";
import ChatImageModelTemplatePage from "./pages/ChatImageModelTemplatePage";
import ChatImageModelEditPage from "./pages/ChatImageModelEditPage";
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
            path="/chat/:chatId/image-models"
            element={
              <ProtectedRoute>
                <ChatImageModelsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:chatId/image-models/add-from-template"
            element={
              <ProtectedRoute>
                <ChatImageModelTemplatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:chatId/image-models/edit/:modelId"
            element={
              <ProtectedRoute>
                <ChatImageModelEditPage />
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
            path="/system-prompts"
            element={
              <ProtectedRoute requireGrokKey={false}>
                <SystemPromptsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/default-image-models"
            element={
              <ProtectedRoute requireGrokKey={false}>
                <DefaultImageModelsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/default-image-models/edit/:modelId"
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
