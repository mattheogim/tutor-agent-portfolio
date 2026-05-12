/**
 * Markdown frontmatter parser.
 *
 * Parses YAML-like frontmatter from SKILL.md and agent .md files.
 * Handles our specific subset: strings, arrays, nested objects (permissions).
 */

export interface ParsedMarkdown {
  frontmatter: Record<string, unknown>;
  body: string;
}

/**
 * Extract frontmatter and body from a markdown file with --- delimiters.
 */
export function parseMarkdown(content: string): ParsedMarkdown {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }
  return {
    frontmatter: parseYamlLike(match[1]),
    body: match[2],
  };
}

/**
 * Simple YAML-like parser for our frontmatter subset.
 * Handles: key: value, key: "value", arrays (- item), nested objects (2-space indent).
 */
function parseYamlLike(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.split("\n");

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (!line.trim()) { i++; continue; }

    // Top-level key
    const topMatch = line.match(/^(\w[\w-]*):\s*(.*)/);
    if (!topMatch) { i++; continue; }

    const key = topMatch[1];
    const inlineValue = topMatch[2].trim();

    // Check what follows
    if (inlineValue && !inlineValue.startsWith("#")) {
      // Inline value
      result[key] = unquote(inlineValue);
      i++;
    } else {
      // Check next lines for array items or nested object
      i++;
      const children = collectIndented(lines, i);

      if (children.lines.length === 0) {
        result[key] = inlineValue ? unquote(inlineValue) : null;
      } else if (children.lines[0].trimStart().startsWith("- ")) {
        // Array
        result[key] = parseArray(children.lines);
      } else if (children.lines[0].match(/^\s+\w[\w-]*:/)) {
        // Nested object
        result[key] = parseNestedObject(children.lines);
      } else {
        result[key] = null;
      }
      i = children.endIdx;
    }
  }

  return result;
}

function collectIndented(lines: string[], startIdx: number): { lines: string[]; endIdx: number } {
  const collected: string[] = [];
  let i = startIdx;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") { i++; continue; }
    if (line.match(/^\s/) || line.trimStart().startsWith("- ")) {
      collected.push(line);
      i++;
    } else {
      break; // Back to top-level
    }
  }
  return { lines: collected, endIdx: i };
}

function parseArray(lines: string[]): unknown[] {
  const items: unknown[] = [];
  for (const line of lines) {
    const match = line.match(/^\s*-\s+(.*)/);
    if (match) {
      items.push(unquote(match[1].trim()));
    }
  }
  return items;
}

function parseNestedObject(lines: string[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  let currentKey = "";

  for (const line of lines) {
    // Nested key: value
    const kvMatch = line.match(/^\s+(\w[\w-]*):\s*(.*)/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      const val = kvMatch[2].trim();
      if (val) {
        obj[currentKey] = unquote(val);
      } else {
        obj[currentKey] = [];
      }
      continue;
    }

    // Array item under nested key
    const arrMatch = line.match(/^\s+-\s+(.*)/);
    if (arrMatch && currentKey) {
      const arr = obj[currentKey];
      if (Array.isArray(arr)) {
        arr.push(unquote(arrMatch[1].trim()));
      }
    }
  }

  return obj;
}

function unquote(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}
