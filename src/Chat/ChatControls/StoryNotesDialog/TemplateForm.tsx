import React, { useState } from "react";
import { RiArrowDownSLine, RiArrowUpSLine, RiCloseLine } from "react-icons/ri";
import type { PlanningNotesTemplates } from "../../../models";
import "./TemplateForm.css";

interface TemplateFormProps {
  template: PlanningNotesTemplates;
  onTemplateChange: (
    id: string,
    field: "name" | "requestPrompt",
    value: string
  ) => void;
  onRemoveTemplate: (id: string) => void;
}

export const TemplateForm: React.FC<TemplateFormProps> = ({
  template,
  onTemplateChange,
  onRemoveTemplate,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="template-form-container">
      <div className="template-form-header">
        <input
          type="text"
          value={template.name}
          onChange={(e) =>
            onTemplateChange(template.id, "name", e.target.value)
          }
          placeholder="Add a title for your template..."
          className="template-form-title-input"
          onClick={(e) => e.stopPropagation()}
        />
        <button
          className="template-form-collapse-button"
          onClick={toggleCollapse}
        >
          {isCollapsed ? <RiArrowDownSLine /> : <RiArrowUpSLine />}
        </button>
      </div>
      {!isCollapsed && (
        <div className="template-form-body">
          <button
            className="template-form-delete-button"
            onClick={() => onRemoveTemplate(template.id)}
          >
            <RiCloseLine />
          </button>
          <div className="template-form-field">
            <textarea
              id={`template-request-${template.id}`}
              value={template.requestPrompt}
              onChange={(e) =>
                onTemplateChange(template.id, "requestPrompt", e.target.value)
              }
              rows={4}
              placeholder="Enter the request template..."
            />
          </div>
        </div>
      )}
    </div>
  );
};
