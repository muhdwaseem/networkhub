import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf-8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx), l.slice(idx + 1)];
    })
);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: buckets, error: listErr } = await db.storage.listBuckets();
if (listErr) {
  console.error("List buckets failed:", listErr.message);
  process.exit(1);
}

if (buckets.some((b) => b.name === "images")) {
  console.log("Bucket 'images' already exists.");
} else {
  const { error } = await db.storage.createBucket("images", {
    public: true,
    fileSizeLimit: "8MB",
  });
  if (error) {
    console.error("Create bucket failed:", error.message);
    process.exit(1);
  }
  console.log("Bucket 'images' created (public).");
}
