# ChatFlow v2 Implementation

This document describes the v2 ChatFlow implementation using Zustand as a state machine for the AI story chat bot.

## Overview

ChatFlow v2 introduces a more sophisticated conversation flow with configurable prompts, refinement steps, and enhanced state management using Zustand.

## Flow Structure

The new flow follows this sequence:

1. **Historical Chat Messages** - Previous conversation context
2. **User Message** - User sends a message
3. **Planning Notes** - AI generates planning notes (saved as 'planning-notes')
4. **System Message** - AI generates initial response
5. **Refinement Notes** - AI analyzes the response for improvements (saved as 'refinement-notes')
6. **Refined Message** - AI generates an improved response
7. **Analysis Notes** - AI generates direction for next message (saved as 'analysis-notes')

## Key Features

### State Machine

- Uses Zustand for predictable state management
- Clear state transitions: `idle` → `processing_user_message` → `generating_planning_notes` → `generating_system_message` → `generating_refinement_notes` → `generating_refined_message` → `generating_analysis_notes` → `complete`
- Error handling with `error` state

### Configurable Prompts

- All prompts moved to `src/constants/chatFlowV2.ts`
- Easy to modify and maintain
- Feature flags for enabling/disabling steps

### Enhanced Notes System

- **Planning Notes**: Strategic planning before response generation
- **Refinement Notes**: Quality analysis and improvement suggestions
- **Analysis Notes**: Direction and guidance for future responses
- All notes are saved with their respective names as content

## File Structure

```
src/
├── stores/
│   └── chatFlowStore.ts          # Zustand store with state machine
├── hooks/
│   └── useChatFlowV2.ts          # Hook that wraps the Zustand store
├── models/
│   ├── RefinementNote.ts         # New refinement note class
│   └── AnalysisNote.ts           # Enhanced analysis note class
├── constants/
│   └── chatFlowV2.ts             # Configurable prompts and constants
├── Chat/
│   ├── ChatV2.tsx                # v2 Chat component
│   ├── ChatMessageListV2.tsx     # v2 Message list component
│   └── ChatFlowCollapsibleV2.tsx # v2 Flow display component
└── Chat/Menu/
    └── ChatMenuV2.tsx            # Demo menu with v1/v2 toggle
```

## Usage

### Basic Usage

```typescript
import { useChatFlowV2 } from "../hooks/useChatFlowV2";

const MyComponent = ({ chatId }) => {
  const {
    pages,
    isSendingMessage,
    submitMessage,
    progressStatus,
    chatFlowHistory,
    currentState,
    error,
    reset,
  } = useChatFlowV2({ chatId });

  // Use the hook similar to the original useChatFlow
};
```

### Configuration

Modify `src/constants/chatFlowV2.ts` to customize:

```typescript
export const CHAT_FLOW_V2_CONFIG = {
  ENABLE_REFINEMENT: true, // Enable/disable refinement step
  ENABLE_ANALYSIS: true, // Enable/disable analysis step
  AUTO_SAVE_NOTES: true, // Auto-save notes to storage
  CONSOLIDATE_MESSAGES: true, // Consolidate messages for AI processing
};
```

### Custom Prompts

Update prompts in `CHAT_FLOW_V2_TEMPLATES`:

```typescript
export const CHAT_FLOW_V2_TEMPLATES = {
  PLANNING_PROMPT: "Your custom planning prompt...",
  REFINEMENT_PROMPT: "Your custom refinement prompt...",
  // ... other prompts
};
```

## Testing

Use the `ChatMenuV2` component to test both v1 and v2 implementations:

1. Replace `ChatMenu` with `ChatMenuV2` in `App.tsx`
2. Use the checkbox to toggle between ChatFlow versions
3. Compare the behavior and output

## Migration from v1

The v2 implementation maintains the same external API as v1, making migration straightforward:

1. Replace `useChatFlow` with `useChatFlowV2`
2. Update component imports to use v2 versions
3. Configure prompts and features as needed

## State Management

The Zustand store provides:

- **State**: Current flow state, progress, history, errors
- **Actions**: Initialize, submit message, reset
- **Notes**: Access to all note instances
- **Configuration**: Runtime configuration options

## Error Handling

- Comprehensive error catching and reporting
- State reset functionality
- Graceful degradation on failures
- User-friendly error messages

## Performance

- Efficient state updates with Zustand
- Background note generation
- Optimized re-renders
- Memory-efficient note management

## Future Enhancements

- Additional note types
- Custom flow configurations
- A/B testing capabilities
- Analytics integration
- Performance monitoring
