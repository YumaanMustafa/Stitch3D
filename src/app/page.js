"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Menu, X, ArrowRight, Layers, Scissors, 
  ShoppingBag, CheckCircle, Star, MoveRight, 
  Zap, ShieldCheck, Sparkles, Monitor, Palette, 
  Globe, Heart, Box, Maximize, Cpu
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * @file page.js
 * @description Stitch Definitive Landing Page.
 * Purely aligned with Midnight Navy (#1E293B) and Vibrant Orange (#F97316).
 * Focuses on the core Bespoke Leather Studio value proposition.
 */

export default function HomePage() {
  const router = useRouter();
  const [activeScrolled, setActiveScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("token"));
    
    fetch('/api/public/products/trending')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTrendingProducts(data);
      })
      .catch(err => console.error(err));

    const handleScroll = () => setActiveScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "The Studio", href: "#studio" },
    { name: "Craftsmanship", href: "#craft" },
    { name: "Collection", href: "#showcase" },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0F172A] font-sans selection:bg-orange-100 selection:text-[#F97316]">
      
      {/* --- BRAND HEADER --- */}
      <header 
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
          activeScrolled 
          ? "bg-white/90 backdrop-blur-xl shadow-sm py-4 border-b border-slate-100" 
          : "bg-transparent py-8"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 flex items-center justify-center bg-[#1E293B] rounded-xl overflow-hidden shadow-lg group-hover:shadow-orange-500/20 transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-[#F97316] to-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <span className="relative z-10 text-white font-black text-xl italic tracking-tighter">S</span>
            </div>
            <div className="flex flex-col">
              <div className="text-xl font-black tracking-tighter flex items-center gap-0.5">
                <span className="text-[#1E293B]">Stitch</span>
              </div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-10">
            {navLinks.map((link) => (
              <a 
                key={link.name} 
                href={link.href} 
                className="text-[12px] font-bold uppercase tracking-widest text-slate-500 hover:text-[#F97316] transition-colors"
              >
                {link.name}
              </a>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-6">
            {!isLoggedIn ? (
              <>
                <Link href='/customer-auth/login' className="text-[12px] font-bold uppercase tracking-widest text-[#1E293B] hover:text-[#F97316] transition-colors">
                  Login
                </Link>
                <button 
                  onClick={() => router.push('/customer-auth/signup')}
                  className="px-8 py-3 bg-[#1E293B] text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-[#F97316] hover:-translate-y-0.5 transition-all active:scale-95"
                >
                  Start Designing
                </button>
              </>
            ) : (
              <button 
                onClick={() => router.push('/customer/dashboard')}
                className="px-8 py-3 bg-[#F97316] text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg hover:shadow-orange-500/30 hover:-translate-y-0.5 transition-all"
              >
                My Dashboard
              </button>
            )}
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 text-[#1E293B]">
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* --- HERO: THE REVOLUTION --- */}
      <section className="relative pt-40 pb-20 lg:pt-56 lg:pb-32 overflow-hidden">
        <div className="absolute top-0 right-0 w-[50%] h-full bg-slate-100/50 -z-10 rounded-l-[80px]" />
        
        <div className="max-w-7xl mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-[#F97316] text-[10px] font-bold uppercase tracking-wider mb-8">
              <Box size={14} /> World's First Custom Leather Studio
            </div>
            <h1 className="text-5xl lg:text-7xl font-black leading-[1.1] tracking-tight mb-8 text-[#1E293B]">
              Bespoke Quality. <br />
              <span className="text-[#F97316]">Digital Precision.</span>
            </h1>
            <p className="text-lg text-slate-600 mb-10 leading-relaxed max-w-lg font-medium">
              Experience the pinnacle of custom fashion. Stitch combines traditional master craftsmanship with our interactive customizer, allowing you to design and visualize your perfect leather jacket before it's even cut.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => router.push('/customer/customize')}
                className="px-10 py-4 bg-[#F97316] hover:bg-[#1E293B] text-white font-black text-[12px] uppercase tracking-widest rounded-xl shadow-xl shadow-orange-500/20 hover:shadow-slate-900/20 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3"
              >
                Launch Studio <MoveRight size={18} />
              </button>
              <button 
                onClick={() => document.getElementById('studio')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-10 py-4 bg-white hover:bg-slate-50 text-[#1E293B] font-black text-[12px] uppercase tracking-widest rounded-xl border border-slate-200 shadow-sm transition-all duration-300"
              >
                See How it Works
              </button>
            </div>

            <div className="mt-12 flex flex-wrap gap-8 text-[11px] font-bold uppercase tracking-widest text-slate-400">
              <div className="flex items-center gap-2 text-[#1E293B]"><CheckCircle size={16} className="text-[#F97316]" /> 100% Genuine Leather</div>
              <div className="flex items-center gap-2 text-[#1E293B]"><CheckCircle size={16} className="text-[#F97316]" /> Real-time Rendering</div>
            </div>
          </motion.div>

          {/* Visual: Immersive Engine Teaser */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 1 }}
            className="relative"
          >
            <div className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white bg-slate-200">
              <img 
                src="https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=2000&auto=format&fit=crop" 
                alt="Biker Jacket" 
                className="w-full h-full object-cover" 
              />
              
              {/* Customizer UI Elements */}
              <div className="absolute top-6 right-6 bg-[#1E293B]/90 backdrop-blur px-4 py-3 rounded-2xl border border-white/10 text-white shadow-2xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#F97316] flex items-center justify-center">
                    <Maximize size={16} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Preview Active</span>
                </div>
                <div className="w-32 h-1 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full w-4/5 bg-[#F97316]" />
                </div>
              </div>

              <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur px-5 py-4 rounded-2xl shadow-2xl border border-slate-100 max-w-[200px]">
                <div className="text-[10px] font-black text-[#F97316] uppercase tracking-widest mb-1">Current Config</div>
                <div className="text-sm font-black text-[#1E293B]">Premium Cowhide <br /> Biker Silhouette</div>
              </div>
            </div>
            
            {/* Background Decor */}
            <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] border-2 border-dashed border-slate-200 rounded-full animate-spin-slow opacity-50" />
          </motion.div>
        </div>
      </section>

      {/* --- THE STUDIO ENGINE --- */}
      <section id="studio" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-[#F97316] text-[12px] font-black uppercase tracking-widest mb-4">The Customizer</h2>
            <h3 className="text-4xl font-black text-[#1E293B] mb-6 tracking-tight">Visualize Perfection.</h3>
            <p className="text-slate-500 font-medium">Our immersive engine allows you to swap materials, hardware, and styles with a single click, ensuring your jacket is exactly what you envisioned.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              { 
                icon: Monitor, 
                title: "Live Rendering", 
                desc: "High-fidelity visualization that reacts instantly to your design choices." 
              },
              { 
                icon: Palette, 
                title: "Material Library", 
                desc: "Choose from Premium Cowhide, Italian Lambskin, or Rugged Goatskin textures." 
              },
              { 
                icon: Cpu, 
                title: "Precision Fit", 
                desc: "Every customization is backed by anatomical data to guarantee a bespoke fit." 
              }
            ].map((feature, i) => (
              <div key={i} className="p-10 rounded-[2.5rem] bg-[#F8F9FA] border border-slate-100 hover:border-[#F97316] transition-all duration-500 group">
                <div className="w-14 h-14 bg-[#1E293B] text-[#F97316] rounded-2xl flex items-center justify-center mb-8 shadow-lg group-hover:bg-[#F97316] group-hover:text-white transition-all">
                  <feature.icon size={24} />
                </div>
                <h4 className="text-xl font-black text-[#1E293B] mb-4 tracking-tight">{feature.title}</h4>
                <p className="text-slate-500 leading-relaxed text-sm font-medium">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- SHOWCASE --- */}
      <section id="showcase" className="py-24 bg-[#F8F9FA]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
            <div>
              <h2 className="text-[#F97316] text-[12px] font-black uppercase tracking-widest mb-4">Trending Collections</h2>
              <h3 className="text-4xl font-black text-[#1E293B] tracking-tight">Ready to Order.</h3>
            </div>
            <button 
              onClick={() => router.push('/customer/shop')}
              className="px-8 py-3 bg-[#1E293B] hover:bg-[#F97316] text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg"
            >
              Shop All Collection
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {trendingProducts.slice(0, 4).map((product, idx) => (
              <motion.div 
                key={product.id}
                whileHover={{ y: -10 }}
                onClick={() => router.push(`/customer/shop/${product.id}`)}
                className="group cursor-pointer bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                  />
                </div>
                <div className="p-6">
                  <div className="text-[10px] font-black uppercase tracking-widest text-[#F97316] mb-1">{product.category}</div>
                  <h4 className="text-base font-black text-[#1E293B] mb-3 truncate">{product.name}</h4>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-black text-[#1E293B]">Rs. {Number(product.price).toLocaleString()}</span>
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#F97316] group-hover:text-white transition-all">
                      <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer id="craft" className="bg-[#1E293B] text-white pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-4 gap-16 mb-20">
            <div className="col-span-1 lg:col-span-2">
              <Link href="/" className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 flex items-center justify-center bg-white rounded-xl text-[#1E293B] font-black text-xl italic">S</div>
                <div className="text-xl font-black tracking-tighter">Stitch</div>
              </Link>
              <p className="text-slate-400 max-w-sm mb-8 leading-relaxed font-medium">
                The pinnacle of bespoke leather fashion. Handcrafted by master artisans, visualized by cutting-edge technology.
              </p>
              <div className="flex gap-4">
                {[Sparkles, Globe, ShieldCheck].map((Icon, i) => (
                  <div key={i} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-[#F97316] hover:border-[#F97316] transition-all cursor-pointer">
                    <Icon size={18} />
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-[11px] font-black uppercase tracking-widest text-[#F97316] mb-8">Studio</h4>
              <ul className="space-y-4 text-sm text-slate-400">
                <li><Link href="/customer/customize" className="hover:text-white">Design Studio</Link></li>
                <li><Link href="/customer/shop" className="hover:text-white">Collection</Link></li>
                <li><Link href="/customer/dashboard" className="hover:text-white">Account</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-[11px] font-black uppercase tracking-widest text-[#F97316] mb-8">Company</h4>
              <ul className="space-y-4 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white">Artisans</a></li>
                <li><a href="#" className="hover:text-white">Materials</a></li>
                <li><a href="#" className="hover:text-white">Support</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/5 pt-10 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <p>© 2026 STITCH BESPOKE STUDIOS. ALL RIGHTS RESERVED.</p>
            <div className="flex gap-8">
              <a href="#" className="hover:text-[#F97316]">Privacy Policy</a>
              <a href="#" className="hover:text-[#F97316]">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}