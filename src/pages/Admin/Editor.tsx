import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, Save, Eye, Edit3, Upload, Image as ImageIcon } from "lucide-react";
import MarkdownRenderer from "../../components/MarkdownRenderer";
import { getPublicationDate, normalizePublicationDate, todayPublicationDate } from "../../blog-dates.mjs";
import { Post, Category } from "../../types";

export default function AdminEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isPreview, setIsPreview] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dateError, setDateError] = useState("");
  const dateInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const contentInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Post>>(() => ({
    title: "",
    content: "",
    author: "Morven",
    category: "ai",
    image: "",
    date: todayPublicationDate(),
    tags: [],
  }));

  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    if (localStorage.getItem("admin_auth") !== "true") {
      navigate("/admin/login");
      return;
    }

    fetch("/api/categories")
      .then(res => res.json())
      .then(setCategories);
    fetch("/api/tags")
      .then(res => res.json())
      .then(setAllTags);

    if (id) {
      fetch(`/api/posts/${encodeURIComponent(id)}`)
        .then(res => res.json())
        .then((post: Post) => setFormData({ ...post, date: getPublicationDate(post) }));
    }
  }, [id, navigate]);

  const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const uploadImage = async (file: File): Promise<string> => {
    const base64 = await toBase64(file);
    const response = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64, filename: file.name })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Upload failed");
    return data.url;
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const url = await uploadImage(file);
        setFormData({ ...formData, image: url });
      } catch (err) {
        console.error("Upload failed:", err);
      }
    }
  };

  const handleContentImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && contentRef.current) {
      try {
        const url = await uploadImage(file);
        const textarea = contentRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = formData.content || "";
        const before = text.substring(0, start);
        const after = text.substring(end);
        const insertion = `\n![Image](${url})\n`;
        
        setFormData({
          ...formData, content: before + insertion + after
        });
      } catch (err) {
        console.error("Content image upload failed:", err);
      }
    }
  };

  const getCategoryPath = (categoryId?: string): string => {
    if (!categoryId) return "";
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return categoryId;
    return cat.name;
  };

  const computeReadTime = (text: string): string => {
    const t = (text || "").trim();
    // Count Chinese characters (CJK range)
    const chineseChars = (t.match(/[一-鿿㐀-䶿]/g) || []).length;
    // Count English words (non-CJK)
    const englishWords = t.replace(/[一-鿿㐀-䶿]/g, "").trim().split(/\s+/).filter(Boolean).length;
    // Chinese: ~400 chars/min, English: ~200 words/min
    const minutes = Math.max(1, Math.ceil(chineseChars / 400 + englishWords / 200));
    return `${minutes} min read`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const date = normalizePublicationDate(formData.date);
    if (!date) {
      setDateError("Enter a valid date in YYYY-MM-DD or YYYYMMDD format.");
      dateInputRef.current?.focus();
      return;
    }

    const method = id ? "PUT" : "POST";
    const url = id ? `/api/posts/${encodeURIComponent(id)}` : "/api/posts";
    const now = new Date().toISOString();
    const body: Partial<Post> = {
      ...formData,
      date,
      readTime: computeReadTime(formData.content || ""),
      updatedAt: now,
    };

    if (!id) body.createdAt = now;

    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then((response) => {
      if (!response.ok) throw new Error("Save failed");
      navigate("/admin/dashboard");
    }).catch(() => alert("Unable to save article. Your changes are still in the editor."));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto px-8 pt-12 pb-20"
    >
      <div className="flex justify-between items-center mb-12">
        <button
          onClick={() => navigate("/admin/dashboard")}
          className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors text-sm font-label uppercase tracking-widest"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Table
        </button>
        
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            className="flex items-center gap-2 bg-surface-container-high text-primary px-4 py-2 rounded font-label text-[10px] font-bold tracking-widest uppercase hover:opacity-90 transition-all border border-outline-variant/10"
          >
            {isPreview ? <><Edit3 className="w-3 h-3" /> Edit Mode</> : <><Eye className="w-3 h-3" /> Preview Signal</>}
          </button>
        </div>
      </div>

      <div className="mb-16">
        <h1 className="font-headline text-5xl text-primary">
          {id ? "Edit Repository Entry" : "Create New Inquiry"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-surface-container-low border-none rounded px-4 py-3 text-lg font-headline text-primary focus:ring-1 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Category Signal</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-surface-container-low border-none rounded px-4 py-3 focus:ring-1 focus:ring-primary text-sm font-label"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {getCategoryPath(cat.id)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 mt-4">Tags</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {(formData.tags || []).map((tag: string, i: number) => (
                  <span key={i} className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-label">
                    {tag}
                    <button type="button" onClick={() => setFormData({ ...formData, tags: (formData.tags || []).filter((_: string, j: number) => j !== i) })} className="hover:text-red-500 transition-colors">&times;</button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Type tag and press Enter"
                className="w-full bg-surface-container-low border-none rounded px-4 py-3 text-sm focus:ring-1 focus:ring-primary"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    const val = (e.target as HTMLInputElement).value.trim().toUpperCase();
                    if (val && !(formData.tags || []).includes(val)) {
                      setFormData({ ...formData, tags: [...(formData.tags || []), val] });
                      (e.target as HTMLInputElement).value = "";
                    }
                  }
                }}
              />
              {allTags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {allTags.filter(t => !(formData.tags || []).includes(t)).map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setFormData({ ...formData, tags: [...(formData.tags || []), tag] })}
                      className="px-2 py-1 bg-surface-container-high text-on-surface-variant/60 rounded text-[10px] font-label uppercase tracking-wide hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <label htmlFor="publication-date" className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Publication Date</label>
              <input
                id="publication-date"
                ref={dateInputRef}
                type="text"
                inputMode="numeric"
                value={formData.date ?? ""}
                onChange={(e) => {
                  setFormData({ ...formData, date: e.target.value });
                  setDateError("");
                }}
                aria-describedby="publication-date-help"
                aria-invalid={Boolean(dateError)}
                className="w-full bg-surface-container-low border-none rounded px-4 py-3 text-sm focus:ring-1 focus:ring-primary"
                required
              />
              <p id="publication-date-help" className="mt-2 text-xs text-on-surface-variant">
                {dateError ? <span role="alert" className="text-red-600">{dateError}</span> : "YYYY-MM-DD or YYYYMMDD"}
              </p>
            </div>
            <label className="flex items-center gap-3 text-sm text-primary">
              <input
                type="checkbox"
                checked={formData.hidden === true}
                onChange={(e) => setFormData({ ...formData, hidden: e.target.checked })}
                className="h-4 w-4 accent-primary"
              />
              Hide from the public blog
            </label>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Cover Image URL / Upload</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="flex-grow bg-surface-container-low border-none rounded px-4 py-3 text-sm focus:ring-1 focus:ring-primary"
                />
                <input
                  type="file"
                  ref={coverInputRef}
                  onChange={handleCoverUpload}
                  className="hidden"
                  accept="image/*"
                />
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="bg-primary/5 text-primary p-3 rounded hover:bg-primary/10 transition-colors border border-primary/10"
                  title="Upload local image"
                >
                  <Upload className="w-5 h-5" />
                </button>
              </div>
            </div>

          </div>
        </div>



        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[600px]">
          <div className={isPreview ? "hidden lg:block lg:opacity-50 pointer-events-none" : "block flex flex-col"}>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Markdown Content</label>
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={contentInputRef}
                  onChange={handleContentImageUpload}
                  className="hidden"
                  accept="image/*"
                />
                <button
                  type="button"
                  onClick={() => contentInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1 bg-primary/5 text-primary rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-primary/10 transition-colors border border-primary/10"
                >
                  <ImageIcon className="w-3 h-3" /> Insert Local Image
                </button>
              </div>
            </div>
            <textarea
              ref={contentRef}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="flex-grow w-full bg-surface-container-low border-none rounded px-4 py-3 text-base leading-relaxed focus:ring-1 focus:ring-primary h-full font-mono font-normal text-sm"
              placeholder="# Begin your inquiry..."
              required
            />
          </div>
          <div className={!isPreview ? "hidden lg:block" : "block"}>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Visual Preview</label>
            <div className="w-full bg-surface-container-lowest rounded px-8 py-8 h-full overflow-y-auto border border-outline-variant/10">
              <div className="markdown-body">
                <MarkdownRenderer>
                  {formData.content || "*Void waits for signal...*"}
                </MarkdownRenderer>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-10 flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 bg-primary text-white px-10 py-4 rounded font-label text-xs font-bold tracking-[0.2em] uppercase hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            <Save className="w-4 h-4" /> Commit to Archive
          </button>
        </div>
      </form>
    </motion.div>
  );
}
