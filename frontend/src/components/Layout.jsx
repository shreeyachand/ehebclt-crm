import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "24px", overflowY: "auto" }}>
        {children}
      </main>
    </div>
  );
}
