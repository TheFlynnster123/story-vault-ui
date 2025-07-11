import React from "react";
import type { PlanningNoteTemplate } from "../../../models";
import { TemplateForm } from "./TemplateForm";
import "./TemplateList.css";

interface TemplateListProps {
  templates: PlanningNoteTemplate[];
  onTemplateChange: (
    id: string,
    field: "name" | "requestPrompt",
    value: string
  ) => void;
  onRemoveTemplate: (id: string) => void;
}

export const TemplateList: React.FC<TemplateListProps> = ({
  templates,
  onTemplateChange,
  onRemoveTemplate,
}) => {
  return (
    <ul className="story-notes-template-list">
      {templates.map((template) => (
        <li key={template.id} className="story-notes-template-list-item">
          <TemplateForm
            template={template}
            onTemplateChange={onTemplateChange}
            onRemoveTemplate={onRemoveTemplate}
          />
        </li>
      ))}
    </ul>
  );
};
