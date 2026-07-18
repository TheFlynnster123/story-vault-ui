import { useNavigate } from "react-router-dom";
import { CreateChapterModal } from "./CreateChapterModal";
import { ChapterCreationContext } from "./ChapterCreationContext";
import { useAddChapter } from "./useAddChapter";

export const ChapterCreationProvider: React.FC<
  React.PropsWithChildren<{ chatId: string }>
> = ({ chatId, children }) => {
  const navigate = useNavigate();
  const controller = useAddChapter({ chatId });

  const handleDiscuss = () => {
    controller.handleCloseModal();
    navigate(`/chat/${chatId}/chapter/discuss`);
  };

  return (
    <ChapterCreationContext.Provider value={controller}>
      {children}
      <CreateChapterModal
        opened={controller.showModal}
        view={controller.view}
        title={controller.title}
        summary={controller.summary}
        isGenerating={controller.isGenerating}
        isCreating={controller.isCreating}
        onTitleChange={controller.setTitle}
        onSummaryChange={controller.setSummary}
        onGenerate={controller.handleGenerate}
        onDiscuss={handleDiscuss}
        onManual={controller.handleManual}
        onSubmit={controller.handleSubmit}
        onCancel={controller.handleCloseModal}
        onDiscard={controller.handleDiscard}
      />
    </ChapterCreationContext.Provider>
  );
};
