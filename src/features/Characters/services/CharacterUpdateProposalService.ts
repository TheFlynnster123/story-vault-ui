import { d } from "../../../services/Dependencies";
import {
  selectCharacterUpdateChanges,
  type CharacterUpdateProposal,
} from "./CharacterUpdateProposal";

export type CharacterProposalApprovalResult =
  | { status: "applied" }
  | { status: "missing" }
  | { status: "conflict"; characterNames: string[] };

export class CharacterUpdateProposalService {
  private readonly chatId: string;

  constructor(chatId: string) {
    this.chatId = chatId;
  }

  get = (): Promise<CharacterUpdateProposal | undefined> =>
    d.CharacterUpdateProposalManagedBlob(this.chatId).get();

  save = (proposal: CharacterUpdateProposal): Promise<void> =>
    d.CharacterUpdateProposalManagedBlob(this.chatId).save(proposal);

  discard = (): Promise<void> =>
    d.CharacterUpdateProposalManagedBlob(this.chatId).delete();

  subscribe = (callback: () => void): (() => void) =>
    d.CharacterUpdateProposalManagedBlob(this.chatId).subscribe(callback);

  approve = async (
    characterIds: string[],
  ): Promise<CharacterProposalApprovalResult> => {
    const proposal = await this.get();
    if (!proposal) return { status: "missing" };

    const approvedProposal = selectCharacterUpdateChanges(
      proposal,
      characterIds,
    );
    if (approvedProposal.changes.length === 0) {
      await this.discard();
      return { status: "applied" };
    }

    const result = await d
      .CharacterDescriptionsService(this.chatId)
      .applyUpdateProposal(approvedProposal);
    if (result.status === "conflict") return result;

    await this.discard();
    return { status: "applied" };
  };
}
