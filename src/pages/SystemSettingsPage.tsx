import React from "react";
import { useNavigate } from "react-router-dom";
import { Title, Grid, Paper, ActionIcon, Group, Divider } from "@mantine/core";
import { RiArrowLeftLine } from "react-icons/ri";
import { GrokKeyManager } from "./SystemSettings/GrokKeyManager";
import { CivitaiKeyManager } from "./SystemSettings/CivitaiKeyManager";
import { ChatGenerationSettingsManager } from "./SystemSettings/ChatGenerationSettingsManager";
import { ImageGenerationSettingsManager } from "./SystemSettings/ImageGenerationSettingsManager";
import { Page } from "./Page";

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

const SystemSettingsPage: React.FC = () => {
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

        <SettingsSection title="Civitai API Configuration">
          <CivitaiKeyManager />
        </SettingsSection>

        <SettingsSection title="Image Generation Settings">
          <ImageGenerationSettingsManager onSave={() => {}} />
        </SettingsSection>

        <SettingsSection title="Chat Generation Settings">
          <ChatGenerationSettingsManager onSave={() => {}} />
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
    <Paper withBorder p="xl" radius="md">
      <Title order={2} mb="lg">
        {title}
      </Title>
      {children}
    </Paper>
  </Grid.Col>
);

const PageHeader: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <>
    <Group>
      <ActionIcon onClick={onBack} size="lg" variant="default">
        <RiArrowLeftLine />
      </ActionIcon>
      <Title order={1}>System Settings</Title>
    </Group>
    <Divider my="xl" />
  </>
);

export default SystemSettingsPage;
