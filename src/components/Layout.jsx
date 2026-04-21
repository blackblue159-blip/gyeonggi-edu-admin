import { Outlet } from "react-router-dom";
import { Header } from "./Header.jsx";
import { Footer } from "./Footer.jsx";

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col font-sans">
      <Header />
      <Outlet />
      <Footer />
    </div>
  );
}
