import React, { useState, useEffect } from "react";
import { RiAddLine } from "react-icons/ri";
import "./StoryNotesDialog.css";
import type { PlanningNotesTemplates } from "../../../models";
import {
  usePlanningNotesTemplates,
  useUpdatePlanningNotesTemplateMutation,
} from "../../../hooks/queries/usePlanningNotesTemplateQuery";
import { ConfirmModal } from "../../../components/ConfirmModal";
import {
  StoryNotesDialogHeader,
  TemplateList,
  StoryNotesDialogActions,
} from "./index";

interface StoryNotesDialogProps {
  chatId: string;
  isOpen: boolean;
  onCancel: () => void;
}

export const StoryNotesDialog: React.FC<StoryNotesDialogProps> = ({
  chatId,
  isOpen,
  onCancel,
}) => {
  const templates = usePlanningNotesTemplates(chatId);
  const updateTemplatesMutation =
    useUpdatePlanningNotesTemplateMutation(chatId);
  const [editingTemplates, setEditingTemplates] = useState<
    PlanningNotesTemplates[]
  >([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (!templates || templates.length == 0) return;
      setEditingTemplates(JSON.parse(JSON.stringify(templates)));
    }
  }, [isOpen, templates]);

  const handleAddTemplate = () => {
    setEditingTemplates([
      ...editingTemplates,
      { id: Date.now().toString(), name: "", requestPrompt: "" },
    ]);
  };

  const handleRemoveTemplate = (id: string) => {
    setTemplateToDelete(id);
    setIsConfirmModalOpen(true);
  };

  const confirmRemoveTemplate = () => {
    if (templateToDelete) {
      setEditingTemplates(
        editingTemplates.filter((t) => t.id !== templateToDelete)
      );
      setTemplateToDelete(null);
    }
    setIsConfirmModalOpen(false);
  };

  const handleTemplateChange = (
    id: string,
    field: "name" | "requestPrompt",
    value: string
  ) => {
    setEditingTemplates(
      editingTemplates.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const handleSave = () => {
    updateTemplatesMutation.mutate(editingTemplates);
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <div className="chat-settings-overlay">
      <div className="chat-settings-dialog">
        <StoryNotesDialogHeader onCancel={onCancel} />
        <div className="chat-settings-content">
          <TemplateList
            templates={editingTemplates}
            onTemplateChange={handleTemplateChange}
            onRemoveTemplate={handleRemoveTemplate}
          />
          <button
            className="story-notes-add-button"
            onClick={handleAddTemplate}
          >
            <RiAddLine scale={4} />
          </button>
        </div>
        <StoryNotesDialogActions onCancel={onCancel} onSave={handleSave} />
      </div>
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onCancel={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmRemoveTemplate}
        title="Confirm Deletion"
        message="Are you sure you want to delete this template?"
      />
    </div>
  );
};
