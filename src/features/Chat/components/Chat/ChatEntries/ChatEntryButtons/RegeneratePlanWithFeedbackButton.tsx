import { useState } from "react";
import { Button } from "@mantine/core";
import { RiRefreshLine } from "react-icons/ri";
import { RegenerateFeedbackModal } from "./RegenerateFeedbackModal";
import { d } from "../../../../../../services/Dependencies";

interface RegeneratePlanWithFeedbackButtonProps {
  chatId: string;
  planDefinitionId: string;
  priorContent: string;
}

export const RegeneratePlanWithFeedbackButton: React.FC<
  RegeneratePlanWithFeedbackButtonProps
> = ({ chatId, planDefinitionId, priorContent }) => {
  const [showModal, setShowModal] = useState(false);
  const [feedback, setFeedback] = useState("");

  const handleSubmit = () => {
    if (feedback.trim()) {
      d.PlanGenerationService(chatId).regeneratePlanFromMessage(
        planDefinitionId,
        priorContent,
        feedback,
      );
    } else {
      d.PlanGenerationService(chatId).regeneratePlanFromMessage(
        planDefinitionId,
        priorContent,
      );
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
