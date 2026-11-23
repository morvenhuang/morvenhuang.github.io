import type { Category, Post } from "./types";

type Profile = {
  name: string;
  avatar: string;
  bio: string;
};

type Blog = {
  posts: Post[];
  categories: Category[];
  profile: Profile;
};

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not load " + url + " (" + response.status + ")");
  return response.json();
}

let publishedBlog: Promise<Blog> | undefined;

function getBlog() {
  publishedBlog ??= readJson<Blog>("/blog.json").catch((error) => {
    publishedBlog = undefined;
    throw error;
  });
  return publishedBlog;
}

export function getPosts() {
  return import.meta.env.DEV ? readJson<Post[]>("/api/posts") : getBlog().then((blog) => blog.posts);
}

export function getCategories() {
  return import.meta.env.DEV ? readJson<Category[]>("/api/categories") : getBlog().then((blog) => blog.categories);
}

export function getProfile() {
  return import.meta.env.DEV ? readJson<Profile>("/api/profile") : getBlog().then((blog) => blog.profile);
}
