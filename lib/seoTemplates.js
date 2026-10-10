const TITLE_MAX = 70;
const DESCRIPTION_MAX = 160;
const TITLE_SAFE = 66; // leaves room for the "…" and a safety margin under TITLE_MAX
const DESCRIPTION_SAFE = 157;

// Cuts at the last word boundary before maxLen rather than mid-word, so a
// shortened title/description still reads like a sentence fragment, not
// "...Modular 50kVA to 25…". Falls back to a hard cut only when there's no
// reasonable space to break on (e.g. one very long word).
function smartTruncate(text, maxLen) {
  if (!text || text.length <= maxLen) return text || "";
  const slice = text.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > maxLen * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${cut.trim()}…`;
}

// `title`/`description` must be whatever is CURRENTLY EFFECTIVE for that
// product — i.e. the admin's own seoTitle/metaDescription override if one
// is already set, otherwise the plain name/description. That's what
// actually needs shortening if it's too long; re-deriving from the raw
// product name alone would miss the case where an admin's own custom
// override is the thing that's overflowing.
//
// Returns only the fields that actually need to change — a field absent
// from the result means "leave the existing value alone", same semantics
// as updateProduct's own `data.field ?? existing.field` pattern, so
// callers can pass this straight through without clobbering anything that
// was already fine.
//
// `force` exists for one specific case: a product flagged as a *duplicate*
// description can look perfectly reasonable in isolation (not missing, not
// too long) — the problem only shows up when compared against the rest of
// the catalog. Without force, this function only touches metaDescription
// when something's actually wrong with it on its own terms.
//
// `title` doubles as a guaranteed tie-breaker when forcing: a product with
// only one or two specs (e.g. just "Capacity: 400GB") can still collide
// with other products after switching to a specs-based description, since
// specs alone aren't always enough to differentiate. Appending the title
// fixes that for certain rather than probably, because product titles are
// unique across this catalog (confirmed via the audit — 0 duplicate
// titles) in a way specs on their own aren't.
export function generateSeoTemplate({ title, description, specs }, { force = false } = {}) {
  const result = {};

  if (title && title.length > TITLE_MAX) {
    result.seoTitle = smartTruncate(title, TITLE_SAFE);
  }

  const specsList = Array.isArray(specs) ? specs.filter(Boolean) : [];
  const currentEffective = (description || specsList.join(", ") || "").trim();
  const descriptionIsProblem = !currentEffective || currentEffective.length > DESCRIPTION_MAX;

  if ((descriptionIsProblem || force) && specsList.length > 0) {
    // Specs differ per product even when many products share identical
    // boilerplate description text (common after a bulk import) — building
    // the meta description from specs instead naturally makes it unique
    // per product, not just shorter.
    const specsText = specsList.join(" · ");
    const withTitle = force && title ? `${specsText} — ${title}` : specsText;
    result.metaDescription = smartTruncate(withTitle, DESCRIPTION_SAFE);
  } else if (descriptionIsProblem && description) {
    result.metaDescription = smartTruncate(description, DESCRIPTION_SAFE);
  }

  return result;
}
