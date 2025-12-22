# A list of general TODOs that I could start on
- Streamline the JobStatus returned from useCivitJob. Why's JobStatus and data returned, when they're the same object? Is there value to simplifying to using an error/loading variable?

- Add a StoryMessage, and display it at the top of the UserChatMessages rendered in the MessageList. Since the StoryMessage would be semi-constant, we would probably want to keep it out of the UserChatProjection. We probably would want a 'UserChatMessageService' that wraps the projection, which would mean it needs to subscribe to the Projection. Projection consumers would then need to subscribe to the UserChatMessageService. Another consideration - we would need to refresh the UserChatMessageService when the story prompt is updated

- Allow for model selection per operation - message generation, planning, image prompt generation

- Allow for customizable prompts! The chat prompt is customizable currently, but we should probably allow for customization of the image prompt as well. Really any hard-coded prompts should be editable.

- Implement a better 'Direction' concept, possibly to replace the 'Next Chapter Direction'. It would need to be present in the llm chat projection. It could be automatically suggested - potentially multiple suggestions to select - or manually input. How exactly it will be added to the context is still TBD. At the beginning of a chapter's a decent spot, but maybe it'd be better to be in-line, or expiring? A long term vision for the LLM to strive towards may reduce the likelihood of it being repetitive.

- Implement a 'How you should respond' input for the LLM. It'd be cool to detail how it should respond, in the event that the user already has an idea of how the LLM should behave.

- Make the Chapter's message history configurable. When a chapter is compressed, a few prior messages are kept around for immediate context. We should allow the user to select how many prior chapter's messages are retained for immediate context.

- Allow the LLM to generate a message without additional user input, or if the story message most recently input was deleted.

- Model selection might be better off at the chat level.

- A full-blown 'Character sheet' concept would probably be helpful for the system to keep characters straight. It may run into context challenges. Bloating the beginning of the context means it's not present on the LLM's 'mind' after a while, but putting it at the end of the context may prevent the LLM from responding at its best potential. I'd say beginning might be best, but also we may want to allow the Image model to leverage the Character sheets more directly. 

- Image models per chats may be beneficial. Image models currently are described per-user, but different chats may benefit from particular config differences.