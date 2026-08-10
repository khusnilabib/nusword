/**
 * NUSWORD DOCX Export (PRD §16 — Render & Export).
 *
 * Converts the Tiptap/ProseMirror JSON document to a Microsoft Word .docx file
 * using the `docx` npm package. Preserves semantic structure (headings,
 * paragraphs, lists, tables, images) as far as possible.
 *
 * DOCX is a semantic interchange/export format — Word handles its own
 * pagination, so we export the full document content without page breaks
 * (except explicit ones).
 */
import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ImageRun,
  PageBreak,
  BorderStyle,
} from "docx";
import type { JSONContent, PageSettings } from "@/types/document";
import type { ExportPreset } from "./presets";

interface DocxExportArgs {
  title: string;
  content: JSONContent;
  settings: PageSettings;
  preset: ExportPreset;
}

/** Generate a DOCX Buffer from the Tiptap document. */
export async function generateDocx({
  title,
  content,
  settings,
}: DocxExportArgs): Promise<Buffer> {
  const blocks = content.content || [];
  const children: (Paragraph | Table)[] = [];

  for (const block of blocks) {
    const elements = convertBlock(block, settings);
    children.push(...elements);
  }

  const doc = new DocxDocument({
    title,
    creator: "NUSWORD",
    description: "Exported from NUSWORD",
    sections: [
      {
        properties: {
          page: {
            size: {
              width: mmToTwips(getWidthMm(settings)),
              height: mmToTwips(getHeightMm(settings)),
              orientation:
                settings.orientation === "landscape"
                  ? "landscape"
                  : "portrait",
            },
            margin: {
              top: mmToTwips(settings.marginTopMm),
              bottom: mmToTwips(settings.marginBottomMm),
              left: mmToTwips(settings.marginLeftMm),
              right: mmToTwips(settings.marginRightMm),
            },
          },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer as Buffer;
}

/* ---------------------------------------------------------------- */

function convertBlock(
  block: JSONContent,
  settings: PageSettings,
): (Paragraph | Table)[] {
  switch (block.type) {
    case "heading": {
      const level = (block.attrs?.level as number) ?? 2;
      const headingLevel =
        level === 1
          ? HeadingLevel.HEADING_1
          : level === 2
            ? HeadingLevel.HEADING_2
            : HeadingLevel.HEADING_3;
      const runs = convertInline(block);
      return [
        new Paragraph({
          heading: headingLevel,
          alignment: getAlignment(block.attrs?.textAlign),
          children: runs,
        }),
      ];
    }
    case "paragraph": {
      const runs = convertInline(block);
      if (runs.length === 0) {
        return [new Paragraph({ children: [] })];
      }
      return [
        new Paragraph({
          alignment: getAlignment(block.attrs?.textAlign),
          children: runs,
        }),
      ];
    }
    case "bulletList": {
      const items = block.content || [];
      return items.map(
        (item) =>
          new Paragraph({
            bullet: { level: 0 },
            children: convertInline(item),
          }),
      );
    }
    case "orderedList": {
      const items = block.content || [];
      return items.map(
        (item, idx) =>
          new Paragraph({
            numbering: { reference: "default-numbering", level: 0 },
            children: convertInline(item),
          }),
      );
    }
    case "blockquote": {
      return [
        new Paragraph({
          indent: { left: 720 },
          border: {
            left: {
              style: BorderStyle.SINGLE,
              size: 6,
              color: "C1C8C7",
              space: 10,
            },
          },
          children: convertInline(block),
        }),
      ];
    }
    case "codeBlock": {
      const text = extractText(block);
      return [
        new Paragraph({
          shading: { fill: "EAEDFF" },
          children: [
            new TextRun({
              text,
              font: "JetBrains Mono",
              size: 20,
            }),
          ],
        }),
      ];
    }
    case "horizontalRule": {
      return [
        new Paragraph({
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "C1C8C7" },
          },
          children: [],
        }),
      ];
    }
    case "pageBreak": {
      return [
        new Paragraph({
          children: [new PageBreak()],
        }),
      ];
    }
    case "image": {
      const src = block.attrs?.src as string;
      if (src && src.startsWith("data:image/")) {
        try {
          const base64Data = src.split(",")[1];
          const imgBuffer = Buffer.from(base64Data, "base64");
          const width = (block.attrs?.width as number) || 400;
          const height = (block.attrs?.height as number) || 300;
          return [
            new Paragraph({
              children: [
                new ImageRun({
                  data: imgBuffer,
                  transformation: { width, height },
                  type: "png",
                }),
              ],
            }),
          ];
        } catch {
          return [];
        }
      }
      return [];
    }
    case "table": {
      return [convertTable(block)];
    }
    default:
      return [];
  }
}

function convertTable(table: JSONContent): Table {
  const rows = table.content || [];
  const tableRows = rows.map((row) => {
    const cells = row.content || [];
    const isHeader = row.attrs?.isHeader as boolean;
    const tableCells = cells.map((cell) => {
      const cellText = extractText(cell);
      return new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: cellText,
                bold: isHeader,
                font: isHeader ? "Hanken Grotesk" : undefined,
              }),
            ],
          }),
        ],
        width: { size: Math.floor(100 / cells.length), type: WidthType.PERCENTAGE },
      });
    });
    return new TableRow({ children: tableCells, tableHeader: isHeader });
  });
  return new Table({ rows: tableRows });
}

