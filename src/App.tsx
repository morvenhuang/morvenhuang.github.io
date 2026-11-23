import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Categories from "./pages/Categories";
import Article from "./pages/Article";
import About from "./pages/About";

const Admin = import.meta.env.DEV ? lazy(() => import("./pages/Admin/Routes")) : null;

export default function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/article/:id" element={<Article />} />
            <Route path="/about" element={<About />} />
            <Route path="/category/:id" element={<Home />} />
            <Route path="/tag/:tagName" element={<Home />} />
            {Admin && (
              <Route path="/admin/*" element={<Suspense fallback={null}><Admin /></Suspense>} />
            )}
            <Route path="*" element={<h1 className="p-12 text-center font-headline">Page not found</h1>} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
