import { useEffect, useState } from "react";
import { d } from "../../../services/Dependencies";
import type { CharacterDescription } from "../services/CharacterDescription";

export const useCharacterDescriptions = (chatId: string) => {
  const [characters, setCharacters] = useState<CharacterDescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCharacters();

    const unsubscribe = d
      .CharacterDescriptionsService(chatId)
      .subscribe(() => {
        loadCharacters();
      });

    return unsubscribe;
  }, [chatId]);

  const loadCharacters = async () => {
    setIsLoading(true);
    const descriptions = await d
      .CharacterDescriptionsService(chatId)
      .get();
    setCharacters(descriptions);
    setIsLoading(false);
  };

  return { characters, isLoading };
};
