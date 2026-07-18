import { createManagedBlob } from "../../../services/Blob/ManagedBlob";
import type { CharacterUpdateProposal } from "./CharacterUpdateProposal";

export const getCharacterUpdateProposalManagedBlobInstance =
  createManagedBlob<CharacterUpdateProposal>("character-update-proposal");
