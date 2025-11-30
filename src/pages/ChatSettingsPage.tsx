import React from "react";
import { useNavigate } from "react-router-dom";
import { Title, Grid, Paper, ActionIcon, Group, Divider } from "@mantine/core";
import { RiArrowLeftLine, RiChatSettingsLine } from "react-icons/ri";
import { GrokKeyManager } from "./ChatSettings/GrokKeyManager";
import { ChatSettingsEditor } from "./ChatSettings/ChatSettingsEditor";
import { Page } from "./Page";
import { ChatTheme } from "../theme/chatTheme";

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

const ChatSettingsPage: React.FC = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <Page>
      <PageHeader onBack={handleGoBack} />
      <Grid>
        <SettingsSection title="Grok API Configuration">
          <GrokKeyManager />
        </SettingsSection>

        <SettingsSection title="Chat Generation Settings">
          <ChatSettingsEditor onSave={() => {}} />
        </SettingsSection>
      </Grid>
    </Page>
  );
};

const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  children,
}) => (
  <Grid.Col span={{ base: 12, md: 6 }}>
    <Paper
      p="xl"
      radius="md"
      style={{
        background: ChatTheme.page.paperBackground,
        backdropFilter: ChatTheme.page.backdropBlur,
        color: ChatTheme.page.text,
      }}
    >
      <Title
        order={3}
        mb="md"
        style={{ color: ChatTheme.chatSettings.primary }}
      >
        {title}
      </Title>
      <Divider mb="lg" style={{ borderColor: ChatTheme.chatSettings.border }} />
      {children}
    </Paper>
  </Grid.Col>
);

const PageHeader: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <>
    <Group mb="md">
      <ActionIcon onClick={onBack} size="lg" variant="subtle">
        <RiArrowLeftLine color={ChatTheme.page.text} />
      </ActionIcon>
      <RiChatSettingsLine size={28} color={ChatTheme.chatSettings.primary} />
      <Title
        order={1}
        fw={400}
        style={{ color: ChatTheme.chatSettings.primary }}
      >
        Chat Settings
      </Title>
    </Group>
    <Divider mb="xl" style={{ borderColor: ChatTheme.chatSettings.border }} />
  </>
);

export default ChatSettingsPage;
