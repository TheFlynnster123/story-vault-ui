import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "../../test-utils";
import { SchedulerCombobox } from "./SchedulerCombobox";

// Mock dependencies
const mockGetAvailableSchedulers = vi.fn();
const mockMapToDisplayName = vi.fn();

vi.mock("../../app/Dependencies/Dependencies", () => ({
  d: {
    SchedulerMapper: vi.fn(() => ({
      GetAvailableSchedulers: mockGetAvailableSchedulers,
      MapToDisplayName: mockMapToDisplayName,
    })),
  },
}));

describe("SchedulerCombobox", () => {
  const mockOnChange = vi.fn();
  const defaultProps = {
    label: "Scheduler",
    value: "",
    onChange: mockOnChange,
    placeholder: "Select scheduler",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetAvailableSchedulers.mockReturnValue([
      { label: "Euler a", value: "Euler a" },
      { label: "DPM++ 2M", value: "DPM++ 2M" },
      { label: "DPM++ SDE", value: "DPM++ SDE" },
    ]);

    mockMapToDisplayName.mockImplementation((scheduler: string) => {
      const mapping: Record<string, string> = {
        euler_a: "Euler a",
        dpmpp_2m: "DPM++ 2M",
        dpmpp_sde: "DPM++ SDE",
      };
      return mapping[scheduler] || scheduler;
    });
  });

  it("should render with correct label", () => {
    render(<SchedulerCombobox {...defaultProps} />);
    expect(screen.getByText("Scheduler")).toBeInTheDocument();
  });

  it("should display the mapped display name as value", () => {
    render(<SchedulerCombobox {...defaultProps} value="dpmpp_2m" />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("DPM++ 2M");
  });

  it("should show dropdown options when clicked", async () => {
    render(<SchedulerCombobox {...defaultProps} />);

    const input = screen.getByRole("textbox");
    fireEvent.click(input);

    await waitFor(() => {
      expect(screen.getByText("Euler a")).toBeInTheDocument();
      expect(screen.getByText("DPM++ 2M")).toBeInTheDocument();
      expect(screen.getByText("DPM++ SDE")).toBeInTheDocument();
    });
  });

  it("should call onChange when option is selected", async () => {
    render(<SchedulerCombobox {...defaultProps} />);

    const input = screen.getByRole("textbox");
    fireEvent.click(input);

    await waitFor(() => {
      expect(screen.getByText("DPM++ 2M")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("DPM++ 2M"));

    expect(mockOnChange).toHaveBeenCalledWith("DPM++ 2M");
  });

  it("should call onChange when typing in input", async () => {
    render(<SchedulerCombobox {...defaultProps} />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "custom_scheduler" } });

    expect(mockOnChange).toHaveBeenCalledWith("custom_scheduler");
  });

  it("should show placeholder when no value", () => {
    render(<SchedulerCombobox {...defaultProps} />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("placeholder", "Select or enter a scheduler");
  });

  it("should handle scheduler name to display name mapping", () => {
    render(<SchedulerCombobox {...defaultProps} value="euler_a" />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("Euler a");
    expect(mockMapToDisplayName).toHaveBeenCalledWith("euler_a");
  });

  it("should preserve unknown scheduler values", () => {
    mockMapToDisplayName.mockReturnValue("unknown_scheduler");

    render(<SchedulerCombobox {...defaultProps} value="unknown_scheduler" />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("unknown_scheduler");
  });

  it("should get available schedulers on render", () => {
    render(<SchedulerCombobox {...defaultProps} />);

    expect(mockGetAvailableSchedulers).toHaveBeenCalled();
  });

  it("should handle empty value correctly", () => {
    render(<SchedulerCombobox {...defaultProps} value="" />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("");
    expect(mockMapToDisplayName).toHaveBeenCalledWith("");
  });
});
