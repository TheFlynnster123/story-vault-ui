import { createManagedBlob } from "../../../services/Blob/ManagedBlob";
import type { PersistedCharacterDescription } from "./CharacterDescription";

export const getCharacterDescriptionsManagedBlobInstance =
  createManagedBlob<PersistedCharacterDescription[]>("character-descriptions");
