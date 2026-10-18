import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomepageTestimonialsSection } from "../components/homepage-testimonials-section";

const section = {
  eyebrow: "Kind Words",
  heading: "Memories That Speak for Themselves",
  description: "The moments we create are best described by the people who experience them.",
  isVisible: true,
  testimonials: [
    { id: "one", name: "Alicia", text: "Every detail felt beautifully considered from the first conversation to the final farewell.", eventType: "Wedding", eventDate: "May 2025", rating: 5, label: "Bride", imageRef: "/images/gathering-study.svg" },
    { id: "two", name: "Daniel", text: "The team made our brand event feel seamless, warm and completely on message.", eventType: "Corporate Event", eventDate: "April 2025", rating: 4, label: "Client", imageRef: null },
  ],
};

describe("HomepageTestimonialsSection", () => {
  it("renders the testimonial section and cycles through slides with the controls", () => {
    render(<HomepageTestimonialsSection section={section} />);

    expect(screen.getByText("Kind Words")).toBeTruthy();
    expect(screen.getByText("Alicia")).toBeTruthy();
    expect(screen.getByLabelText("Previous testimonial")).toBeTruthy();
    expect(screen.getByLabelText("Next testimonial")).toBeTruthy();

    fireEvent.click(screen.getByLabelText("Next testimonial"));
    expect(screen.getByLabelText("Show testimonial 2").getAttribute("aria-current")).toBe("true");
    expect(screen.getByText("Daniel")).toBeTruthy();
  });

  it("does not render when the section is hidden", () => {
    const { container } = render(<HomepageTestimonialsSection section={{ ...section, isVisible: false }} />);
    expect(container.firstChild).toBeNull();
  });
});
