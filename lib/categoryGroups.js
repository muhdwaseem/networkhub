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

  return result;
}
