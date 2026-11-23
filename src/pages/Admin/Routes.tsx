import { Route, Routes } from "react-router-dom";
import AdminLogin from "./Login";
import AdminDashboard from "./Dashboard";
import AdminEditor from "./Editor";
import AdminCategories from "./Categories";

export default function AdminRoutes() {
  return (
    <Routes>
      <Route index element={<AdminDashboard />} />
      <Route path="login" element={<AdminLogin />} />
      <Route path="dashboard" element={<AdminDashboard />} />
      <Route path="categories" element={<AdminCategories />} />
      <Route path="editor" element={<AdminEditor />} />
      <Route path="editor/:id" element={<AdminEditor />} />
    </Routes>
  );
}
