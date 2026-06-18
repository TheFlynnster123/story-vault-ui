import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Title,
  Paper,
  ActionIcon,
  Group,
  Divider,
  Stack,
  TextInput,
  Button,
  Alert,
  Loader,
  Badge,
  Text,
  Box,
  Tooltip,
} from "@mantine/core";
import {
  RiArrowLeftLine,
  RiImageLine,
  RiDeleteBinLine,
  RiRefreshLine,
} from "react-icons/ri";
import { Page } from "../../../components/Page";
import { d } from "../../../services/Dependencies";
import { Theme } from "../../../components/Theme";
import { SampleImageGenerator } from "../components/SampleImageGenerator";
import { ModelSampleImage } from "../components/ModelSampleImage";
import { ImageGenerationPromptSection } from "../components/ImageGenerationPromptSection";
import {
  PromptsComponent,
  ParametersComponent,
  AdditionalModelsComponent,
} from "../components/ImageModelViewComponents";
import { ConfirmModal } from "../../../components/ConfirmModal";
import type {
  AnyImageModel,
  ImageModel,
} from "../services/modelGeneration/ImageModel";
import {
  isLegacyJobImageModel,
  isWorkflowImageModel,
} from "../services/modelGeneration/ImageModel";
import type {
  ImageModelVariant,
  ImageModelVariantOverrides,
} from "../services/ImageModelVariant";
import {
  resolveVariant,
  computeOverriddenFields,
} from "../services/ImageModelVariant";
import type { ImageGenInput } from "../services/api/ImageGenInput";

// ---------------------------------------------------------------------------
// Override diff helpers
// ---------------------------------------------------------------------------

const arraysShallowEqual = (a?: string[], b?: string[]): boolean => {
  if (a === b) return true;
  if (!a || !b) return a === b;
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
};

const lorасEqual = (
  a?: Record<string, number>,
  b?: Record<string, number>,
): boolean => JSON.stringify(a ?? {}) === JSON.stringify(b ?? {});

const computeNewOverrides = (
  resolved: ImageModel,
  parent: ImageModel,
): ImageModelVariantOverrides => {
  const overrides: ImageModelVariantOverrides = {};

  if (resolved.sampleWorkflowId !== parent.sampleWorkflowId) {
    overrides.sampleWorkflowId = resolved.sampleWorkflowId;
  }
  if (resolved.imageGenerationPrompt !== parent.imageGenerationPrompt) {
    overrides.imageGenerationPrompt = resolved.imageGenerationPrompt;
  }
  if (
    resolved.appendImageGenerationPromptToBase !==
    parent.appendImageGenerationPromptToBase
  ) {
    overrides.appendImageGenerationPromptToBase =
      resolved.appendImageGenerationPromptToBase;
  }
  if (!arraysShallowEqual(resolved.trainedWords, parent.trainedWords)) {
    overrides.trainedWords = resolved.trainedWords;
  }
  if (resolved.priority !== parent.priority) {
    overrides.priority = resolved.priority;
  }

  const inputOverrides: Partial<ImageGenInput> = {};
  let hasInput = false;

  const allInputKeys = new Set([
    ...Object.keys(parent.input),
    ...Object.keys(resolved.input),
  ]) as Set<keyof ImageGenInput>;

  for (const key of allInputKeys) {
    if (key === "loras") continue; // handled separately
    const parentVal = parent.input[key];
    const resolvedVal = resolved.input[key];
    if (resolvedVal !== parentVal) {
      (inputOverrides as any)[key] = resolvedVal;
      hasInput = true;
    }
  }

  if (!lorасEqual(resolved.input.loras, parent.input.loras)) {
    inputOverrides.loras = resolved.input.loras;
    hasInput = true;
  }

  if (hasInput) {
    overrides.input = inputOverrides;
  }

  return overrides;
};

// ---------------------------------------------------------------------------
// Override section wrapper
// ---------------------------------------------------------------------------

const OVERRIDE_COLOR = "rgba(234, 179, 8, 0.8)";
const OVERRIDE_BG = "rgba(234, 179, 8, 0.06)";

interface OverrideSectionProps {
  title: string;
  overrideCount: number;
  onReset: () => void;
  children: React.ReactNode;
}

