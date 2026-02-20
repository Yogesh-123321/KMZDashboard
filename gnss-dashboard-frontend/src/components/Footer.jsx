import logo from "@/assets/logo.png";
import { MapPin, Phone, Mail } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-[#0f1b2e] text-gray-300">
      
      {/* TOP FOOTER */}
      <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-4 gap-10">
        
        {/* LOGO + DESCRIPTION */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <img
              src={logo}
              alt="Technotrendz Logo"
              className="h-12 object-contain"
            />
          </div>

          <p className="text-sm text-gray-400 leading-relaxed">
            Your premier destination for the latest technology
            trend and innovation.
          </p>
        </div>

        {/* QUICK LINKS */}
        <div>
          <h3 className="font-semibold mb-4 text-white">Quick Links</h3>

          <div className="space-y-2 text-sm">
            <Link to="/" className="block hover:text-white transition">
              Home
            </Link>

            <Link to="/about" className="block hover:text-white transition">
              About Us
            </Link>

            <div className="block opacity-70 cursor-default">
              Products
            </div>

            <div className="block opacity-70 cursor-default">
              Download
            </div>
          </div>
        </div>

        {/* SERVICES */}
        <div>
          <h3 className="font-semibold mb-4 text-white">Services</h3>

          <div className="space-y-2 text-sm">
            <div>Tech Consulting</div>
            <div>Innovation Labs</div>
            <div>Digital Solutions</div>
            <div>Tech Support</div>
          </div>
        </div>

        {/* CONTACT INFO */}
        <div>
          <h3 className="font-semibold mb-4 text-white">Contact Info</h3>

          <div className="space-y-3 text-sm">
            
            <div className="flex gap-2">
              <MapPin size={18} />
              <span>
                Plot No.101 (HUDA), Sector-59,
                HSIIDC Industrial Estate,
                Faridabad, Haryana - 121004, India
              </span>
            </div>

            <a
              href="tel:+918448808000"
              className="flex gap-2 hover:text-white transition"
            >
              <Phone size={18} />
              <span>+91-84488-08000</span>
            </a>

            <a
              href="mailto:info@technotrendz.co.in"
              className="flex gap-2 hover:text-white transition"
            >
              <Mail size={18} />
              <span>info@technotrendz.co.in</span>
            </a>

            <a
              href="mailto:presales@technotrendz.co.in"
              className="flex gap-2 hover:text-white transition"
            >
              <Mail size={18} />
              <span>presales@technotrendz.co.in</span>
            </a>
          </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="border-t border-gray-700 text-center py-4 text-sm text-gray-400">
        © 2026 Technotrendz Solutions Pvt Ltd. All rights reserved. |
        Innovating the future of technology.
      </div>
    </footer>
  );
}
