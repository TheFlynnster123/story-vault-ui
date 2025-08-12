import React from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { RiArrowLeftLine } from "react-icons/ri";
import { GrokKeyManager } from "../SystemSettings/GrokKeyManager";
import { CivitaiKeyManager } from "../SystemSettings/CivitaiKeyManager";
import { ChatGenerationSettingsManager } from "../SystemSettings/ChatGenerationSettingsManager";
import { ImageGenerationSettingsManager } from "../SystemSettings/ImageGenerationSettingsManager";

const SystemSettingsPage: React.FC = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <PageContainer>
      <Header>
        <BackButton onClick={handleGoBack} aria-label="Go back">
          <RiArrowLeftLine />
        </BackButton>
        <Title>System Settings</Title>
      </Header>

      <ContentGrid>
        <SettingsSection>
          <SectionTitle>Chat Generation Settings</SectionTitle>
          <ChatGenerationSettingsManager onSave={() => {}} />
        </SettingsSection>

        <SettingsSection>
          <SectionTitle>Grok API Configuration</SectionTitle>
          <GrokKeyManager />
        </SettingsSection>

        <SettingsSection>
          <SectionTitle>Civitai API Configuration</SectionTitle>
          <CivitaiKeyManager />
        </SettingsSection>

        <SettingsSection>
          <SectionTitle>Image Generation Settings</SectionTitle>
          <ImageGenerationSettingsManager onSave={() => {}} />
        </SettingsSection>
      </ContentGrid>
    </PageContainer>
  );
};

const PageContainer = styled.div`
  min-height: 100vh;
  background-color: #0f0f0f;
  color: white;
  padding: 20px;
  overflow-y: auto;
  
  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 1px solid #333;
  
  @media (max-width: 768px) {
    margin-bottom: 24px;
    gap: 12px;
  }
`;

const BackButton = styled.button`
  background: none;
  border: none;
  color: #999;
  font-size: 24px;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 40px;

  &:hover {
    color: white;
    background-color: rgba(255, 255, 255, 0.1);
  }

  &:active {
    transform: scale(0.95);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const Title = styled.h1`
  margin: 0;
  font-size: 2rem;
  font-weight: 600;
  color: white;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 32px;
  max-width: 1200px;
  margin: 0 auto;
  padding-bottom: 40px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 24px;
    min-width: 0;
    padding-bottom: 32px;
    max-height: calc(100vh - 100px);
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 20px;
    padding-bottom: 24px;
    max-height: calc(100vh - 80px);
  }
`;

const SettingsSection = styled.div`
  background-color: #1a1a1a;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid #333;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  
  @media (max-width: 768px) {
    padding: 20px;
    border-radius: 8px;
  }
  
  @media (max-width: 480px) {
    padding: 16px;
  }
`;

const SectionTitle = styled.h2`
  margin: 0 0 20px 0;
  color: white;
  font-size: 1.3rem;
  font-weight: 500;
  border-bottom: 1px solid #333;
  padding-bottom: 12px;
  
  @media (max-width: 768px) {
    font-size: 1.2rem;
    margin-bottom: 16px;
    padding-bottom: 8px;
  }
`;

export default SystemSettingsPage;