import { describe, expect, it } from "vitest";
import { isAllowedImageUrl } from "./images";

describe("isAllowedImageUrl", () => {
  it("aceita https nos hosts permitidos", () => {
    expect(isAllowedImageUrl("https://res.cloudinary.com/demo/image/upload/a.jpg")).toBe(true);
    expect(isAllowedImageUrl("https://images.unsplash.com/photo-1?w=800")).toBe(true);
  });

  it.each([
    "http://res.cloudinary.com/a.jpg",
    "https://evil.com/a.jpg",
    "https://res.cloudinary.com.evil.com/a.jpg",
    "https://user:pass@res.cloudinary.com/a.jpg",
    "javascript:alert(1)",
    "//res.cloudinary.com/a.jpg",
    "não é url",
    "",
  ])("rejeita %j", (u) => {
    expect(isAllowedImageUrl(u)).toBe(false);
  });
});
