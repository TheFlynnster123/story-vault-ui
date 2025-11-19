import { useState } from "react";
import { Button } from "@mantine/core";
import { RiRefreshLine } from "react-icons/ri";
import { useChatGeneration } from "../../../hooks/useChatGeneration";
import { RegenerateFeedbackModal } from "./RegenerateFeedbackModal";

interface RegenerateWithFeedbackButtonProps {
  chatId: string;
  messageId: string;
}

export const RegenerateWithFeedbackButton: React.FC<
  RegenerateWithFeedbackButtonProps
> = ({ chatId, messageId }) => {
  const [showModal, setShowModal] = useState(false);
  const [feedback, setFeedback] = useState("");
  const { regenerateResponse, regenerateResponseWithFeedback } =
    useChatGeneration({ chatId });

  const handleSubmit = () => {
    if (feedback.trim()) {
      regenerateResponseWithFeedback(messageId, feedback);
    } else {
      regenerateResponse(messageId);
    }
    setShowModal(false);
    setFeedback("");
  };

  const handleCancel = () => {
    setShowModal(false);
    setFeedback("");
  };

  return (
    <>
      <Button
        size="xs"
        variant="light"
        color="blue"
        leftSection={<RiRefreshLine size={14} />}
        onClick={() => setShowModal(true)}
        styles={{
          root: {
            backgroundColor: "rgba(34, 139, 230, 0.25)",
            "&:hover": {
              backgroundColor: "rgba(34, 139, 230, 0.35)",
            },
          },
        }}
      >
        With Feedback
      </Button>

      <RegenerateFeedbackModal
        opened={showModal}
        feedback={feedback}
        onFeedbackChange={setFeedback}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </>
  );
};
