import { describe, expect, it } from "vitest";
import { escapeCsvCell } from "@/lib/downloadCsv";

describe("escapeCsvCell", () => {
  it("neutraliza texto que o Excel interpretaria como fórmula", () => {
    expect(escapeCsvCell('=HYPERLINK("http://evil","x")')).toBe(`"'=HYPERLINK(""http://evil"",""x"")"`);
    expect(escapeCsvCell("+1+1")).toBe("'+1+1");
    expect(escapeCsvCell("-2+3")).toBe("'-2+3");
    expect(escapeCsvCell("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("mantém números como números", () => {
    expect(escapeCsvCell(-5)).toBe("-5");
    expect(escapeCsvCell(42)).toBe("42");
  });

  it("coloca aspas quando há separador, aspas ou quebra de linha", () => {
    expect(escapeCsvCell("a;b")).toBe('"a;b"');
    expect(escapeCsvCell("a,b", ",")).toBe('"a,b"');
    expect(escapeCsvCell("a,b")).toBe("a,b");
    expect(escapeCsvCell("linha\nnova")).toBe('"linha\nnova"');
    expect(escapeCsvCell(null)).toBe("");
  });
});
