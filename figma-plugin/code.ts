const PLACEHOLDER_PATTERN = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

function selectedFrames(): FrameNode[] {
  const selection = figma.currentPage.selection;
  if (selection.length !== 2 || selection.some((node) => node.type !== "FRAME")) return [];
  return selection as FrameNode[];
}

function detectPlaceholders(frame: FrameNode): string[] {
  const found = new Set<string>();
  frame.findAll((node) => {
    if (node.type !== "TEXT") return false;
    let match: RegExpExecArray | null;
    while ((match = PLACEHOLDER_PATTERN.exec(node.characters)) !== null) found.add(match[1]);
    PLACEHOLDER_PATTERN.lastIndex = 0;
    return false;
  });
  return [...found].sort();
}

function displayValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (key !== "cost") return String(value);
  if (typeof value === "string") {
    return value.replace(/[,.]\d{2}\s*[^\d\s]+\s*$/, "").trim();
  }
  const integer = Number(value);
  if (!Number.isFinite(integer)) return String(value);
  return Math.trunc(integer).toLocaleString("ru-RU").replace(/[\u00A0\u202F]/g, " ");
}

async function replacePlaceholders(frame: FrameNode, row: Record<string, unknown>): Promise<void> {
  const textNodes = frame.findAll((node) => node.type === "TEXT") as TextNode[];
  for (const node of textNodes) {
    if (!PLACEHOLDER_PATTERN.test(node.characters)) {
      PLACEHOLDER_PATTERN.lastIndex = 0;
      continue;
    }
    PLACEHOLDER_PATTERN.lastIndex = 0;
    if (node.fontName !== figma.mixed) await figma.loadFontAsync(node.fontName);
    const originalText = node.characters;
    const replacements: {
      start: number;
      end: number;
      value: string;
      fills: Paint[];
      fontName: FontName | null;
      textDecoration: TextDecoration | null;
    }[] = [];
    let match: RegExpExecArray | null;
    while ((match = PLACEHOLDER_PATTERN.exec(originalText)) !== null) {
      const value = row[match[1]];
      const rangeFills = node.getRangeFills(match.index, match.index + match[0].length);
      const rangeFontName = node.getRangeFontName(match.index, match.index + match[0].length);
      const rangeTextDecoration = node.getRangeTextDecoration(match.index, match.index + match[0].length);
      replacements.push({
        start: match.index,
        end: match.index + match[0].length,
        value: displayValue(match[1], value),
        fills: rangeFills === figma.mixed ? [] : rangeFills,
        fontName: rangeFontName === figma.mixed ? null : rangeFontName,
        textDecoration: rangeTextDecoration === figma.mixed ? null : rangeTextDecoration,
      });
    }
    PLACEHOLDER_PATTERN.lastIndex = 0;
    for (const replacement of replacements.reverse()) {
      node.deleteCharacters(replacement.start, replacement.end);
      if (replacement.value) node.insertCharacters(replacement.start, replacement.value);
      const end = replacement.start + replacement.value.length;
      if (end > replacement.start) {
        if (replacement.fills.length) node.setRangeFills(replacement.start, end, replacement.fills);
        if (replacement.fontName) node.setRangeFontName(replacement.start, end, replacement.fontName);
        if (replacement.textDecoration) node.setRangeTextDecoration(replacement.start, end, replacement.textDecoration);
      }
    }
  }
}

async function exportRow(row: Record<string, unknown>): Promise<Uint8Array[]> {
  const templates = selectedFrames();
  if (templates.length !== 2) throw new Error("Please select exactly two template Frames.");
  const clones = templates.map((template) => template.clone());
  try {
    const pdfs: Uint8Array[] = [];
    for (const clone of clones) {
      await replacePlaceholders(clone, row);
      pdfs.push(await clone.exportAsync({ format: "PDF" }));
    }
    return pdfs;
  } finally {
    clones.forEach((clone) => clone.remove());
  }
}

figma.showUI(__html__, { width: 420, height: 620 });

figma.ui.onmessage = async (message: { type: string; row?: Record<string, unknown> }) => {
  try {
    const frames = selectedFrames();
    if (frames.length !== 2) throw new Error("Please select exactly two template Frames.");
    if (message.type === "inspect") {
      const placeholders = new Set<string>();
      frames.forEach((frame) => detectPlaceholders(frame).forEach((key) => placeholders.add(key)));
      figma.ui.postMessage({ type: "inspection", placeholders: [...placeholders].sort() });
    } else if (message.type === "export" && message.row) {
      const pdfs = await exportRow(message.row);
      figma.ui.postMessage({ type: "pdf", pdfs: pdfs.map((pdf) => Array.from(pdf)) });
    }
  } catch (error) {
    figma.ui.postMessage({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};