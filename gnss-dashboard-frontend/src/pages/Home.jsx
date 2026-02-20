import { useState } from "react";
import { useNavigate } from "react-router-dom";

import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import heroImage from "@/assets/gnss-hero.png";
import logo from "@/assets/logo.png";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export default function Home() {
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      
      {/* NAVBAR */}
    <Navbar />


      {/* HERO */}
      <section className="w-full flex justify-center bg-slate-900 min-h-[70vh]">
        <div className="relative w-full max-w-7xl">
          
          <img src={heroImage} className="w-full h-auto" />

          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/60" />

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            
            <h1 className="text-5xl font-bold text-white drop-shadow-lg mb-4">
              Field Survey Dashboard Platform
            </h1>

            <p className="text-gray-200 text-lg max-w-2xl mb-6 drop-shadow">
              Upload, visualize, edit, and manage field survey data
              with cloud synchronization and real-time track editing.
            </p>

            <Button
              size="lg"
              onClick={() => setShowLoginDialog(true)}
            >
              Open Survey Dashboard
            </Button>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="border-t py-14 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
          
          <Card>
            <CardHeader>
              <CardTitle>Survey Tools</CardTitle>
              <CardDescription>
                Path visualization and track editing tools
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Upload Map survey files, visualize survey tracks on the map,
              edit paths, and reposition photo markers directly from
              the dashboard.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assignment Workflow</CardTitle>
              <CardDescription>
                Field survey coordination
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Assign surveys to field surveyors with role-based access,
              track project progress, and manage survey sessions.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cloud Integration</CardTitle>
              <CardDescription>
                Google Drive track storage
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Synchronize Field survey files with Google Drive and
              visualize them instantly in the field survey dashboard.
            </CardContent>
          </Card>

        </div>
      </section>

      <Footer />

      {/* LOGIN REQUIRED DIALOG */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login Required</DialogTitle>
            <DialogDescription>
              Please login first to access the Survey Dashboard.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button
              onClick={() => {
                setShowLoginDialog(false);
                navigate("/login");
              }}
            >
              Login
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowLoginDialog(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