const OverrideSection: React.FC<OverrideSectionProps> = ({
  title,
  overrideCount,
  onReset,
  children,
}) => {
  const isOverridden = overrideCount > 0;
  return (
    <Box
      style={{
        borderLeft: `3px solid ${isOverridden ? OVERRIDE_COLOR : "transparent"}`,
        background: isOverridden ? OVERRIDE_BG : "transparent",
        borderRadius: "4px",
        padding: isOverridden ? "12px 12px 12px 16px" : "0",
        transition: "all 0.15s ease",
      }}
    >
      <Group justify="space-between" mb="xs">
        <Group gap="xs">
          {isOverridden && (
            <Badge color="yellow" variant="light" size="sm">
              {overrideCount} override{overrideCount !== 1 ? "s" : ""}
            </Badge>
          )}
        </Group>
        {isOverridden && (
          <Tooltip label={`Reset ${title} to parent defaults`}>
            <Button
              size="xs"
              variant="subtle"
              color="yellow"
              leftSection={<RiRefreshLine size={12} />}
              onClick={onReset}
            >
              Reset
            </Button>
          </Tooltip>
        )}
      </Group>
      {children}
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const ChatImageVariantEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { chatId, variantId } = useParams<{
    chatId: string;
    variantId: string;
  }>();

  const [variant, setVariant] = useState<ImageModelVariant | null>(null);
  const [parent, setParent] = useState<AnyImageModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [parentMissing, setParentMissing] = useState(false);

  const service = d.ChatImageVariantService(chatId!);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await service.GetAll();
        const found = data.variants.find((v) => v.id === variantId);
        if (!found) {
          setError("Variant not found");
          return;
        }
        setVariant(found);

        const parentModel = await service.findParentModel(found.parentModelId);
        if (parentModel) {
          setParent(parentModel);
        } else {
          setParentMissing(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load variant");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [chatId, variantId]);

  const parentIsLegacy = isLegacyJobImageModel(parent);
  const workflowParent = isWorkflowImageModel(parent) ? parent : null;
  const resolved =
    variant && workflowParent ? resolveVariant(variant, workflowParent) : null;
  const overridden = variant
    ? computeOverriddenFields(variant.overrides)
    : null;

  const saveOverrides = async (newOverrides: ImageModelVariantOverrides) => {
    if (!variant) return;
    const updated: ImageModelVariant = { ...variant, overrides: newOverrides };
    setVariant(updated);
    await service.SaveVariant(updated);
  };

  const handleResolvedModelChange = async (updatedResolved: ImageModel) => {
    if (!workflowParent || !variant) return;
    const newOverrides = computeNewOverrides(updatedResolved, workflowParent);
    await saveOverrides(newOverrides);
  };

  const handleNameChange = async (value: string) => {
    if (!variant) return;
    const updated: ImageModelVariant = { ...variant, name: value };
    setVariant(updated);
    await service.SaveVariant(updated);
  };

  const handleSampleJobCreated = async (jobId: string) => {
    if (!resolved || !workflowParent || !variant) return;
    await handleResolvedModelChange({ ...resolved, sampleWorkflowId: jobId });
  };

  const handleGoBack = async () => {
    await service.SavePendingChanges();
    navigate(`/chat/${chatId}/image-variants`);
  };

  const handleDeleteConfirm = async () => {
    if (!variant) return;
    setShowDeleteConfirm(false);
    await service.DeleteVariant(variant.id);
    await service.SavePendingChanges();
    navigate(`/chat/${chatId}/image-variants`);
  };

  // Section-level reset helpers
  const resetPromptsSection = async () => {
    if (!workflowParent || !resolved || !variant) return;
    const newResolved: ImageModel = {
      ...resolved,
      input: {
        ...resolved.input,
        prompt: workflowParent.input.prompt,
        negativePrompt: workflowParent.input.negativePrompt,
      },
      trainedWords: workflowParent.trainedWords,
    };
    await handleResolvedModelChange(newResolved);
  };

  const resetParametersSection = async () => {
    if (!workflowParent || !resolved || !variant) return;
    await handleResolvedModelChange({
      ...resolved,
      input: { ...workflowParent.input },
      priority: workflowParent.priority,
    });
  };

  const resetGenerationPromptSection = async () => {
    if (!workflowParent || !resolved) return;
    await handleResolvedModelChange({
      ...resolved,
      imageGenerationPrompt: workflowParent.imageGenerationPrompt,
      appendImageGenerationPromptToBase:
        workflowParent.appendImageGenerationPromptToBase,
    });
  };

  if (loading) {
    return (
      <Page>
        <Stack align="center" p="xl">
          <Loader />
        </Stack>
      </Page>
    );
  }

  if (error || !variant) {
    return (
      <Page>
        <Alert color="red" title="Error">
          {error ?? "Variant not found"}
        </Alert>
        <Button onClick={handleGoBack} mt="md">
          Back to Variants
        </Button>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        variantName={variant.name}
        parentName={parent?.name}
        onBack={handleGoBack}
        onDelete={() => setShowDeleteConfirm(true)}
      />

      {parentMissing && (
        <Alert color="red" mb="md" title="Parent model missing">
          The base Image Model for this variant has been deleted. Image
          generation will fall back to your system default until you create a
          new variant.
        </Alert>
      )}

      {parentIsLegacy && (
        <Alert color="yellow" mb="md" title="Parent migration required">
          This variant is locked because its parent model uses the previous image model
          format. Migrate the parent model to workflow before editing or
          selecting this variant.
        </Alert>
      )}

      <Paper withBorder p="xl" radius="md">
        <Stack>
          <ModelSampleImage
            sampleImageJobId={
              variant.overrides.sampleWorkflowId ??
              workflowParent?.sampleWorkflowId
            }
            size="large"
          />

          {resolved && (
            <SampleImageGenerator
              model={resolved}
              onSampleImageCreated={handleSampleJobCreated}
            />
          )}

          <TextInput
            label="Variant Name"
            value={variant.name}
            onChange={(e) => handleNameChange(e.target.value)}
            description="This variant's display name — independent of the parent model."
          />

          {resolved && overridden && (
            <>
              <Divider label="Prompts" labelPosition="left" />
              <OverrideSection
                title="Prompts"
                overrideCount={
                  (overridden.inputParams.prompt ? 1 : 0) +
                  (overridden.inputParams.negativePrompt ? 1 : 0) +
                  (overridden.trainedWords ? 1 : 0)
                }
                onReset={resetPromptsSection}
              >
                <PromptsComponent
                  imageModel={resolved}
                  onChange={handleResolvedModelChange}
                />
              </OverrideSection>

              <Divider label="Parameters" labelPosition="left" />
              <OverrideSection
                title="Parameters"
                overrideCount={
                  (overridden.inputModel ? 1 : 0) +
                  (overridden.inputParams.sampleMethod ? 1 : 0) +
                  (overridden.inputParams.steps ? 1 : 0) +
                  (overridden.inputParams.cfgScale ? 1 : 0) +
                  (overridden.inputParams.width ? 1 : 0) +
                  (overridden.inputParams.height ? 1 : 0) +
                  (overridden.inputParams.clipSkip ? 1 : 0) +
                  (overridden.priority ? 1 : 0) +
                  (overridden.inputLoras ? 1 : 0)
                }
                onReset={resetParametersSection}
              >
                <ParametersComponent
                  imageModel={resolved}
                  onChange={handleResolvedModelChange}
                />
                <AdditionalModelsComponent
                  imageModel={resolved}
                  onChange={handleResolvedModelChange}
                />
              </OverrideSection>

              <Divider label="Image Generation Prompt" labelPosition="left" />
              <OverrideSection
                title="Image Generation Prompt"
                overrideCount={
                  (overridden.imageGenerationPrompt ? 1 : 0) +
                  (overridden.appendImageGenerationPromptToBase ? 1 : 0)
                }
                onReset={resetGenerationPromptSection}
              >
                <ImageGenerationPromptSection
                  prompt={resolved.imageGenerationPrompt ?? ""}
                  appendToBase={
                    resolved.appendImageGenerationPromptToBase ?? false
                  }
                  onPromptChange={(val) =>
                    handleResolvedModelChange({
                      ...resolved,
                      imageGenerationPrompt: val || undefined,
                    })
                  }
                  onAppendToBaseChange={(checked) =>
                    handleResolvedModelChange({
                      ...resolved,
                      appendImageGenerationPromptToBase: checked,
                    })
                  }
                />
              </OverrideSection>
            </>
          )}
        </Stack>
      </Paper>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Delete Variant"
        message="Are you sure you want to delete this variant? This cannot be undone."
      />
    </Page>
  );
};

const PageHeader: React.FC<{
  variantName: string;
  parentName?: string;
  onBack: () => void;
  onDelete: () => void;
}> = ({ variantName, parentName, onBack, onDelete }) => (
  <>
    <Group justify="space-between" align="center" mb="md">
      <Group>
        <ActionIcon onClick={onBack} variant="subtle" size="lg">
          <RiArrowLeftLine color={Theme.page.text} />
        </ActionIcon>
        <RiImageLine size={24} color={Theme.imageModel.primary} />
        <Stack gap={0}>
          <Title order={2} fw={400} style={{ color: Theme.imageModel.primary }}>
            {variantName}
          </Title>
          {parentName && (
            <Text size="xs" c="dimmed">
              Based on: {parentName}
            </Text>
          )}
        </Stack>
      </Group>
      <ActionIcon
        variant="subtle"
        color="red"
        size="lg"
        onClick={onDelete}
        title="Delete variant"
      >
        <RiDeleteBinLine />
      </ActionIcon>
    </Group>
    <Divider mb="xl" style={{ borderColor: Theme.imageModel.border }} />
  </>
);

export default ChatImageVariantEditPage;