function convertInline(node: JSONContent): TextRun[] {
  const runs: TextRun[] = [];
  if (node.text) {
    const marks = node.marks || [];
    const isBold = marks.some((m) => m.type === "bold");
    const isItalic = marks.some((m) => m.type === "italic");
    const isUnderline = marks.some((m) => m.type === "underline");
    const isStrike = marks.some((m) => m.type === "strike");
    const isCode = marks.some((m) => m.type === "code");
    const linkMark = marks.find((m) => m.type === "link");
    runs.push(
      new TextRun({
        text: node.text,
        bold: isBold,
        italics: isItalic,
        underline: isUnderline ? {} : undefined,
        strike: isStrike,
        font: isCode ? "JetBrains Mono" : undefined,
        color: isCode ? "131B2E" : undefined,
        shading: isCode ? { fill: "EAEDFF" } : undefined,
        style: linkMark ? "Hyperlink" : undefined,
      }),
    );
  }
  if (node.content) {
    for (const child of node.content) {
      runs.push(...convertInline(child));
    }
  }
  return runs;
}

function getAlignment(textAlign: unknown): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
  switch (textAlign) {
    case "left":
      return AlignmentType.LEFT;
    case "center":
      return AlignmentType.CENTER;
    case "right":
      return AlignmentType.RIGHT;
    case "justify":
      return AlignmentType.JUSTIFIED;
    default:
      return undefined;
  }
}

function extractText(node: JSONContent): string {
  if (node.text) return node.text;
  if (node.content) return node.content.map(extractText).join("");
  return "";
}

function mmToTwips(mm: number): number {
  return Math.round(mm * 56.692913386); // 1mm = 56.69 twips
}

function getWidthMm(settings: PageSettings): number {
  const w =
    settings.pageSize === "Custom"
      ? (settings.customWidthMm ?? 210)
      : getPaperDims(settings.pageSize)?.widthMm ?? 210;
  return settings.orientation === "landscape" ? getHeightMm(settings) : w;
}

function getHeightMm(settings: PageSettings): number {
  const h =
    settings.pageSize === "Custom"
      ? (settings.customHeightMm ?? 297)
      : getPaperDims(settings.pageSize)?.heightMm ?? 297;
  return settings.orientation === "landscape" ? getWidthMm(settings) : h;
}

function getPaperDims(key: string): { widthMm: number; heightMm: number } | undefined {
  const map: Record<string, { widthMm: number; heightMm: number }> = {
    A4: { widthMm: 210, heightMm: 297 },
    A5: { widthMm: 148, heightMm: 210 },
    B5: { widthMm: 176, heightMm: 250 },
    Letter: { widthMm: 216, heightMm: 279 },
    Legal: { widthMm: 216, heightMm: 356 },
    F4: { widthMm: 210, heightMm: 330 },
  };
  return map[key];
}
