import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { routeSegment } from "../src/blog-paths.mjs";
import { comparePublicationDates } from "../src/blog-dates.mjs";

const root = resolve(import.meta.dirname, "..");
const output = resolve(process.argv[2] ?? join(root, "dist"));
const data = join(root, "data");
const postDirectory = join(data, "posts");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

const [shell, filenames, rawCategories, rawProfile] = await Promise.all([
  readFile(join(output, "index.html"), "utf8"),
  readdir(postDirectory),
  readJson(join(data, "categories.json")),
  readJson(join(data, "profile.json")),
]);

const entries = await Promise.all(filenames.filter((name) => name.endsWith(".json")).map(async (name) => {
  const id = basename(name, ".json");
  const metadata = await readJson(join(postDirectory, name));
  if (metadata.id !== id) throw new Error("Post ID does not match file name: " + name);
  if (metadata.hidden === true) return null;

  const { title, excerpt, author, category, date, readTime, image, heroImage, tags, updatedAt, createdAt } = metadata;
  const content = metadata.content ?? await readFile(join(postDirectory, id + ".md"), "utf8");
  return { id, title, excerpt, content, author, category, date, readTime, image, heroImage, tags, updatedAt, createdAt };
}));
const posts = entries.filter((post) => post !== null).sort(comparePublicationDates);

const categories = rawCategories.map(({ id, name, description, parentId }) => ({
  id,
  name,
  description,
  parentId,
  count: posts.filter((post) => (post.category || "").toLowerCase() === id.toLowerCase()).length,
}));
const { name, avatar, bio } = rawProfile;
const profile = { name, avatar, bio };
const tags = new Set(posts.flatMap((post) => post.tags ?? []).filter(Boolean));
const routes = new Set([
  "about",
  "categories",
  ...posts.map(({ id }) => join("article", routeSegment(id))),
  ...categories.map(({ id }) => join("category", routeSegment(id))),
  ...Array.from(tags, (tag) => join("tag", routeSegment(tag))),
]);

await Promise.all([
  writeFile(join(output, "blog.json"), JSON.stringify({ posts, categories, profile })),
  writeFile(join(output, "404.html"), shell),
  cp(join(root, "uploads"), join(output, "uploads"), {
    recursive: true,
    filter: (path) => !basename(path).startsWith("."),
  }),
  ...Array.from(routes, async (route) => {
    const directory = join(output, route);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, "index.html"), shell);
  }),
]);

console.log("Exported %d articles, %d categories and %d tags.", posts.length, categories.length, tags.size);
