# zooomin — Semantic Zoom Text Reader

## Vision

zooomin is a reading tool that lets you zoom in and out of text at a semantic level. Any nonfiction document — no matter how long — opens as a single screen of high-level summaries. Click to expand any section deeper. Click again to go deeper still. Collapse back out when you've seen enough.

Think of it like a map: you start zoomed out seeing continents, and drill down to streets only where you need detail. Except instead of geography, it's ideas.

The core insight is that most long texts contain a small amount of information you need in full detail, surrounded by large amounts you only need in summary. zooomin lets you make that choice fluidly, section by section, instead of forcing a linear read.

---

## Core Concepts

### ZoomDoc Format

The universal document format. A JSON tree where each node carries its text at multiple resolution levels.

```json
{
  "meta": {
    "title": "Book Title",
    "author": "Author Name",
    "version": "1.0",
    "zoomdoc_version": "0.1",
    "created": "2026-03-13T00:00:00Z",
    "source_format": "markdown",
    "description": "Optional short description"
  },
  "root": {
    "id": "root",
    "title": "Book Title",
    "levels": {
      "0": "A single sentence capturing the entire book.",
      "1": "A paragraph-length summary of the book.",
      "2": "A page-length overview of the book."
    },
    "children": [
      {
        "id": "ch1",
        "title": "Chapter 1: Introduction",
        "levels": {
          "0": "Single sentence summary of the chapter.",
          "1": "Paragraph summary of the chapter.",
          "2": "Page-length summary of the chapter.",
          "3": "The full original text of the chapter."
        },
        "children": [
          {
            "id": "ch1-s1",
            "title": "Section 1.1",
            "levels": {
              "0": "Single sentence summary.",
              "1": "Paragraph summary.",
              "2": "Full original text of this section."
            },
            "children": []
          }
        ]
      }
    ]
  }
}
```

**Key design decisions:**

- Level 0 is always a single sentence. The highest level is always the full original text. Intermediate levels are determined by source text length.
- Guideline for number of levels: roughly one level per order-of-magnitude reduction in length. A 10,000-word chapter might have 4 levels (sentence → paragraph → page → full). A 500-word section might have 2 levels (sentence → full).
- Each level should be a coherent, standalone piece of text — not a truncation, but a genuine summary at that granularity.
- Authors can supply any or all levels. The ingestion pipeline fills in what's missing via LLM.
- The `children` array defines the document's hierarchical structure.
- Leaf nodes have no children and represent the smallest meaningful text units (sections, subsections).

### Zoom Levels — What Each Feels Like

| Level | Name | Roughly | Purpose |
|-------|------|---------|---------|
| 0 | Headline | 1 sentence | Scanning / orientation |
| 1 | Summary | 1 paragraph | Deciding whether to go deeper |
| 2 | Overview | ~1 page | Getting the gist with key details |
| 3 | Detail | ~3-5 pages | Solid understanding |
| N (max) | Full | Original text | Complete reading |

Not every node will have all levels. A short section may only have levels 0 and 1 (sentence and full text).

### The Tree & How Zoom Interacts With It

The document is a tree. The reader view is a flattened projection of that tree at varying depths and zoom levels.

**Default view:** All top-level children of root, each shown at level 0 (single sentence). The root node's level 0 serves as a document subtitle/thesis.

**Expanding a node:** When you click a node at level 0, it expands to level 1. Click again → level 2. And so on until max level (full text).

**Expanding children:** When a node reaches its max level AND has children, the next click replaces the node's full text with its children, each shown at level 0. This is the "zoom in" moment — you go from seeing a chapter's full text to seeing its sections as individual summarized items.

**Collapsing:** Click the section header (or a dedicated collapse control) to step back one level. A modifier+click collapses all the way to level 0.

---

## MVP — The Reader (v0.1)

### What It Is

A React web app (single page) that loads a ZoomDoc JSON file and presents a beautiful, fluid semantic zoom reading experience. No backend required. Works offline once loaded.

### Tech Stack

- **React** (with hooks, functional components)
- **TypeScript**
- CSS modules or Tailwind — whichever leads to cleaner implementation
- No server required — static site, can be hosted anywhere
- Vite for build tooling

### Features

#### Document Loading
- Load a ZoomDoc JSON via file picker (drag-and-drop or button)
- URL parameter to load a ZoomDoc from a URL (`?doc=https://...`)
- Ship with 1-2 built-in sample documents for first-run experience

#### The Reading View
- Default view: document title + root level 0 summary + all top-level children at level 0
- Each node is rendered as a card/block with:
  - A subtle section title/header
  - The text content at the current zoom level
  - A visual depth indicator (see below)
- Generous margins, comfortable max-width (prose measure ~65-75ch)
- Beautiful typography: system font stack or a clean serif (e.g., `Georgia`, `Charter`, or load `Source Serif Pro` / `Literata`)
- Dark mode support from day one

