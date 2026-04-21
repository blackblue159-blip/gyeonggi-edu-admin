import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import CardMatch from "./pages/CardMatch.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/card-match" element={<CardMatch />} />
      </Route>
    </Routes>
  );
}
