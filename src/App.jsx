import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import CardMatch from "./pages/CardMatch.jsx";
import SchoolInfo from "./pages/SchoolInfo.jsx";
import Calculator from "./pages/Calculator.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/calculator" element={<Calculator />} />
        <Route path="/school-info" element={<SchoolInfo />} />
        <Route path="/card-match" element={<CardMatch />} />
      </Route>
    </Routes>
  );
}
