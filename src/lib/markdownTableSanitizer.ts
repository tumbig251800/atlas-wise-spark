/**
 * Sanitize markdown content to prevent infinite empty table rows
 * Cleans up malformed markdown tables from AI streaming
 */

/**
 * Cleans up markdown tables by removing excessive empty rows
 * Stops rendering when 2 or more consecutive empty rows are detected
 */
export function sanitizeMarkdownTables(markdown: string): string {
  if (!markdown) return markdown;

  const lines = markdown.split('\n');
  const result: string[] = [];
  let consecutiveEmptyRows = 0;
  let inTable = false;
  let tableHeaderSeen = false;
  let tableSeparatorSeen = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect table header (contains |)
    if (trimmed.includes('|') && !tableSeparatorSeen) {
      inTable = true;
      tableHeaderSeen = true;
      consecutiveEmptyRows = 0;
      result.push(line);
      continue;
    }

    // Detect table separator (contains | and ---)
    if (inTable && tableHeaderSeen && trimmed.match(/^\|?[\s-:|]+\|?$/)) {
      tableSeparatorSeen = true;
      consecutiveEmptyRows = 0;
      result.push(line);
      continue;
    }

    // Inside table after separator
    if (inTable && tableSeparatorSeen) {
      // Check if this is an empty table row (only | and whitespace)
      const isEmptyRow = trimmed.match(/^\|[\s|]*\|?$/) || trimmed === '|';

      // Check if this is a separator-only row (only | and ---)
      const isSeparatorOnly = trimmed.match(/^\|?[\s-:|]+\|?$/) && trimmed.includes('-');

      if (isEmptyRow || isSeparatorOnly) {
        consecutiveEmptyRows++;

        // Stop the table if we hit 2 consecutive empty/separator rows
        if (consecutiveEmptyRows >= 2) {
          // End the table here, don't add this line
          inTable = false;
          tableHeaderSeen = false;
          tableSeparatorSeen = false;
          consecutiveEmptyRows = 0;
          continue;
        }

        // Allow first empty row but mark it
        result.push(line);
        continue;
      }

      // Valid table row with content
      if (trimmed.includes('|')) {
        consecutiveEmptyRows = 0;
        result.push(line);
        continue;
      }

      // Not a table row anymore - end table
      inTable = false;
      tableHeaderSeen = false;
      tableSeparatorSeen = false;
      consecutiveEmptyRows = 0;
      result.push(line);
      continue;
    }

    // Not in table or before table started
    consecutiveEmptyRows = 0;
    result.push(line);
  }

  return result.join('\n');
}

/**
 * Additional cleanup: remove trailing incomplete table fragments
 */
export function removeIncompleteTableFragments(markdown: string): string {
  if (!markdown) return markdown;

  const lines = markdown.split('\n');
  let lastCompleteIndex = lines.length - 1;

  // Scan from the end to find incomplete table fragments
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();

    // If we find only separators or empty rows at the end
    if (trimmed.match(/^\|?[\s-:|]+\|?$/) || trimmed === '|' || trimmed.match(/^\|[\s|]*\|?$/)) {
      lastCompleteIndex = i - 1;
      continue;
    }

    // Found actual content, stop
    break;
  }

  // Keep only up to the last complete content
  return lines.slice(0, lastCompleteIndex + 1).join('\n');
}

/**
 * Master sanitization function - applies all cleanup rules
 */
export function sanitizeMarkdown(markdown: string): string {
  let sanitized = sanitizeMarkdownTables(markdown);
  sanitized = removeIncompleteTableFragments(sanitized);
  return sanitized;
}
