import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "../../../../../testing";
import userEvent from "@testing-library/user-event";
import { CompressSection } from "./CompressSection";

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

// Mock hooks to avoid real service dependencies
const mockUseAddChapter = vi.fn();
vi.mock("../ChatControls/useAddChapter", () => ({
  useAddChapter: (...args: unknown[]) => mockUseAddChapter(...args),
}));

const mockUseAddBook = vi.fn();
vi.mock("../ChatControls/useAddBook", () => ({
  useAddBook: (...args: unknown[]) => mockUseAddBook(...args),
}));

const CHAT_ID = "test-chat-123";

const defaultChapterHook = {
  showModal: false,
  title: "",
  summary: "",
  isGeneratingTitle: false,
  isCreating: false,
  setTitle: vi.fn(),
  setSummary: vi.fn(),
  handleOpenModal: vi.fn(),
  handleCloseModal: vi.fn(),
  handleGenerateTitle: vi.fn(),
  handleSubmit: vi.fn(),
  handleGenerate: vi.fn(),
};

const defaultBookHook = {
  showModal: false,
  title: "",
  summary: "",
  chapters: [],
  selectedChapterIds: [],
  startChapterId: null,
  endChapterId: null,
  isGenerating: false,
  setTitle: vi.fn(),
  setSummary: vi.fn(),
  handleOpenModal: vi.fn(),
  handleCloseModal: vi.fn(),
  handleChapterClick: vi.fn(),
  handleClearSelection: vi.fn(),
  handleGenerateSummary: vi.fn(),
  handleSubmit: vi.fn(),
};

describe("CompressSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAddChapter.mockReturnValue(defaultChapterHook);
    mockUseAddBook.mockReturnValue(defaultBookHook);
  });

  const renderSection = () => render(<CompressSection chatId={CHAT_ID} />);

  it("should render the Compress button", () => {
    renderSection();

    expect(screen.getByText("Compress")).toBeInTheDocument();
  });

  it("should open the picker modal when Compress is clicked", async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByText("Compress"));

    await waitFor(() => {
      expect(screen.getByText("Compress to Chapter")).toBeInTheDocument();
      expect(screen.getByText("Compress to Book")).toBeInTheDocument();
    });
  });

  it("should open the chapter modal when Compress to Chapter is selected", async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByText("Compress"));
    await waitFor(() =>
      expect(screen.getByText("Compress to Chapter")).toBeInTheDocument(),
    );
    await user.click(screen.getByText("Compress to Chapter"));

    expect(defaultChapterHook.handleOpenModal).toHaveBeenCalled();
  });

  it("should open the book modal when Compress to Book is selected", async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByText("Compress"));
    await waitFor(() =>
      expect(screen.getByText("Compress to Book")).toBeInTheDocument(),
    );
    await user.click(screen.getByText("Compress to Book"));

    expect(defaultBookHook.handleOpenModal).toHaveBeenCalled();
  });

  it("should close the picker modal after selecting an option", async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByText("Compress"));
    await waitFor(() =>
      expect(screen.getByText("Compress to Chapter")).toBeInTheDocument(),
    );
    await user.click(screen.getByText("Compress to Chapter"));

    await waitFor(() => {
      expect(
        screen.queryByText(/reduces the context window/i),
      ).not.toBeInTheDocument();
    });
  });
});
