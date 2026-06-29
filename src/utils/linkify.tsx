import React from 'react';

const URL_REGEX = /(https?:\/\/[^\s<>"')\]]+)/g;

/**
 * Splits text on URLs and renders each URL as a clickable <a> tag.
 * Safe: no dangerouslySetInnerHTML, no user-controlled href injection beyond the matched URL.
 */
export function linkifyText(text: string): React.ReactNode {
  const parts = text.split(URL_REGEX);
  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    if (URL_REGEX.test(part)) {
      // Reset regex lastIndex after test()
      URL_REGEX.lastIndex = 0;
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 opacity-90 hover:opacity-100 break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    URL_REGEX.lastIndex = 0;
    return part;
  });
}
