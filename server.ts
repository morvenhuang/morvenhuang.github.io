import express from "express";
import { createServer as createViteServer, loadEnv } from "vite";
import path from "path";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const HOST = "127.0.0.1";
  const env = loadEnv("development", process.cwd(), ["ADMIN_PASSWORD"]);
  const allowedHosts = new Set([`${HOST}:${PORT}`, `localhost:${PORT}`]);

  app.use((req, res, next) => {
    const host = req.get("host");
    const origin = req.get("origin");
    if (!host || !allowedHosts.has(host) || (origin && origin !== `http://${host}`)) {
      return res.sendStatus(403);
    }
    next();
  });
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  app.use("/uploads", express.static(uploadsDir));

  // Persistence Setup
  const dataDir = path.join(process.cwd(), "data");
  const postsDir = path.join(dataDir, "posts");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(postsDir)) {
    fs.mkdirSync(postsDir, { recursive: true });
  }

  const categoriesFile = path.join(dataDir, "categories.json");
  const profileFile = path.join(dataDir, "profile.json");

  // Load initial data
  const passwordFile = path.join(dataDir, "password.json");
  let posts: any[] = [];
  let categories: any[] = [];
  let profile: any = {
    name: "Morven",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800&auto=format&fit=crop",
    bio: "A lover of classical Chinese poetry and calligraphy, a data nomad wandering through bits and bytes, a traditional programmer and a vibe coder."
  };

  const loadPassword = (): string | undefined => {
    if (fs.existsSync(passwordFile)) {
      return JSON.parse(fs.readFileSync(passwordFile, "utf8")).password;
    }
    return env.ADMIN_PASSWORD;
  };

  const savePassword = (password: string) => {
    fs.writeFileSync(passwordFile, JSON.stringify({ password }, null, 2), { mode: 0o600 });
  };

  const loadData = () => {
    try {
      // Load Categories
      if (fs.existsSync(categoriesFile)) {
        categories = JSON.parse(fs.readFileSync(categoriesFile, "utf-8"));
      }

      // Load Profile
      if (fs.existsSync(profileFile)) {
        profile = JSON.parse(fs.readFileSync(profileFile, "utf-8"));
      }

      // Load Posts (metadata from .json, content from .md)
      if (fs.existsSync(postsDir)) {
        const files = fs.readdirSync(postsDir);
        const jsonFiles = files.filter(f => f.endsWith(".json"));
        
        posts = jsonFiles.map(f => {
          const id = f.replace(".json", "");
          const jsonPath = path.join(postsDir, f);
          const mdPath = path.join(postsDir, `${id}.md`);
          
          try {
            const metadata = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
            
            // Migration: if content still exists in JSON, move it to MD
            if (metadata.content) {
              fs.writeFileSync(mdPath, metadata.content);
              delete metadata.content;
              fs.writeFileSync(jsonPath, JSON.stringify(metadata, null, 2));
              console.log(`Migrated content of ${id} to .md file`);
            } else if (fs.existsSync(mdPath)) {
              metadata.content = fs.readFileSync(mdPath, "utf-8");
            }
            
            return metadata;
          } catch (e) {
            console.error(`Error loading post ${id}:`, e);
            return null;
          }
        }).filter(p => p !== null);
        
        posts.sort((a, b) => {
          const dateA = new Date(a.updatedAt || a.date || 0);
          const dateB = new Date(b.updatedAt || b.date || 0);
          return dateB.getTime() - dateA.getTime();
        });
      }

      // Old legacy migration (posts.json -> individual files)
      const oldPostsFile = path.join(dataDir, "posts.json");
      if (fs.existsSync(oldPostsFile) && posts.length === 0) {
        const oldPosts = JSON.parse(fs.readFileSync(oldPostsFile, "utf-8"));
        oldPosts.forEach((post: any) => {
          const { content, ...metadata } = post;
          fs.writeFileSync(path.join(postsDir, `${post.id}.json`), JSON.stringify(metadata, null, 2));
          if (content) {
            fs.writeFileSync(path.join(postsDir, `${post.id}.md`), content);
          }
          posts.push(post);
        });
        fs.unlinkSync(oldPostsFile);
      }
    } catch (err) {
      console.error("Error loading data:", err);
    }
  };

  const saveCategories = () => {
    try {
      fs.writeFileSync(categoriesFile, JSON.stringify(categories, null, 2));
    } catch (err) {
      console.error("Error saving categories:", err);
    }
  };

  const savePost = (post: any) => {
    const { content, ...metadata } = post;
    const jsonPath = path.join(postsDir, `${post.id}.json`);
    const mdPath = path.join(postsDir, `${post.id}.md`);

    fs.writeFileSync(mdPath, content || "");
    fs.writeFileSync(jsonPath, JSON.stringify(metadata, null, 2));
  };

  const deletePostFile = (id: string) => {
    try {
      const jsonPath = path.join(postsDir, `${id}.json`);
      const mdPath = path.join(postsDir, `${id}.md`);
      if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);
      if (fs.existsSync(mdPath)) fs.unlinkSync(mdPath);
    } catch (err) {
      console.error(`Error deleting post files ${id}:`, err);
    }
  };

  loadData();

  // API Routes
  app.get("/api/posts", (req, res) => {
    res.json(posts);
  });

  app.get("/api/tags", (req, res) => {
    const tagSet = new Set<string>();
    posts.forEach(p => (p.tags || []).forEach((t: string) => tagSet.add(t)));
    res.json(Array.from(tagSet).sort());
  });

  app.get("/api/posts/:id", (req, res) => {
    const post = posts.find(p => p.id === req.params.id);
    if (post) res.json(post);
    else res.status(404).json({ message: "Post not found" });
  });

  app.get("/api/categories", (req, res) => {
    const catsWithCounts = categories.map(cat => {
      const postCount = posts.filter(p => (p.category || "").toLowerCase() === cat.id.toLowerCase()).length;
      return { ...cat, count: postCount };
    });
    res.json(catsWithCounts);
  });

  app.post("/api/categories", (req, res) => {
    const newCategory = { 
      ...req.body, 
      id: req.body.id || req.body.name.toLowerCase().replace(/\s+/g, '-'),
      count: 0
    };
    categories.push(newCategory);
    saveCategories();
    res.status(201).json(newCategory);
  });

  app.put("/api/categories/:id", (req, res) => {
    const index = categories.findIndex(c => c.id === req.params.id);
    if (index !== -1) {
      categories[index] = { ...categories[index], ...req.body };
      saveCategories();
      res.json(categories[index]);
    } else {
      res.status(404).json({ message: "Category not found" });
    }
  });

  app.delete("/api/categories/:id", (req, res) => {
    const index = categories.findIndex(c => c.id === req.params.id);
    if (index !== -1) {
      
      categories.splice(index, 1);
      saveCategories();
      res.status(204).send();
    } else {
      res.status(404).json({ message: "Category not found" });
    }
  });

  app.post("/api/posts", (req, res) => {
    const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
    if (!title) return res.status(400).json({ message: "Title is required" });

    const baseId = title.toLowerCase().replace(/[/%\\\s\u0000-\u001f\u007f]+/gu, "-");
    let id = baseId;
    for (let suffix = 2; posts.some((post) => post.id === id) || fs.existsSync(path.join(postsDir, id + ".json")); suffix++) {
      id = `${baseId}-${suffix}`;
    }
    const newPost = { ...req.body, title, id };
    savePost(newPost);
    posts.unshift(newPost);
    res.status(201).json(newPost);
  });

  app.put("/api/posts/:id", (req, res) => {
    const index = posts.findIndex(p => p.id === req.params.id);
    if (index !== -1) {
      const post = { ...posts[index], ...req.body, id: req.params.id };
      savePost(post);
      posts[index] = post;
      res.json(post);
    } else {
      res.status(404).json({ message: "Post not found" });
    }
  });

  app.delete("/api/posts/:id", (req, res) => {
    const index = posts.findIndex(p => p.id === req.params.id);
    if (index !== -1) {
      const postId = posts[index].id;
      posts.splice(index, 1);
      deletePostFile(postId);
      res.status(204).send();
    } else {
      res.status(404).json({ message: "Post not found" });
    }
  });

  app.get("/api/profile", (req, res) => {
    res.json(profile);
  });

  app.put("/api/profile", (req, res) => {
    profile = { ...profile, ...req.body };
    fs.writeFileSync(profileFile, JSON.stringify(profile, null, 2));
    res.json(profile);
  });

  app.post("/api/upload", (req, res) => {
    const { image, filename: desiredName } = req.body;
    if (!image) return res.status(400).json({ message: "No image data" });

    try {
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      const extension = image.split(";")[0].split("/")[1];
      const ext = extension === "jpeg" ? "jpg" : extension;

      // Build filename from desired name, handling collisions
      const baseName = (desiredName || "upload").replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_\-\u4e00-\u9fff]/g, "_");
      let filename = `${baseName}.${ext}`;
      let filepath = path.join(uploadsDir, filename);
      let counter = 1;
      while (fs.existsSync(filepath)) {
        filename = `${baseName}_${counter}.${ext}`;
        filepath = path.join(uploadsDir, filename);
        counter++;
      }

      fs.writeFileSync(filepath, base64Data, "base64");
      res.json({ url: `/uploads/${filename}` });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ message: "Upload failed" });
    }
  });


  app.post("/api/auth/login", (req, res) => {
    const { password } = req.body;
    const configuredPassword = loadPassword();
    if (!configuredPassword) {
      return res.status(503).json({ message: "Set ADMIN_PASSWORD in .env.local and restart the editor." });
    }
    if (password === configuredPassword) {
      return res.json({ success: true });
    }
    res.status(401).json({ message: "Invalid passphrase" });
  });

  app.put("/api/auth/password", (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== "string" || !currentPassword || currentPassword !== loadPassword()) {
      return res.status(403).json({ message: "Current password is incorrect" });
    }
    if (typeof newPassword !== "string" || !newPassword.trim()) {
      return res.status(400).json({ message: "New password is required" });
    }
    savePassword(newPassword);
    res.json({ success: true });
  });

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);

  app.listen(PORT, HOST, () => {
    console.log(`Local blog editor running at http://${HOST}:${PORT}/admin/login`);
  }).on('error', (err) => {
    console.error('Server failed to start:', err);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
