import { useEffect, useMemo, useState } from "react";
import { d } from "../../../services/Dependencies";
import type { CharacterUpdateProposal } from "../services/CharacterUpdateProposal";

export const useCharacterUpdateProposal = (chatId: string) => {
  const service = useMemo(
    () => d.CharacterUpdateProposalService(chatId),
    [chatId],
  );
  const [proposal, setProposal] = useState<CharacterUpdateProposal>();
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const loadProposal = async () => {
      setProposal(await service.get());
    };

    void loadProposal();
    return service.subscribe(() => void loadProposal());
  }, [service]);

  const openReview = () => {
    setError(undefined);
    setIsReviewOpen(true);
  };

  const closeReview = () => {
    setError(undefined);
    setIsReviewOpen(false);
  };

  const approve = async (characterIds: string[]) => {
    setError(undefined);
    setIsApplying(true);
    try {
      const result = await service.approve(characterIds);
      if (result.status === "conflict") {
        setError(
          `Could not apply updates because ${formatNames(
            result.characterNames,
          )} changed after this proposal was created. Discard it and generate a fresh proposal.`,
        );
        return;
      }

      setProposal(undefined);
      setIsReviewOpen(false);
    } catch (approvalError) {
      d.ErrorService().log(
        "Failed to apply approved character updates",
        approvalError,
      );
      setError("Could not apply the approved character updates.");
    } finally {
      setIsApplying(false);
    }
  };

  const discard = async () => {
    setError(undefined);
    setIsApplying(true);
    try {
      await service.discard();
      setProposal(undefined);
      setIsReviewOpen(false);
    } catch (discardError) {
      d.ErrorService().log("Failed to discard character updates", discardError);
      setError("Could not discard the character updates.");
    } finally {
      setIsApplying(false);
    }
  };

  return {
    proposal,
    isReviewOpen,
    isApplying,
    error,
    openReview,
    closeReview,
    approve,
    discard,
  };
};

const formatNames = (names: string[]): string => {
  if (names.length <= 1) return names[0] ?? "a character";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
};
