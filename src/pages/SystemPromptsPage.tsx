import React from "react";
import { useNavigate } from "react-router-dom";
import { Title, Grid, Paper, ActionIcon, Group, Divider } from "@mantine/core";
import { RiArrowLeftLine } from "react-icons/ri";
import { LuMegaphone } from "react-icons/lu";
import { SystemPromptsEditor } from "../components/SystemPrompts/SystemPromptsEditor";
import { Page } from "./Page";
import { d } from "../services/Dependencies";
import { Theme } from "../components/Common/Theme";

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
        <Grid.Col span={12}>
          <Paper p="md" radius="md">
            <SystemPromptsEditor />
          </Paper>
        </Grid.Col>
      </Grid>
    </Page>
  );
};

const PageHeader: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <>
    <Group mb="md">
      <ActionIcon onClick={onBack} size="lg" variant="subtle">
        <RiArrowLeftLine />
      </ActionIcon>
      <LuMegaphone size={28} color={Theme.systemPrompts.primary} />
      <Title order={1} fw={400} c={Theme.systemPrompts.primary}>
        System Prompts
      </Title>
    </Group>
    <Divider mb="md" mt="xl" />
  </>
);

export default SystemPromptsPage;
