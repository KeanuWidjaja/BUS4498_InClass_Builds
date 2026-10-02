// Local keyword matching, used when Claude isn't configured or a request fails.
// Scores each icon by how well the keyword's words hit its name and tags.
export function localMatch(keyword, icons) {
  const words = keyword.toLowerCase().split(/[^a-z0-9']+/).filter((w) => w.length > 1);
  if (words.length === 0) return [];

  const scored = icons.map((icon, index) => {
    const name = icon.name.toLowerCase();
    let score = 0;
    for (const word of words) {
      const stem = word.length > 3 ? word.replace(/(es|s)$/, "") : word;
      if (name === word) score += 6;
      else if (name.includes(stem)) score += 4;
      for (const tag of icon.tags) {
        if (tag === word || tag === stem) score += 3;
        else if (tag.includes(stem) || (tag.length > 3 && stem.includes(tag))) score += 1;
      }
    }
    return { id: icon.id, score, index };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((s) => s.id);
}
