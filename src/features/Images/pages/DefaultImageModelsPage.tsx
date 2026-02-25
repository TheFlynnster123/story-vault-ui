import React from "react";
import { useNavigate } from "react-router-dom";
import { Title, Grid, ActionIcon, Group, Divider } from "@mantine/core";
import { RiArrowLeftLine, RiImageLine } from "react-icons/ri";
import { ImageModelList } from "../components/ImageModelListDefault";
import { Page } from "../../../pages/Page";
import { d } from "../../../services/Dependencies";

const DefaultImageModelsPage: React.FC = () => {
  const navigate = useNavigate();

  const handleGoBack = async () => {
    d.ImageModelService().SavePendingChanges();
    navigate(-1);
  };

  return (
    <Page>
      <PageHeader onBack={handleGoBack} />
      <Grid>
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
        Default Image Models
      </Title>
    </Group>
    <Divider my="xl" />
  </>
);

export default DefaultImageModelsPage;
