import React from "react";
import { useNavigate } from "react-router-dom";
import { Title, Grid, Paper, ActionIcon, Group, Divider } from "@mantine/core";
import { RiArrowLeftLine } from "react-icons/ri";
import { LuFileText } from "react-icons/lu";
import { SystemPromptsEditor } from "../components/SystemPrompts/SystemPromptsEditor";
import { Page } from "./Page";
import { d } from "../services/Dependencies";

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

const SystemPromptsPage: React.FC = () => {
  const navigate = useNavigate();

  const handleGoBack = async () => {
    await d.SystemPromptsService().SavePendingChanges();
    navigate(-1);
  };

  return (
    <Page>
      <PageHeader onBack={handleGoBack} />
      <Grid>
        <SettingsSection title="Story Generation Prompts">
          <SystemPromptsEditor />
        </SettingsSection>
      </Grid>
    </Page>
  );
};

const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  children,
}) => (
  <Grid.Col span={{ base: 12, md: 8 }}>
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
      <LuFileText size={28} />
      <Title order={1} fw={400}>
        System Prompts
      </Title>
    </Group>
    <Divider my="xl" />
  </>
);

export default SystemPromptsPage;
