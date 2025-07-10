import React from "react";
import type { PlanningNoteTemplate } from "../../../models";
import { TemplateForm } from "./TemplateForm";

interface TemplateListProps {
  templates: PlanningNoteTemplate[];
  onTemplateChange: (
    id: string,
    field: "name" | "requestTemplate",
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
    <div className="story-notes-template-list">
      {templates.map((template) => (
        <TemplateForm
          key={template.id}
          template={template}
          onTemplateChange={onTemplateChange}
          onRemoveTemplate={onRemoveTemplate}
        />
      ))}
    </div>
  );
};
