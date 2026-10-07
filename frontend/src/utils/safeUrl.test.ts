import { describe, expect, it } from "vitest";
import { safeHttpUrl } from "./safeUrl";

describe("safeHttpUrl", () => {
  it("keeps http(s) links and refuses anything that could run script", () => {
    expect(safeHttpUrl("https://communityhub.example/post/4721")).toBe("https://communityhub.example/post/4721");
    expect(safeHttpUrl("http://example.com/a")).toBe("http://example.com/a");
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl(" JavaScript:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,<script>1</script>")).toBeNull();
    expect(safeHttpUrl("not a url")).toBeNull();
    expect(safeHttpUrl(null)).toBeNull();
  });
});
