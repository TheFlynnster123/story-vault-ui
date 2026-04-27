import { createManagedBlob } from "../../../services/Blob/ManagedBlob";
import type { CharacterDescription } from "./CharacterDescription";

export const getCharacterDescriptionsManagedBlobInstance =
  createManagedBlob<CharacterDescription[]>("character-descriptions");