#### Expand/Collapse Interaction
- **Click** a node's text area → expand to next zoom level
- When a node is at max level and has children → next click expands to show children at level 0
- **Click section header** → collapse one level
- **Shift+click section header** → collapse all the way to level 0
- **Keyboard:** Arrow keys or `j`/`k` to navigate between siblings, `l` or `Enter` to expand, `h` or `Backspace` to collapse (vim-style navigation as secondary, primary is mouse/touch)
- Smooth animated transitions: expanding text should ease in, collapsing should ease out. Content below should smoothly reflow. No jarring jumps.

#### Visual Depth Indicator
- A thin vertical bar on the left edge of each node, with color/opacity indicating depth
- Level 0: barely visible or absent
- Each deeper level: progressively more prominent (deeper color or wider bar)
- This gives instant peripheral awareness of which sections you've drilled into
- Consider also a subtle background tint shift (very slight warmth as you go deeper)

#### Breadcrumb / Context Bar
- Sticky header that shows your position in the document tree
- Example: "Book Title > Chapter 3 > Section 3.2"
- Clicking any breadcrumb level collapses back to that point

#### Progress & Orientation
- A minimap or progress indicator showing which parts of the document you've expanded
- Could be a thin vertical bar on the right edge showing the full document structure with expanded sections highlighted
- Total estimated reading time at current expansion level

#### Responsive Design
- Desktop: full layout with minimap
- Tablet: slightly reduced margins, minimap becomes optional toggle
- Mobile: single column, tap to expand, swipe to collapse, no minimap

### Sample Document

The MVP should ship with at least one high-quality sample ZoomDoc to demonstrate the concept. Ideally, this would be:

- A 3,000-5,000 word nonfiction essay or article (public domain or original)
- Chunked into ~3-5 top-level sections, each with 2-3 subsections
- Hand-crafted zoom levels (3-4 levels per section) to showcase ideal quality
- Topic should be inherently interesting and benefit from the zoom mechanic (something information-dense)

---

## MVP — Ingestion Pipeline (v0.2)

### What It Is

A CLI tool that takes a source text file and produces a ZoomDoc JSON. This is where LLM integration happens. The reader and ingestion pipeline are completely decoupled — the reader never calls an LLM.

### Tech Stack

- **Node.js** (TypeScript) — to share types with the reader
- Alternative: Python, if easier for LLM library support. Decision can be deferred.

### Supported Input Formats (MVP)

- Markdown (`.md`) — primary format
- Plain text (`.txt`)

### LLM Backend Support

The tool should support multiple LLM backends via a provider flag:

```bash
zooomin ingest --input book.md --provider anthropic --model claude-sonnet-4-20250514
zooomin ingest --input book.md --provider openai --model gpt-4o
zooomin ingest --input book.md --provider ollama --model llama3
```

**Provider configuration:**
- Anthropic: uses `ANTHROPIC_API_KEY` env var
- OpenAI: uses `OPENAI_API_KEY` env var
- Ollama: uses local endpoint, defaults to `http://localhost:11434`
- A config file (`.zooomin.json` or similar) for defaults

### Ingestion Process

1. **Parse** the source document into a hierarchical tree based on heading structure (H1 → H2 → H3, etc.). For plain text without headings, use paragraph clustering or a fixed chunk size.

2. **Determine zoom levels** for each node based on text length:
   - < 200 words: 2 levels (sentence + full)
   - 200-1,000 words: 3 levels (sentence + paragraph + full)
   - 1,000-5,000 words: 4 levels
   - 5,000+ words: 5 levels

3. **Generate summaries** by calling the LLM for each node at each missing level, working bottom-up (summarize leaves first, then use leaf summaries to inform parent summaries). This bottom-up approach ensures consistency.

4. **Author overrides:** If the source markdown includes special syntax for author-specified zoom levels, use those instead of LLM-generated ones. Proposed syntax:

   ```markdown
   ## Chapter 1: The Problem

   <!-- zoom:0 A single sentence about the problem. -->
   <!-- zoom:1 A paragraph about the problem that gives more context
   and covers the key points the chapter addresses. -->

   The full text of the chapter goes here...
   ```

5. **Output** the ZoomDoc JSON, optionally pretty-printed.

### Prompt Design for Summary Generation

The LLM prompts should emphasize:
- Each level must be a **coherent standalone text**, not a truncation
- Summaries should preserve the author's voice and key terminology
- Level 0 should be a genuinely informative single sentence, not a vague teaser
- Each level should add meaningfully new information over the previous level
- No "In this chapter, the author discusses..." meta-framing — just state the content directly

---

## Future Features (Post-MVP)

### Reader Enhancements

#### Search with Zoom Awareness
- Full-text search across all zoom levels
- Results show which section + zoom level the match is in
- Clicking a result navigates there and expands to the matching level
- "Search at this level" — only search within currently visible text

#### Annotations & Highlights
- Highlight text at any zoom level
- Annotations persist across zoom levels (attached to the most specific node)
- Export annotations as a standalone summary

