import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout.jsx";

function LoadingUI() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-10 text-[13px] text-[#787774] sm:px-6 sm:py-12">
      불러오는 중…
    </div>
  );
}

const Home = lazy(() => import("./pages/Home.jsx"));
const CardMatch = lazy(() => import("./pages/CardMatch.jsx"));
const SchoolInfo = lazy(() => import("./pages/SchoolInfo.jsx"));
const Calculator = lazy(() => import("./pages/Calculator.jsx"));
const Inventory = lazy(() => import("./pages/Inventory.jsx"));
const Archive = lazy(() => import("./pages/Archive.jsx"));
const Tools = lazy(() => import("./pages/Tools.jsx"));
const TaskGuide = lazy(() => import("./pages/TaskGuide.jsx"));

export default function App() {
  return (
    <Suspense fallback={<LoadingUI />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/school-info" element={<SchoolInfo />} />
          <Route path="/card-match" element={<CardMatch />} />
          <Route path="/guide" element={<TaskGuide />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
