import React from "react";
import { useNavigate } from "react-router-dom";
import { Title, Grid, Paper, ActionIcon, Group, Divider } from "@mantine/core";
import { RiArrowLeftLine } from "react-icons/ri";
import { CivitaiKeyManager } from "../components/ImageSettings/CivitaiKeyManager";
import { ImageModelList } from "../components/ImageSettings/ImageModelList";
import { Page } from "./Page";

const ImageSettingsPage: React.FC = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <Page>
      <PageHeader onBack={handleGoBack} />
      <Grid>
        <CivitaiKeyManager />

        <Grid.Col span={12}>
          <Paper withBorder p="xl" radius="md">
            <ImageModelList onSave={() => {}} />
          </Paper>
        </Grid.Col>
      </Grid>
    </Page>
  );
};

const PageHeader: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <>
    <Group>
      <ActionIcon onClick={onBack} size="lg" variant="gradient">
        <RiArrowLeftLine />
      </ActionIcon>
      <Title order={1}>Image Settings</Title>
    </Group>
    <Divider my="xl" />
  </>
);

export default ImageSettingsPage;