#### Multiple Documents / Library
- Library view showing all loaded ZoomDocs
- Each document shown as a card with its level 0 summary
- Tag/categorize documents
- LocalStorage or IndexedDB for persistence

#### Reading History
- Track which sections you've expanded and how deep
- "Resume reading" that restores your exact expansion state
- Heatmap view: which sections have you read at full depth?

#### Collaborative Zoom Levels
- Share your expansion state with someone else ("here's how I read this")
- Compare two people's reading paths through the same document

#### "Expand All to Level N"
- Global controls: "Show me everything at paragraph level" across the whole document
- Useful for getting an overview before drilling into specifics

#### Side-by-Side View
- Show two zoom levels of the same section simultaneously
- Useful for checking that a summary accurately represents the full text

### Ingestion Enhancements

#### Additional Input Formats
- EPUB
- PDF (with OCR fallback)
- HTML / web pages (via URL)
- Google Docs (via API)

#### Batch Processing
- Ingest an entire folder of documents
- Progress reporting for large jobs

#### Hybrid Author + LLM Workflow
- Author specifies zoom levels for key sections
- LLM fills in the rest
- Author reviews and edits LLM-generated levels
- Track which levels are author-specified vs LLM-generated in the ZoomDoc metadata

#### Streaming / Incremental Ingestion
- For very large documents, generate zoom levels incrementally
- Show a progress bar: "Processing chapter 3 of 12..."
- Allow reading already-processed chapters while later ones are still being ingested

### Author Tool (v1.0+)

A dedicated UI for authors to create and edit ZoomDoc files:

- WYSIWYG editor for each zoom level
- Side-by-side preview of all levels for a given section
- "Generate suggestion" button that calls an LLM to draft a zoom level
- Drag-and-drop to reorganize the document tree
- Export to ZoomDoc JSON
- Import from markdown/plain text as a starting point

### Platform & Distribution

#### Browser Extension
- Right-click any article on the web → "Open in zooomin"
- Sends the page content through the ingestion pipeline and opens the reader

#### Desktop App (Electron or Tauri)
- Offline-first
- File system integration (watch a folder for new documents)
- System tray for quick access

#### API / Service
- Hosted ingestion endpoint: POST text, GET back ZoomDoc
- Could be a paid service for people who don't want to run their own LLM

---

## Design Principles

1. **Reading first.** The reader should feel like a beautiful book, not a tech demo. Typography, spacing, and animation quality matter more than feature count.

2. **Progressive disclosure is the whole point.** The app practices what it preaches — the UI itself should reveal complexity gradually, not overwhelm.

3. **Format independence.** The ZoomDoc JSON format is the contract. Reader and ingestion pipeline never know about each other. Any tool that outputs valid ZoomDoc can participate.

4. **LLM agnosticism.** Users bring their own LLM. The tool works with Anthropic, OpenAI, Ollama, or anything that speaks a compatible API. The reading experience is identical regardless of which LLM generated the zoom levels.

5. **Respect the author's voice.** LLM-generated summaries should sound like the author, not like a chatbot. Author-specified zoom levels always take precedence.

6. **Offline by default.** Once a ZoomDoc is loaded, the reader requires zero network access. LLMs are only involved during ingestion.

---

## Open Questions

- **Zoom level interpolation:** Should we ever show a "blend" between two discrete levels, or is hard switching always better? Current decision: hard switching with smooth animation. Revisit if it feels abrupt.

- **Cross-references:** Nonfiction often references earlier sections. Should zooming into a passage that references Chapter 2 offer a quick-peek at Chapter 2's summary? Powerful but complex.

- **Tables, figures, code blocks:** How do these behave at different zoom levels? One approach: they only appear at the deepest level(s) and are replaced by text descriptions at higher levels. Another: they're always visible but with varying detail (a chart becomes "Figure 3 shows a rising trend" at level 0).

- **Naming the zoom levels:** Should we use numbers (0, 1, 2, 3) or named levels (headline, summary, overview, detail, full)? Named levels are friendlier but less flexible for documents with varying depth. Could support both as aliases.

- **Maximum document size in the reader:** A ZoomDoc for a full 300-page book might be 5-10MB of JSON. Is this an issue for browser performance? Likely not with lazy rendering, but should be tested.

- **What "click to expand" actually means on mobile:** Tap is click, but then how do you select text? Long-press to select? Or have an explicit expand button vs. the text being selectable? Needs UX prototyping.

---

## Branding Notes

- **Name:** zooomin (three o's, all lowercase)
- **Sibling product:** glooow (meditation app) — triple-letter personal brand emerging
- **Tone:** calm, focused, intelligent. Not playful/startup-y, not corporate. Think: "a thoughtful tool for curious readers."
- **Color direction:** Consider a muted, warm palette. Reading apps benefit from low-contrast, easy-on-the-eyes aesthetics. The depth indicator colors could be the primary brand expression.
