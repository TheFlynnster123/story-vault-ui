import React from "react";
import "./ConfirmModal.css";

interface ConfirmModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onCancel,
  onConfirm,
  title,
  message,
}) => {
  if (!isOpen) return null;

  return (
    <div className="confirm-modal-overlay">
      <div className="confirm-modal-dialog">
        <div className="confirm-modal-header">
          <h2>{title}</h2>
          <button className="confirm-modal-close" onClick={onCancel}>
            ×
          </button>
        </div>
        <div className="confirm-modal-content">
          <p>{message}</p>
        </div>
        <div className="confirm-modal-actions">
          <button className="confirm-modal-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="confirm-modal-confirm" onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};
