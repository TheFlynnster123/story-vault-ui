export class DefaultPrompts {
  ThirdPersonChatPrompt = (): string =>
    "Respond with the next message in the conversation in third person. " +
    "Keep dialogue realistic and natural, with full sentences. " +
    "Respond directly where the users response ends.";

  FirstPersonChatPrompt = (
    characterName: string | undefined = undefined
  ): string => {
    let namePlaceholder = "";

    if (characterName) namePlaceholder = " as " + characterName.trim();

    return (
      `Respond with the next message in the conversation in first person${namePlaceholder}.` +
      "Keep dialogue realistic and natural, with full sentences. " +
      "Respond directly where the users response ends."
    );
  };
}
