import { Route, Routes } from "react-router";
import { HomePage } from "./pages/HomePage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { screens } from "./screens";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      {screens.map(({ key, path }) => (
        <Route key={key} path={path} element={<PlaceholderPage screen={key} />} />
      ))}
      <Route path="*" element={<PlaceholderPage screen="linkNotFound" />} />
    </Routes>
  );
}
