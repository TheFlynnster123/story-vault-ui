import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import React from "react";
import LandingPage from "./features/Auth/pages/LandingPage";
import ChatMenuPage from "./features/Chat/pages/ChatMenuPage";
import SystemSettingsPage from "./features/SystemSettings/pages/SystemSettingsPage";
import SystemPromptsPage from "./features/Prompts/pages/SystemPromptsPage";
import DefaultImageModelsPage from "./features/Images/pages/DefaultImageModelsPage";
import ImageModelEditPage from "./features/Images/pages/ImageModelEditPage";
import { ChatEditorPage } from "./features/Chat/pages/ChatEditorPage";
import ChatPage from "./features/Chat/pages/ChatPage";
import { PlanPage } from "./features/Plans/pages/PlanPage";
import { DiscussPlanPage } from "./features/Discussion/pages/DiscussPlanPage";
import { DiscussChapterPage } from "./features/Discussion/pages/DiscussChapterPage";
import { DiscussNewChapterPage } from "./features/Discussion/pages/DiscussNewChapterPage";
import { DiscussBookPage } from "./features/Discussion/pages/DiscussBookPage";
import { DiscussStoryPage } from "./features/Discussion/pages/DiscussStoryPage";
import { MemoriesPage } from "./features/Memories/pages/MemoriesPage";
import { StoryEditorPage } from "./features/StoryEditor/pages/StoryEditorPage";
import { ChatImageModelsPage } from "./features/Images/pages/ChatImageModelsPage";
import ChatImageModelTemplatePage from "./features/Images/pages/ChatImageModelTemplatePage";
import ChatImageModelEditPage from "./features/Images/pages/ChatImageModelEditPage";
import ProtectedRoute from "./features/Auth/components/ProtectedRoute";
import { ChatCreationWizard } from "./features/Chat/components/ChatCreationWizard/ChatCreationWizard";
import { QUERY_CLIENT } from "./services/QueryClient";

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
            path="/chat/:chatId/plan/:planId/discuss"
            element={
              <ProtectedRoute>
                <DiscussPlanPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:chatId/chapter/discuss"
            element={
              <ProtectedRoute>
                <DiscussNewChapterPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:chatId/chapter/:chapterId/discuss"
            element={
              <ProtectedRoute>
                <DiscussChapterPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:chatId/book/:bookId/discuss"
            element={
              <ProtectedRoute>
                <DiscussBookPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:chatId/story/discuss"
            element={
              <ProtectedRoute>
                <DiscussStoryPage />
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
              <ProtectedRoute requireOpenRouterKey={false}>
                <SystemSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/system-prompts"
            element={
              <ProtectedRoute requireOpenRouterKey={false}>
                <SystemPromptsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/default-image-models"
            element={
              <ProtectedRoute requireOpenRouterKey={false}>
                <DefaultImageModelsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/default-image-models/edit/:modelId"
            element={
              <ProtectedRoute requireOpenRouterKey={false}>
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
