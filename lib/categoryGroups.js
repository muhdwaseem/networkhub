// Groups the flat category list into browsable sections, purely for
// display (product.category itself stays a flat string - see the note in
// lib/db.js next to getBrands about why categories/brands aren't relational
// entities in this schema). Mirrors the top-level grouping the RainbowStone
// workbook itself used (its sheet names) before scripts/recategorize-
// rainbowstone-catalog.mjs split each sheet into finer sub-categories.
const GROUPS = [
  {
    name: "Active Networking",
    categories: [
      "Access Points",
      "Routers & Gateways",
      "Enterprise Switches",
      "Managed Switches",
      "PoE Switches",
      "Optical Transceivers",
      "Firewalls / NGFW",
      "Networking",
    ],
  },
  {
    name: "Passive Cabling",
    categories: [
      "Copper Bulk Cable",
      "Fiber Patch Cords",
      "Fiber Accessories",
      "Patch Cords",
      "Keystone Jacks",
      "Keystone Outlets",
      "Patch Panels",
      "Rack Accessories",
      "Fiber Optic Bulk",
      "Fiber Panels & ODF",
    ],
  },
  {
    name: "Telecom & Security",
    categories: [
      "IP Desktop Phones",
      "IP Cameras (Bullet)",
      "IP Cameras (Dome)",
      "IP-PBX Appliances",
      "NVR (Video Recorders)",
      "Video Conferencing",
      "VoIP Accessories",
      "Analog Gateways",
      "Wireless IP Phones",
      "Surveillance & Security",
    ],
  },
  {
    name: "Servers & Storage",
    categories: ["NAS Enclosures", "NAS Hard Drives", "Surveillance HDDs"],
  },
  {
    name: "Racks & Power",
    categories: [
      "Wall Mount Racks",
      "Floor Server Racks",
      "Power Distribution (PDU)",
      "Line-Interactive UPS",
      "Online UPS",
    ],
  },
  {
    name: "Computers & Peripherals",
    categories: [
      "Laptops",
      "Desktop & AIO PCs",
      "Displays & Monitors",
      "Graphic Tablets & Displays",
      "Peripherals (Input)",
      "Workplace Hardware",
      "Laptops & Computers",
    ],
  },
  {
    name: "Specialty & Tools",
    categories: [
      "Fire Resistant Cable",
      "Audio & BMS Cable",
      "Coaxial Video Cable",
      "Tools & Testing Equipment",
      "Accessories",
    ],
  },
];

// Buckets a flat category list into the sections above, in group order.
// Anything not in a known bucket (e.g. a category added later via the admin
// panel) lands in a trailing "Other" group instead of silently vanishing.
export function groupCategories(categoryNames) {
  const remaining = new Set(categoryNames);
  const result = [];

  for (const group of GROUPS) {
    const present = group.categories.filter((c) => remaining.has(c));
    if (present.length === 0) continue;
    present.forEach((c) => remaining.delete(c));
    result.push({ name: group.name, categories: present });
  }

  if (remaining.size > 0) {
    result.push({ name: "Other", categories: [...remaining] });
  }

  for (const group of result) {
    group.categories = spliceMerges(group.categories);
  }

  return result;
}

// Some fine-grained categories are shown to shoppers as one combined entry
// point even though product.category keeps its precise value in the
// database - see the plan note on why this stays display-only (no data
// migration, related-products lookups keep using the exact category).
//
// A merged entry's key - used as the URL param value, the <select> option
// value, and the .category filter value - is just its members joined with
// "," (see withProductFilters() in lib/db.js for the read side). No
// existing category name contains a comma, so this can't collide.
const MERGES = [
  {
    label: "Copper & Fiber Cabling",
    categories: [
      "Copper Bulk Cable",
      "Fiber Patch Cords",
      "Fiber Accessories",
      "Fiber Optic Bulk",
      "Fiber Panels & ODF",
    ],
  },
];

function mergeKey(merge) {
  return merge.categories.join(",");
}

// Replaces every fully-present merge's member categories with one joined
// key, in place of the first member. A merge whose members aren't all in
// this particular list (e.g. it's split across two different groups, or
// the catalog is missing one) is left untouched rather than partially
// applied.
function spliceMerges(categories) {
  let result = categories;
  for (const merge of MERGES) {
    if (!merge.categories.every((c) => result.includes(c))) continue;
    const key = mergeKey(merge);
    const firstIndex = Math.min(...merge.categories.map((c) => result.indexOf(c)));
    const rest = result.filter((c) => !merge.categories.includes(c));
    result = [...rest.slice(0, firstIndex), key, ...rest.slice(firstIndex)];
  }
  return result;
}

// True display name for any category key - a raw category, or a merged
// group's joined key.
export function categoryLabel(key) {
  const merge = MERGES.find((m) => mergeKey(m) === key);
  return merge ? merge.label : key;
}

// Sums a (possibly merged) key's count against a raw Map<name, count> from
// getCategoryCounts().
export function categoryCount(categoryCounts, key) {
  return key.split(",").reduce((sum, c) => sum + (categoryCounts.get(c) || 0), 0);
}

// Collapses raw per-category counts so merge members contribute one
// combined entry - used only for ranking the homepage's top-N hero cards,
// so a merge competes as a single line rather than several.
export function mergeCategoryCounts(categoryCounts) {
  const result = new Map(categoryCounts);
  for (const merge of MERGES) {
    if (!merge.categories.some((c) => result.has(c))) continue;
    const sum = merge.categories.reduce((s, c) => s + (result.get(c) || 0), 0);
    merge.categories.forEach((c) => result.delete(c));
    result.set(mergeKey(merge), sum);
  }
  return result;
}
