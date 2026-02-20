import { useState } from "react";
import heroImage from "@/assets/gnss-hero.png";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { login } from "@/lib/api";
import { useNavigate } from "react-router-dom";

export default function Login({ onLogin, onBackHome }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
const navigate = useNavigate();

 const handleLogin = async () => {
  try {
    const data = await login(username, password);

    localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.role);
    localStorage.setItem("username", data.username);

    onLogin();

    navigate("/dashboard");   // ← THIS WAS MISSING
  } catch {
    alert("Invalid credentials");
  }
};


  return (
    <div className="relative h-screen flex items-center justify-center">

      {/* Background */}
      <img
        src={heroImage}
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="absolute inset-0 bg-black/60" />

      {/* Back button */}
      <div className="absolute top-6 left-6 z-10">
        <Button variant="outline" onClick={() => navigate("/")}>
          ← Back to Home
        </Button>
      </div>

      {/* Login Card */}
      <Card className="relative z-10 w-[360px] bg-white/10 backdrop-blur-md border-white/20 shadow-xl">
        
        <CardHeader>
          <CardTitle className="text-center text-white">
            GNSS Dashboard Login
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <Input
            placeholder="Username"
            onChange={(e) => setUsername(e.target.value)}
            className="bg-white/20 border-white/30 text-white placeholder:text-gray-300"
          />

          <Input
            type="password"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
            className="bg-white/20 border-white/30 text-white placeholder:text-gray-300"
          />

          <Button className="w-full" onClick={handleLogin}>
            Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
