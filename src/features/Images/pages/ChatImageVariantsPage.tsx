import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Title,
  Button,
  Group,
  Paper,
  ActionIcon,
  Stack,
  Text,
  Divider,
  Loader,
  Alert,
  Modal,
  Badge,
  Box,
  Anchor,
} from "@mantine/core";
import {
  RiArrowLeftLine,
  RiAddLine,
  RiImageLine,
  RiEditLine,
  RiCheckLine,
  RiErrorWarningLine,
  RiExternalLinkLine,
  RiLockLine,
} from "react-icons/ri";
import { useChatImageVariants } from "../hooks/useChatImageVariants";
import { useImageModels } from "../hooks/useImageModels";
import { ModelSampleImage } from "../components/ModelSampleImage";
import { Page } from "../../../components/Page";
import { Theme } from "../../../components/Theme";
import { d } from "../../../services/Dependencies";
import type { ImageModelVariant } from "../services/ImageModelVariant";
import type {
  AnyImageModel,
  ImageModel,
} from "../services/modelGeneration/ImageModel";
import {
  isLegacyJobImageModel,
  isWorkflowImageModel,
} from "../services/modelGeneration/ImageModel";

export const ChatImageVariantsPage: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();

  const {
    chatImageVariants,
    loading,
    error,
    selectVariant,
    selectSystemModel,
    createVariant,
    getSelectedVariant,
  } = useChatImageVariants(chatId!);

  const { userImageModels, loading: loadingModels } = useImageModels();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [hasLegacyModels, setHasLegacyModels] = useState(false);

  useEffect(() => {
    const checkLegacy = async () => {
      try {
        const legacy = await d.ChatImageModelService(chatId!).GetAll();
        if (legacy.models.length > 0) {
          setHasLegacyModels(true);
        }
      } catch {
        // No legacy data — fine
      }
    };
    checkLegacy();
  }, [chatId]);

  const handleGoBack = async () => {
    await d.ChatImageVariantService(chatId!).SavePendingChanges();
    navigate(`/chat/${chatId}`);
  };

  const handleSelectVariant = async (variantId: string) => {
    await selectVariant(variantId);
  };

  const handleSelectSystemModel = async (modelId: string) => {
    await selectSystemModel(modelId);
  };

  const handleEditVariant = (variantId: string) => {
    navigate(`/chat/${chatId}/image-variants/edit/${variantId}`);
  };

  const handlePickParent = async (parentModel: ImageModel) => {
    setAddModalOpen(false);
    const variant = await createVariant(
      parentModel.id,
      `${parentModel.name} Variant`,
    );
    if (variant) {
      navigate(`/chat/${chatId}/image-variants/edit/${variant.id}`);
    }
  };

  const selectedVariant = getSelectedVariant();
  const isLoading = loading || loadingModels;

  return (
    <Page>
      <Paper mt={20}>
        <PageHeader onGoBack={handleGoBack} />

        {hasLegacyModels && (
          <Alert
            icon={<RiErrorWarningLine />}
            color="yellow"
            mb="md"
            title="Previous chat models detected"
          >
            This chat has image models from an older format. They are no longer
            used — please add a new variant to configure image generation for
            this chat.
          </Alert>
        )}

        {error && (
          <Alert color="red" mb="md">
            {error}
          </Alert>
        )}

        {isLoading ? (
          <Group justify="center" p="xl">
            <Loader />
            <Text>Loading variants…</Text>
          </Group>
        ) : (
          <Stack>
            {/* ── Variants section ── */}
            <Stack gap={4}>
              <Group justify="space-between">
                <Text fw={500}>Chat-Specific Variants</Text>
                <Group gap="xs">
                  <Anchor
                    href="/default-image-models"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate("/default-image-models");
                    }}
                    size="sm"
                    style={{ color: Theme.imageModel.secondary }}
                  >
                    <Group gap={4}>
                      <RiExternalLinkLine size={14} />
                      Add a System Model
                    </Group>
                  </Anchor>
                  <Button
                    variant="subtle"
                    onClick={() => setAddModalOpen(true)}
                    style={{ color: Theme.imageModel.primary }}
                    leftSection={<RiAddLine size={16} />}
                    disabled={
                      !userImageModels.models.some(isWorkflowImageModel)
                    }
                  >
                    Add Variant
                  </Button>
                </Group>
              </Group>
              <Text size="sm" c="dimmed">
                Variants let you tweak a system model's settings for this chat only — overriding prompts, networks, or parameters without affecting the original.
              </Text>
            </Stack>

            {chatImageVariants.variants.length === 0 ? (
              <Paper withBorder p="xl" ta="center">
                <Stack align="center" gap="md">
                  <RiImageLine size={48} color={Theme.page.textMuted} />
                  <Text c="dimmed">No image model variants for this chat.</Text>
                  {userImageModels.models.length === 0 ? (
                    <Text size="sm" c="dimmed">
                      Create system Image Models first, then add variants here.
                    </Text>
                  ) : (
                    <Button
                      onClick={() => setAddModalOpen(true)}
                      leftSection={<RiAddLine size={16} />}
                    >
                      Add Variant
                    </Button>
                  )}
                </Stack>
              </Paper>
            ) : (
              chatImageVariants.variants.map((variant) => {
                const parent = userImageModels.models.find(
                  (m) => m.id === variant.parentModelId,
                );
                return (
                  <VariantListItem
                    key={variant.id}
                    variant={variant}
                    parent={parent ?? null}
                    isSelected={selectedVariant?.id === variant.id}
                    onSelect={() => handleSelectVariant(variant.id)}
                    onEdit={() => handleEditVariant(variant.id)}
                  />
                );
              })
            )}

            {/* ── System Models section ── */}
            {userImageModels.models.length > 0 && (
              <>
                <Divider
                  label={<Text fw={500}>System Models</Text>}
                  labelPosition="left"
                  mt="md"
                />
                <Text size="sm" c="dimmed">
                  Select a system model to use directly for this chat — no variant required.
                </Text>
                {userImageModels.models.map((model) => {
                  const isSelected =
                    !chatImageVariants.selectedVariantId &&
                    chatImageVariants.selectedSystemModelId === model.id;
                  return (
                    <SystemModelListItem
                      key={model.id}
                      model={model}
                      isSelected={isSelected}
                      onSelect={() => handleSelectSystemModel(model.id)}
                    />
                  );
                })}
              </>
            )}
          </Stack>
        )}
      </Paper>

      <SelectParentModal
        opened={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        models={userImageModels.models}
        onSelect={handlePickParent}
      />
    </Page>
  );
};

