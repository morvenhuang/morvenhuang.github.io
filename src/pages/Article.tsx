import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "motion/react";
import MarkdownRenderer from "../components/MarkdownRenderer";
import { Post, Category } from "../types";
import { getCategories, getPosts, getProfile } from "../blog-data";
import { resizeUnsplashImage } from "../blog-images";
import { blogPath, routeSegment } from "../blog-paths.mjs";

export default function Article() {
  const { id } = useParams();
  const [allPosts, setAllPosts] = useState<Post[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    getPosts()
      .then((posts) => setAllPosts([...posts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())))
      .catch(() => setLoadFailed(true));
    getCategories().then(setCategories).catch(console.error);
    getProfile().then((profile) => setAvatar(profile.avatar)).catch(console.error);
  }, []);

  const formatDate = (raw: string) => {
    if (!raw) return "";
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };
  const getCategoryName = (catId: string) => {
    return categories.find(c => c.id === catId)?.name || catId;
  };

  if (loadFailed) return <p role="alert" className="p-12 text-center">Unable to load article. Please try again.</p>;
  if (!allPosts) return <div className="h-screen flex items-center justify-center font-headline">Distilling signal...</div>;

  const currentIndex = allPosts.findIndex((post) => routeSegment(post.id) === id);
  if (currentIndex < 0) return <h1 className="p-12 text-center font-headline">Article not found</h1>;

  const post = allPosts[currentIndex];
  const prevPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
  const nextPost = allPosts[currentIndex + 1];
  const articleTags = post.tags ?? [];

  return (
    <motion.article
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen font-body"
    >
      <header className="w-full pt-12">
        <div className="max-w-4xl mx-auto px-8">
          <div className="flex items-center gap-3 mb-8 text-on-surface-variant/60 font-label">
            <span className="text-[0.75rem] font-bold tracking-widest text-primary bg-secondary-container/30 px-3 py-1 rounded-full uppercase">
              {getCategoryName(post.category)}
            </span>
            <span className="text-[0.75rem]">
              {formatDate(post.updatedAt || post.date)}
            </span>
            <span className="text-[0.75rem]">
              {post.readTime}
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-headline font-black text-primary leading-[1.1] mb-12 tracking-tight">
            {post.title}
          </h1>
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-12 rounded-full bg-surface-container-high overflow-hidden">
              <img
                src={avatar || "/uploads/20191227173203.jpg"}
                alt={post.author}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-sm font-bold text-primary font-label">{post.author}</p>
              <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-label">Editorial Director & Curator</p>
            </div>
          </div>
        </div>
        
        <div className="max-w-3xl mx-auto px-8 mb-12">
          <div className="aspect-[16/9] w-full rounded-xl overflow-hidden bg-surface-container-low shadow-2xl shadow-primary/5">
            <img
              src={resizeUnsplashImage(post.heroImage || post.image, 1080)}
              alt="Hero"
              className="w-full h-full object-cover"
            />
          </div>
          <p className="mt-4 text-center text-[10px] uppercase tracking-widest text-on-surface-variant font-label">
            Visual resonance within the Mem Addr archives.
          </p>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-8 pb-32">
        <div className="markdown-body">
          <MarkdownRenderer>
            {post.content || ""}
          </MarkdownRenderer>
        </div>

        {articleTags.length > 0 && (
          <div className="mt-20 flex flex-wrap gap-2">
            {articleTags.map(tag => (
              <Link key={tag} to={blogPath("tag", tag)} className="px-3 py-1 bg-surface-container-high text-[0.65rem] font-bold tracking-widest uppercase text-primary font-label rounded hover:bg-primary/10 transition-colors inline-block">
                #{tag}
              </Link>
            ))}
          </div>
        )}

        <nav className="mt-32 pt-12 border-t border-outline-variant/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="max-w-xs">
              {prevPost ? (
                <Link to={blogPath("article", prevPost.id)} className="group block">
                  <span className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-2 block">Previous Article</span>
                  <h5 className="text-xl font-headline text-primary group-hover:text-secondary transition-colors">{prevPost.title}</h5>
                </Link>
              ) : <span className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-on-surface-variant/40">First Article</span>}
            </div>
            <div className="max-w-xs text-right">
              {nextPost ? (
                <Link to={blogPath("article", nextPost.id)} className="group block">
                  <span className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-2 block">Next Article</span>
                  <h5 className="text-xl font-headline text-primary group-hover:text-secondary transition-colors">{nextPost.title}</h5>
                </Link>
              ) : <span className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-on-surface-variant/40">Latest Article</span>}
            </div>
          </div>
        </nav>
      </section>
    </motion.article>
  );
}
