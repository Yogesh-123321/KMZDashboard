import KmzList from "@/components/KmzList";
import ThemeToggle from "@/components/ThemeToggle";

function App() {
  return (
    <div className="h-screen flex flex-col bg-background text-foreground">

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <h1 className="text-2xl font-semibold">
          GNSS Dashboard
        </h1>

        <ThemeToggle />
      </header>

      {/* Main content */}
      <main className="flex-1 px-6 py-4 overflow-hidden">
        <KmzList />
      </main>
    </div>
  );
}

export default App;
