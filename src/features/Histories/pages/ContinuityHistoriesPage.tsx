import { useEffect, useState } from "react";
import {
  Accordion,
  ActionIcon,
  Badge,
  Button,
  Divider,
  Group,
  Loader,
  NumberInput,
  Paper,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import {
  RiAddLine,
  RiArrowLeftLine,
  RiDeleteBinLine,
  RiHistoryLine,
  RiRefreshLine,
  RiSave3Line,
} from "react-icons/ri";
import { useNavigate, useParams } from "react-router-dom";
import { ConfirmModal } from "../../../components/ConfirmModal";
import { Page } from "../../../components/Page";
import { Theme } from "../../../components/Theme";
import { d } from "../../../services/Dependencies";
import { ModelSelect } from "../../AI/components/ModelSelect";
import { useContinuityHistories } from "../hooks/useContinuityHistories";
import {
  createContinuityHistory,
  getLatestHistoryRevision,
  normalizeContinuityHistoryStore,
  type ContinuityHistory,
  type ContinuityHistoryFieldValue,
  type ContinuityHistoryKind,
  type ContinuityHistorySettings,
  type ContinuityHistoryStore,
} from "../services/ContinuityHistory";
import type { ContinuityHistoryRefreshResult } from "../services/ContinuityHistoryMaintenanceService";

const HISTORY_KIND_OPTIONS = [
  { value: "plot-thread", label: "Plot thread" },
  { value: "place", label: "Place" },
  { value: "object", label: "Object" },
  { value: "faction", label: "Faction" },
  { value: "relationship", label: "Relationship" },
  { value: "constraint", label: "Promise / constraint" },
  { value: "world-state", label: "World state" },
  { value: "custom", label: "Custom" },
];

const INCLUSION_OPTIONS = [
  { value: "automatic", label: "Automatic — include when relevant" },
  { value: "always", label: "Always include" },
  { value: "never", label: "Never include" },
];

export const ContinuityHistoriesPage: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { store, isLoading, save, saveDebounced } = useContinuityHistories(
    chatId ?? "",
  );
  const [formStore, setFormStore] = useState<ContinuityHistoryStore>(store);
  const [revisionDrafts, setRevisionDrafts] = useState<
    Record<string, string>
  >({});
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());
  const [refreshStatus, setRefreshStatus] = useState<string>();
  const [historyToDelete, setHistoryToDelete] = useState<string>();

  useEffect(() => {
    if (isLoading) return;
    setFormStore(store);
    setRevisionDrafts((current) =>
      Object.fromEntries(
        store.histories.map((history) => [
          history.id,
          current[history.id] ?? getLatestHistoryRevision(history)?.content ?? "",
        ]),
      ),
    );
  }, [isLoading, store]);

  if (!chatId) return null;

  const updateStore = (nextStore: ContinuityHistoryStore) => {
    const normalized = normalizeContinuityHistoryStore(nextStore);
    setFormStore(normalized);
    saveDebounced(normalized);
  };

  const updateSettings = (updates: Partial<ContinuityHistorySettings>) =>
    updateStore({
      ...formStore,
      settings: {
        ...formStore.settings,
        ...updates,
      },
    });

  const updateHistory = (
    historyId: string,
    field: keyof ContinuityHistory,
    value: ContinuityHistoryFieldValue,
  ) =>
    updateStore({
      ...formStore,
      histories: formStore.histories.map((history) =>
        history.id === historyId
          ? {
              ...history,
              [field]: value,
              updatedAt: new Date().toISOString(),
            }
          : history,
      ),
    });

  const addHistory = () => {
    const history = createContinuityHistory();
    updateStore({
      ...formStore,
      histories: [...formStore.histories, history],
    });
    setRevisionDrafts((current) => ({ ...current, [history.id]: "" }));
  };

  const deleteHistory = async () => {
    if (!historyToDelete) return;
    await d.ContinuityHistoriesService(chatId).removeHistory(historyToDelete);
    setHistoryToDelete(undefined);
  };

  const refresh = async (historyId?: string) => {
    const key = historyId ?? "all";
    setRefreshingIds((current) => new Set(current).add(key));
    setRefreshStatus(undefined);
    try {
      await save(formStore);
      const result = await d
        .ContinuityHistoryMaintenanceService(chatId)
        .refresh(historyId);
      setRefreshStatus(formatRefreshResult(result));
    } finally {
      setRefreshingIds((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  };

  const saveManualRevision = async (historyId: string) => {
    const content = revisionDrafts[historyId]?.trim();
    if (!content) return;
    const currentMessages = d
      .LLMChatProjection(chatId)
      .GetMessages()
      .filter((message) => message.type === "message");
    const boundaryId = currentMessages[currentMessages.length - 1]?.id;
    await d
      .ContinuityHistoriesService(chatId)
      .saveManualRevision(historyId, content, boundaryId);
    setRefreshStatus("Manual History revision saved.");
  };

  const goBack = async () => {
    await save(formStore);
    navigate(`/chat/${chatId}`);
  };

  return (
    <Page>
      <Paper mt={20}>
        <Header onBack={goBack} />
        {isLoading ? (
          <Group justify="center" p="xl">
            <Loader size="sm" />
            <Text>Loading Histories…</Text>
          </Group>
        ) : (
          <Stack gap="xl">
            <HistorySettingsEditor
              settings={formStore.settings}
              historyCount={formStore.histories.length}
              isRefreshing={refreshingIds.size > 0}
              onChange={updateSettings}
              onRefresh={() => void refresh()}
            />

            {refreshStatus && (
              <Text size="sm" c="dimmed">
                {refreshStatus}
              </Text>
            )}

            <Divider style={{ borderColor: Theme.history.border }} />

            <Group justify="space-between" align="end">
              <div>
                <Text fw={600}>History definitions</Text>
                <Text size="sm" c="dimmed">
                  Each History follows one cross-scene subject. Its description
                  defines what belongs; routing hints help decide when to recall
                  it.
                </Text>
              </div>
              <Button
                variant="subtle"
                color="green"
                leftSection={<RiAddLine />}
                onClick={addHistory}
              >
                Add History
              </Button>
            </Group>

            {formStore.histories.length === 0 && (
              <Paper withBorder p="lg">
                <Text size="sm" c="dimmed">
                  No Histories yet. Add one manually, or enable automatic
                  discovery and refresh after the story has developed.
                </Text>
              </Paper>
            )}

            {formStore.histories.map((history) => (
              <HistoryEditor
                key={history.id}
                history={history}
                revisionDraft={revisionDrafts[history.id] ?? ""}
                isRefreshing={
                  refreshingIds.has("all") || refreshingIds.has(history.id)
                }
                featureEnabled={formStore.settings.enabled}
                onChange={(field, value) =>
                  updateHistory(history.id, field, value)
                }
                onRevisionDraftChange={(content) =>
                  setRevisionDrafts((current) => ({
                    ...current,
                    [history.id]: content,
                  }))
                }
                onSaveRevision={() => void saveManualRevision(history.id)}
                onRefresh={() => void refresh(history.id)}
                onDelete={() => setHistoryToDelete(history.id)}
              />
            ))}
          </Stack>
        )}
      </Paper>

      <ConfirmModal
        isOpen={historyToDelete !== undefined}
        onCancel={() => setHistoryToDelete(undefined)}
        onConfirm={deleteHistory}
        title="Delete History?"
        message="This removes the History definition and all of its saved revisions."
      />
    </Page>
  );
};

const Header: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <>
    <Group mb="md">
      <ActionIcon
        aria-label="Back to chat"
        variant="subtle"
        size="lg"
        onClick={onBack}
      >
        <RiArrowLeftLine color={Theme.page.text} />
      </ActionIcon>
      <RiHistoryLine size={24} color={Theme.history.primary} />
      <Title order={2} fw={400} style={{ color: Theme.history.primary }}>
        Continuity Histories
      </Title>
    </Group>
    <Text size="sm" c="dimmed" mb="lg">
      Living, versioned context about plot threads, places, objects, factions,
      relationships, mysteries, promises, and world state. Character Sheets,
      Memories, Chapters, Books, and Plans keep their existing roles.
    </Text>
    <Divider mb="xl" style={{ borderColor: Theme.history.border }} />
  </>
);

interface HistorySettingsEditorProps {
  settings: ContinuityHistorySettings;
  historyCount: number;
  isRefreshing: boolean;
  onChange: (updates: Partial<ContinuityHistorySettings>) => void;
  onRefresh: () => void;
}

const HistorySettingsEditor: React.FC<HistorySettingsEditorProps> = ({
  settings,
  historyCount,
  isRefreshing,
  onChange,
  onRefresh,
}) => (
  <Paper withBorder p="md">
    <Stack gap="md">
      <div>
        <Text fw={600}>Feature settings</Text>
        <Text size="sm" c="dimmed">
          Disabling the feature stops refresh and removes all Histories from
          generated context without deleting saved definitions or revisions.
        </Text>
      </div>

      <Switch
        label="Enable Continuity Histories for this chat"
        checked={settings.enabled}
        onChange={(event) =>
          onChange({
            enabled: event.currentTarget.checked,
            messagesSinceLastRefresh: 0,
          })
        }
      />
      <Group grow align="start" wrap="wrap">
        <NumberInput
          label="Refresh every N saved user turns"
          value={settings.refreshInterval}
          min={1}
          max={100}
          disabled={!settings.enabled}
          onChange={(value) =>
            onChange({
              refreshInterval: toInteger(value, 1, 100),
              messagesSinceLastRefresh: 0,
            })
          }
        />
        <NumberInput
          label="Messages analyzed per refresh"
          description="Only recent ordinary user and assistant messages."
          value={settings.refreshLookbackMessages}
          min={1}
          max={200}
          disabled={!settings.enabled}
          onChange={(value) =>
            onChange({
              refreshLookbackMessages: toInteger(value, 1, 200),
            })
          }
        />
      </Group>
      <Group grow align="start" wrap="wrap">
        <NumberInput
          label="Recent messages used for relevance"
          value={settings.selectionLookbackMessages}
          min={1}
          max={50}
          disabled={!settings.enabled}
          onChange={(value) =>
            onChange({
              selectionLookbackMessages: toInteger(value, 1, 50),
            })
          }
        />
        <NumberInput
          label="Keep N recent messages after Histories"
          description="Controls where selected Histories float in the request context."
          value={settings.contextTrailingMessages}
          min={0}
          max={50}
          disabled={!settings.enabled}
          onChange={(value) =>
            onChange({
              contextTrailingMessages: toInteger(value, 0, 50),
            })
          }
        />
        <NumberInput
          label="Maximum automatically selected"
          description="Always-included Histories do not count toward this limit."
          value={settings.maxSelectedHistories}
          min={1}
          max={20}
          disabled={!settings.enabled}
          onChange={(value) =>
            onChange({
              maxSelectedHistories: toInteger(value, 1, 20),
            })
          }
        />
      </Group>
      <Group grow align="start" wrap="wrap">
        <Switch
          label="Discover new Histories during refresh"
          description="The model may add durable recurring subjects conservatively."
          checked={settings.autoDiscover}
          disabled={!settings.enabled}
          onChange={(event) =>
            onChange({ autoDiscover: event.currentTarget.checked })
          }
        />
        <Switch
          label="Use the model for relevance selection"
          description="When off, selection uses local keyword overlap with no extra request."
          checked={settings.useLlmSelection}
          disabled={!settings.enabled}
          onChange={(event) =>
            onChange({ useLlmSelection: event.currentTarget.checked })
          }
        />
      </Group>

      <ModelSelect
        label="History model"
        ariaLabel="History model"
        value={settings.model ?? ""}
        emptyValueLabel="Default chat model"
        withDescription={false}
        requestSettings={settings.requestSettings}
        onChange={(value) => onChange({ model: value || undefined })}
        onRequestSettingsChange={(requestSettings) =>
          onChange({ requestSettings })
        }
      />

      <Accordion variant="contained">
        <Accordion.Item value="prompts">
          <Accordion.Control>Prompts</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <Textarea
                label="Refresh and discovery prompt"
                value={settings.refreshPrompt}
                minRows={10}
                autosize
                onChange={(event) =>
                  onChange({ refreshPrompt: event.currentTarget.value })
                }
              />
              <Textarea
                label="Relevance selection prompt"
                value={settings.selectionPrompt}
                minRows={7}
                autosize
                disabled={!settings.useLlmSelection}
                onChange={(event) =>
                  onChange({ selectionPrompt: event.currentTarget.value })
                }
              />
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <Group justify="space-between">
        <Text size="xs" c="dimmed">
          {settings.messagesSinceLastRefresh}/{settings.refreshInterval} saved
          user turns since the last automatic refresh.
        </Text>
        <Button
          size="xs"
          variant="light"
          color="green"
          leftSection={<RiRefreshLine />}
          loading={isRefreshing}
          disabled={!settings.enabled || (historyCount === 0 && !settings.autoDiscover)}
          onClick={onRefresh}
        >
          Refresh all now
        </Button>
      </Group>
    </Stack>
  </Paper>
);

interface HistoryEditorProps {
  history: ContinuityHistory;
  revisionDraft: string;
  isRefreshing: boolean;
  featureEnabled: boolean;
  onChange: (
    field: keyof ContinuityHistory,
    value: ContinuityHistoryFieldValue,
  ) => void;
  onRevisionDraftChange: (content: string) => void;
  onSaveRevision: () => void;
  onRefresh: () => void;
  onDelete: () => void;
}

const HistoryEditor: React.FC<HistoryEditorProps> = ({
  history,
  revisionDraft,
  isRefreshing,
  featureEnabled,
  onChange,
  onRevisionDraftChange,
  onSaveRevision,
  onRefresh,
  onDelete,
}) => {
  const latestRevision = getLatestHistoryRevision(history);

  return (
    <Paper withBorder p="md" style={{ borderColor: Theme.history.border }}>
      <Stack gap="md">
        <Group justify="space-between" align="start">
          <Group gap="xs">
            <Badge color="green" variant="light">
              {HISTORY_KIND_OPTIONS.find((option) => option.value === history.kind)
                ?.label ?? "Custom"}
            </Badge>
            <Badge color="gray" variant="light">
              {history.revisions.length}{" "}
              {history.revisions.length === 1 ? "revision" : "revisions"}
            </Badge>
          </Group>
          <ActionIcon
            aria-label={`Delete ${history.title || "History"}`}
            color="red"
            variant="subtle"
            onClick={onDelete}
          >
            <RiDeleteBinLine />
          </ActionIcon>
        </Group>

        <Group grow align="start" wrap="wrap">
          <TextInput
            label="Title"
            placeholder="The Brass Key"
            value={history.title}
            onChange={(event) => onChange("title", event.currentTarget.value)}
          />
          <Select
            label="Kind"
            data={HISTORY_KIND_OPTIONS}
            value={history.kind}
            allowDeselect={false}
            onChange={(value) =>
              onChange("kind", (value ?? "custom") as ContinuityHistoryKind)
            }
          />
          <Select
            label="Context inclusion"
            data={INCLUSION_OPTIONS}
            value={history.inclusion}
            allowDeselect={false}
            onChange={(value) =>
              onChange(
                "inclusion",
                (value ?? "automatic") as ContinuityHistory["inclusion"],
              )
            }
          />
        </Group>

        <Textarea
          label="Description"
          description="The narrow responsibility of this History."
          placeholder="Track the key's ownership, uses, condition, and unresolved significance."
          value={history.description}
          minRows={2}
          autosize
          onChange={(event) =>
            onChange("description", event.currentTarget.value)
          }
        />
        <Textarea
          label="Routing hints"
          description="Comma- or line-separated names, aliases, topics, and situations that make this History relevant."
          placeholder="brass key, lighthouse door, Mara's satchel"
          value={history.routingHints.join(", ")}
          minRows={2}
          autosize
          onChange={(event) =>
            onChange("routingHints", parseRoutingHints(event.currentTarget.value))
          }
        />

        <Textarea
          label="Current revision"
          description={
            latestRevision
              ? `Latest ${latestRevision.origin} revision · ${new Date(
                  latestRevision.createdAt,
                ).toLocaleString()}`
              : "No revision yet. Write one manually or generate it from recent chat."
          }
          placeholder="## Current state\n\n..."
          value={revisionDraft}
          minRows={8}
          autosize
          onChange={(event) =>
            onRevisionDraftChange(event.currentTarget.value)
          }
        />

        <Group justify="space-between" align="center">
          <Group>
            <Button
              size="xs"
              variant="light"
              color="green"
              leftSection={<RiSave3Line />}
              disabled={!revisionDraft.trim()}
              onClick={onSaveRevision}
            >
              Save manual revision
            </Button>
            <Button
              size="xs"
              variant="subtle"
              color="green"
              leftSection={<RiRefreshLine />}
              loading={isRefreshing}
              disabled={!featureEnabled || !history.title.trim()}
              onClick={onRefresh}
            >
              Generate / update
            </Button>
          </Group>
          {latestRevision?.coveredThroughMessageId && (
            <Text size="xs" c="dimmed">
              Covered through {latestRevision.coveredThroughMessageId}
            </Text>
          )}
        </Group>

        {history.revisions.length > 1 && (
          <Accordion variant="contained">
            <Accordion.Item value="revisions">
              <Accordion.Control>Earlier revisions</Accordion.Control>
              <Accordion.Panel>
                <Stack gap="sm">
                  {[...history.revisions]
                    .slice(0, -1)
                    .reverse()
                    .map((revision) => (
                      <Paper key={revision.id} p="sm" withBorder>
                        <Text size="xs" c="dimmed" mb={6}>
                          {new Date(revision.createdAt).toLocaleString()} ·{" "}
                          {revision.origin} · {revision.sourceMessageIds.length}{" "}
                          source messages
                        </Text>
                        <Text
                          size="sm"
                          style={{ whiteSpace: "pre-wrap" }}
                        >
                          {revision.content}
                        </Text>
                      </Paper>
                    ))}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        )}
      </Stack>
    </Paper>
  );
};

const parseRoutingHints = (value: string): string[] =>
  value
    .split(/[,\n]/)
    .map((hint) => hint.trim())
    .filter(Boolean);

const toInteger = (
  value: string | number,
  minimum: number,
  maximum: number,
): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return minimum;
  return Math.min(maximum, Math.max(minimum, Math.round(parsed)));
};

const formatRefreshResult = (
  result: ContinuityHistoryRefreshResult,
): string => {
  if (result.status === "disabled") return "Continuity Histories are disabled.";
  if (result.status === "failed") return "The History refresh failed.";
  if (result.status === "unchanged") return "No History changes were needed.";
  if (result.status === "waiting") {
    return `${result.messagesUntilRefresh ?? 0} saved user turns until refresh.`;
  }
  return `${result.updatedCount} updated; ${result.discoveredCount} discovered.`;
};
