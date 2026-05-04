import { Outlet } from "react-router-dom";
import { Footer } from "./Footer.jsx";
import { Sidebar } from "./Sidebar.jsx";

export function Layout() {
  return (
    <div className="flex h-[100dvh] min-h-0 overflow-hidden font-sans print:block">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-10 py-8">
          <Outlet />
        </div>
        <Footer />
      </div>
    </div>
  );
}
