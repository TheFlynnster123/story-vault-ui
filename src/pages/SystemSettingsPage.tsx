import React from "react";
import { useNavigate } from "react-router-dom";
import { Title, Grid, Paper, ActionIcon, Group, Divider } from "@mantine/core";
import { RiArrowLeftLine, RiSettings3Line } from "react-icons/ri";
import { GrokKeyManager } from "./SystemSettings/GrokKeyManager";
import { SystemSettingsEditor } from "./SystemSettings/SystemSettingsEditor";
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

        <SettingsSection title="Chat Generation Settings">
          <SystemSettingsEditor onSave={() => {}} />
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
    <Paper p="xl" radius="md">
      <Title order={3} mb="md">
        {title}
      </Title>
      <Divider mb="lg" />
      {children}
    </Paper>
  </Grid.Col>
);

const PageHeader: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <>
    <Group mb="md">
      <ActionIcon onClick={onBack} size="lg" variant="subtle">
        <RiArrowLeftLine />
      </ActionIcon>
      <RiSettings3Line size={28} />
      <Title order={1} fw={400}>
        System Settings
      </Title>
    </Group>
    <Divider my="xl" />
  </>
);

export default SystemSettingsPage;
