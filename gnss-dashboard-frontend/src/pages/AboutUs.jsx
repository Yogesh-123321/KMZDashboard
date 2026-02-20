import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import logo from "@/assets/logo.png";

export default function AboutUs() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      
      <Navbar />

      {/* HERO */}
      <section className="bg-slate-900 text-white py-20 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <img src={logo} className="h-16 mx-auto mb-6" />

          <h1 className="text-4xl font-bold mb-4">
            About Technotrendz Solutions
          </h1>

          <p className="text-gray-300 text-lg">
            Innovative solutions for modern businesses and engineering
            infrastructure platforms.
          </p>
        </div>
      </section>

      {/* COMPANY INFO */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto space-y-6">
          
          <h2 className="text-2xl font-semibold">
            Company Overview
          </h2>

          <p className="text-muted-foreground leading-relaxed">
            Founded in 2016, Technotrendz Solutions Pvt. Ltd. is a
            technology-driven company focused on engineering systems,
            telecom infrastructure solutions, and GNSS-based survey
            platforms.
          </p>

          <p className="text-muted-foreground leading-relaxed">
            The company develops electronic systems, GNSS devices,
            field-survey platforms, and electrical control solutions
            used in infrastructure and industrial environments.
          </p>

          <p className="text-muted-foreground leading-relaxed">
            Our goal is to combine hardware innovation with modern
            software dashboards to improve engineering productivity
            and field-data management workflows.
          </p>
        </div>
      </section>

      {/* PRODUCTS / TECHNOLOGY */}
      <section className="border-t py-16 px-6">
        <div className="max-w-5xl mx-auto space-y-6">
          
          <h2 className="text-2xl font-semibold">
            Technology & Solutions
          </h2>

          <p className="text-muted-foreground">
            Technotrendz delivers solutions across GNSS survey systems,
            rack controller electronic systems, fiber survey platforms,
            and cloud-connected dashboard applications.
          </p>

          <p className="text-muted-foreground">
            Our Field Survey Dashboard Platform enables administrators
            and field engineers to collaborate through visualization,
            assignment workflows, and real-time survey editing tools.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
