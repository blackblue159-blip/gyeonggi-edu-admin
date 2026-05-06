import { Outlet } from "react-router-dom";
import { MobileHeader } from "./MobileHeader.jsx";
import { Sidebar } from "./Sidebar.jsx";

export function Layout() {
  return (
    <div className="flex h-[100dvh] min-h-0 max-w-[100vw] flex-col overflow-x-hidden font-sans md:flex-row print:block">
      <MobileHeader />
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#FAFAF8] px-4 py-4 md:px-14 md:py-8">
          <div className="mx-auto w-full min-w-0 max-w-[1060px] pb-10">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
