import { Modal, Stack, Text, Button, Group, Box } from "@mantine/core";

interface ViewPromptModalProps {
  opened: boolean;
  prompt: string;
  characterDescription?: string;
  basePrompt?: string;
  sceneDescription?: string;
  onClose: () => void;
}

export const ViewPromptModal: React.FC<ViewPromptModalProps> = ({
  opened,
  prompt,
  characterDescription,
  basePrompt,
  sceneDescription,
  onClose,
}) => {
  const segments = buildPromptSegments(prompt, {
    basePrompt,
    characterDescription,
    sceneDescription,
  });
  const visibleKeys = PROMPT_SECTION_KEYS.filter((key) =>
    segments.some((segment) => segment.type === key.type),
  );

  return (
    <Modal opened={opened} onClose={onClose} title="Image Prompt" size="lg">
      <Stack>
        <Text size="sm" c="dimmed">
          Full prompt
        </Text>
        {visibleKeys.length > 0 && (
          <Group gap="sm">
            {visibleKeys.map((key) => (
              <Group key={key.type} gap={6}>
                <Box
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    backgroundColor: key.color,
                  }}
                />
                <Text size="xs" c="dimmed">
                  {key.label}
                </Text>
              </Group>
            ))}
          </Group>
        )}
        <Box
          component="pre"
          style={{
            margin: 0,
            padding: "12px",
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            borderRadius: 6,
            backgroundColor: "var(--mantine-color-dark-6)",
            color: "var(--mantine-color-gray-1)",
            fontSize: "0.8125rem",
            lineHeight: 1.55,
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          }}
        >
          {segments.map((segment, index) => (
            <span
              key={`${segment.type}-${index}`}
              style={getSegmentStyle(segment.type)}
            >
              {segment.text}
            </span>
          ))}
        </Box>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

type PromptSegmentType = "base" | "character" | "scene" | "plain";

type PromptSegment = {
  type: PromptSegmentType;
  text: string;
};

const PROMPT_SECTION_KEYS: {
  type: Exclude<PromptSegmentType, "plain">;
  label: string;
  color: string;
  backgroundColor: string;
}[] = [
  {
    type: "base",
    label: "Base prompt",
    color: "#74c0fc",
    backgroundColor: "rgba(116, 192, 252, 0.18)",
  },
  {
    type: "character",
    label: "Character",
    color: "#63e6be",
    backgroundColor: "rgba(99, 230, 190, 0.18)",
  },
  {
    type: "scene",
    label: "Scene",
    color: "#ffd43b",
    backgroundColor: "rgba(255, 212, 59, 0.18)",
  },
];

const buildPromptSegments = (
  prompt: string,
  sections: {
    basePrompt?: string;
    characterDescription?: string;
    sceneDescription?: string;
  },
): PromptSegment[] => {
  const sectionInputs: {
    type: Exclude<PromptSegmentType, "plain">;
    text?: string;
  }[] = [
    { type: "base", text: sections.basePrompt },
    { type: "character", text: sections.characterDescription },
    { type: "scene", text: sections.sceneDescription },
  ];

  const segments: PromptSegment[] = [];
  let cursor = 0;

  for (const section of sectionInputs) {
    const text = section.text?.trim();
    if (!text) continue;

    const index = prompt.indexOf(text, cursor);
    if (index === -1) continue;

    if (index > cursor) {
      segments.push({ type: "plain", text: prompt.slice(cursor, index) });
    }

    segments.push({ type: section.type, text: prompt.slice(index, index + text.length) });
    cursor = index + text.length;
  }

  if (cursor < prompt.length) {
    segments.push({ type: "plain", text: prompt.slice(cursor) });
  }

  return segments.length > 0 ? segments : [{ type: "plain", text: prompt }];
};

const getSegmentStyle = (type: PromptSegmentType): React.CSSProperties => {
  const key = PROMPT_SECTION_KEYS.find((section) => section.type === type);
  if (!key) return {};

  return {
    color: key.color,
    backgroundColor: key.backgroundColor,
    borderRadius: 3,
    padding: "0 2px",
  };
};
