import { useNavigate } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <header className="border-b h-16 px-8 flex items-center justify-between bg-background">
      
      <img
        src={logo}
        alt="Technotrendz Logo"
        className="h-12 object-contain cursor-pointer"
        onClick={() => navigate("/")}
      />

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Button onClick={() => navigate("/login")}>
          Login
        </Button>
      </div>

    </header>
  );
}
