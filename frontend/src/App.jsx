import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./LoginPage";
import BrowsingPage from "./BrowsingPage";
// import AdminPage from "./AdminPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/home" element={<BrowsingPage />} />
        {/* <Route path="/admin" element={<AdminPage />} /> */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;