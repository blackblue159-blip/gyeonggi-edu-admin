import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import CardMatch from "./pages/CardMatch.jsx";
import SchoolInfo from "./pages/SchoolInfo.jsx";
import Calculator from "./pages/Calculator.jsx";
import Inventory from "./pages/Inventory.jsx";
import Archive from "./pages/Archive.jsx";
import Tools from "./pages/Tools.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/calculator" element={<Calculator />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/archive" element={<Archive />} />
        <Route path="/tools" element={<Tools />} />
        <Route path="/school-info" element={<SchoolInfo />} />
        <Route path="/card-match" element={<CardMatch />} />
      </Route>
    </Routes>
  );
}
