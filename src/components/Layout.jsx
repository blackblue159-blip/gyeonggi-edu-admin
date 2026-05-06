import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar.jsx";

export function Layout() {
  return (
    <div className="flex h-[100dvh] min-h-0 overflow-hidden font-sans print:block">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div
          className="min-h-0 flex-1 overflow-y-auto py-8"
          style={{ paddingLeft: 56, paddingRight: 56 }}
        >
          <div className="mx-auto w-full max-w-[1060px] pb-10">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
