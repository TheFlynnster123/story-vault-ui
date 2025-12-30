import React from "react";
import { useNavigate } from "react-router-dom";
import { Title, Grid, ActionIcon, Group, Divider } from "@mantine/core";
import { RiArrowLeftLine, RiImageLine } from "react-icons/ri";
import { CivitaiKeyManager } from "../components/ImageSettings/CivitaiKeyManager";
import { ImageModelList } from "../components/ImageSettings/ImageModelList";
import { Page } from "./Page";
import { d } from "../services/Dependencies";

const ImageSettingsPage: React.FC = () => {
  const navigate = useNavigate();

  const handleGoBack = async () => {
    d.ImageModelService().SavePendingChanges();
    navigate(-1);
  };

  return (
    <Page>
      <PageHeader onBack={handleGoBack} />
      <Grid>
        <CivitaiKeyManager />

        <ImageModelList />
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
      <RiImageLine size={28} />
      <Title order={1} fw={400}>
        Image Settings
      </Title>
    </Group>
    <Divider my="xl" />
  </>
);

export default ImageSettingsPage;