const PageHeader: React.FC<{ onGoBack: () => void }> = ({ onGoBack }) => (
  <>
    <Group justify="space-between" align="center" mb="md">
      <Group>
        <ActionIcon onClick={onGoBack} variant="subtle" size="lg">
          <RiArrowLeftLine color={Theme.page.text} />
        </ActionIcon>
        <RiImageLine size={24} color={Theme.imageModel.primary} />
        <Title order={2} fw={400} style={{ color: Theme.imageModel.primary }}>
          Chat Image Models
        </Title>
      </Group>
    </Group>
    <Divider mb="xl" style={{ borderColor: Theme.imageModel.border }} />
  </>
);

const VariantListItem: React.FC<{
  variant: ImageModelVariant;
  parent: AnyImageModel | null;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
}> = ({ variant, parent, isSelected, onSelect, onEdit }) => {
  const overrideCount = countOverrides(variant);
  const parentIsLegacy = isLegacyJobImageModel(parent);
  const canUse = !!parent && !parentIsLegacy;

  return (
    <Paper withBorder p="md" mb="md" w="100%">
      <Group wrap="nowrap" align="flex-start" gap="md" w="100%">
        <Box>
          <ModelSampleImage
            sampleImageJobId={variant.overrides.sampleWorkflowId}
            size="medium"
          />
        </Box>

        <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" wrap="wrap">
            <Title order={4}>{variant.name}</Title>
            {isSelected && (
              <Badge color="blue" variant="filled" size="sm">
                Selected
              </Badge>
            )}
            {parent ? (
              <Badge
                color={parentIsLegacy ? "yellow" : "lime"}
                variant="light"
                size="sm"
                style={{ color: Theme.imageModel.secondary }}
              >
                {parentIsLegacy ? "Parent needs migration" : parent.name}
              </Badge>
            ) : (
              <Badge color="red" variant="light" size="sm">
                Parent missing
              </Badge>
            )}
            {overrideCount > 0 && (
              <Badge color="yellow" variant="outline" size="sm">
                {overrideCount} override{overrideCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </Group>
          {parent && isWorkflowImageModel(parent) && (
            <Text size="xs" c="dimmed" lineClamp={2}>
              Base: {parent.input.prompt?.slice(0, 80)}
              {(parent.input.prompt?.length ?? 0) > 80 ? "…" : ""}
            </Text>
          )}
          {parentIsLegacy && (
            <Text size="xs" c="yellow.8">
              Migrate the parent system model before selecting or editing this
              variant.
            </Text>
          )}
          {!parent && (
            <Text size="xs" c="red">
              The parent model has been deleted. Edit this variant to reassign a
              parent.
            </Text>
          )}
        </Stack>

        <Stack gap="xs" style={{ flexShrink: 0 }}>
          <Button
            size="sm"
            variant="light"
            onClick={onSelect}
            disabled={!canUse}
            fullWidth
          >
            {isSelected ? (
              <Group gap="xs">
                <RiCheckLine size={14} /> Selected
              </Group>
            ) : (
              "Select"
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            leftSection={
              canUse ? <RiEditLine size={14} /> : <RiLockLine size={14} />
            }
            onClick={onEdit}
            fullWidth
          >
            {canUse ? "Edit" : "View locked"}
          </Button>
        </Stack>
      </Group>
    </Paper>
  );
};

const SystemModelListItem: React.FC<{
  model: AnyImageModel;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ model, isSelected, onSelect }) => {
  const isLegacy = isLegacyJobImageModel(model);
  const input = isLegacy ? undefined : model.input;

  return (
  <Paper withBorder p="md" mb="sm" w="100%">
    <Group wrap="nowrap" align="flex-start" gap="md" w="100%">
      <Box>
        <ModelSampleImage sampleImageJobId={model.sampleWorkflowId} size="medium" />
      </Box>
      <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
        <Group gap="xs" wrap="wrap">
          <Title order={4}>{model.name}</Title>
          {isSelected && (
            <Badge color="blue" variant="filled" size="sm">
              Selected
            </Badge>
          )}
          {isLegacy && (
            <Badge color="yellow" variant="light" size="sm">
              Legacy image model
            </Badge>
          )}
        </Group>
        <Text size="xs" c="dimmed" lineClamp={2}>
          {isLegacy
            ? "Migrate this model before selecting it for chat image generation."
            : input?.prompt?.slice(0, 100)}
          {(input?.prompt?.length ?? 0) > 100 ? "…" : ""}
        </Text>
      </Stack>
      <Button
        size="sm"
        variant="light"
        onClick={onSelect}
        disabled={isLegacy}
        style={{ flexShrink: 0 }}
      >
        {isSelected ? (
          <Group gap="xs">
            <RiCheckLine size={14} /> Selected
          </Group>
        ) : (
          "Select"
        )}
      </Button>
    </Group>
  </Paper>
  );
};

const countOverrides = (variant: ImageModelVariant): number => {
  const o = variant.overrides;
  let count = 0;
  if ("sampleWorkflowId" in o) count++;
  if ("imageGenerationPrompt" in o) count++;
  if ("appendImageGenerationPromptToBase" in o) count++;
  if ("trainedWords" in o) count++;
  if (o.input?.model !== undefined) count++;
  if (o.input?.loras !== undefined) count++;
  count += Object.keys(o.input ?? {}).filter(k => k !== "model" && k !== "loras").length;
  return count;
};

const SelectParentModal: React.FC<{
  opened: boolean;
  onClose: () => void;
  models: AnyImageModel[];
  onSelect: (model: ImageModel) => void;
}> = ({ opened, onClose, models, onSelect }) => (
  <Modal
    opened={opened}
    onClose={onClose}
    title="Select a base Image Model"
    size="lg"
  >
    <Stack>
      <Text size="sm" c="dimmed">
        Choose the system Image Model this variant will be based on. You can
        override individual fields after creation.
      </Text>
      {models.map((model) => {
        const isLegacy = isLegacyJobImageModel(model);
        return (
        <Paper
          key={model.id}
          withBorder
          p="md"
          style={{ cursor: isLegacy ? "not-allowed" : "pointer" }}
          onClick={() => {
            if (isWorkflowImageModel(model)) onSelect(model);
          }}
        >
          <Group wrap="nowrap" gap="md">
            <ModelSampleImage
              sampleImageJobId={model.sampleWorkflowId}
              size="small"
            />
            <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
              <Text fw={500}>{model.name}</Text>
              <Text size="xs" c="dimmed" lineClamp={1}>
                {isLegacy
                  ? "Migrate this model before creating variants."
                  : model.input.prompt?.slice(0, 80)}
              </Text>
            </Stack>
            {isLegacy && (
              <Badge color="yellow" variant="light">
                Legacy
              </Badge>
            )}
          </Group>
        </Paper>
        );
      })}
    </Stack>
  </Modal>
);
