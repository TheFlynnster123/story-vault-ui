import React from "react";
import type { PlanningNoteTemplate } from "../../../models";

interface TemplateFormProps {
  template: PlanningNoteTemplate;
  onTemplateChange: (
    id: string,
    field: "name" | "requestTemplate",
    value: string
  ) => void;
  onRemoveTemplate: (id: string) => void;
}

export const TemplateForm: React.FC<TemplateFormProps> = ({
  template,
  onTemplateChange,
  onRemoveTemplate,
}) => {
  return (
    <div className="story-notes-template-item">
      <button
        className="story-notes-delete-icon"
        onClick={() => onRemoveTemplate(template.id)}
      >
        ×
      </button>
      <div className="chat-settings-field">
        <label htmlFor={`template-name-${template.id}`}>Name</label>
        <input
          id={`template-name-${template.id}`}
          type="text"
          value={template.name}
          onChange={(e) =>
            onTemplateChange(template.id, "name", e.target.value)
          }
          placeholder="Template Name"
        />
      </div>
      <div className="chat-settings-field">
        <label htmlFor={`template-request-${template.id}`}>
          Request Template
        </label>
        <textarea
          id={`template-request-${template.id}`}
          value={template.requestPrompt}
          onChange={(e) =>
            onTemplateChange(template.id, "requestTemplate", e.target.value)
          }
          rows={4}
          placeholder="Enter the request template..."
        />
      </div>
    </div>
  );
};
