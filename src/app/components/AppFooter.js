"use client";
import React from "react";
import Link from "next/link";
import { Facebook, Twitter, Instagram, Linkedin, Mail } from "lucide-react";
import Logo from './Logo';

/**
 * @file Footer.js
 * @description Global Footer component.
 * Contains site links, social media icons, and copyright info.
 */

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-slate-100 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Column */}
          <div className="space-y-6">
            <Link href="/" className="inline-block transition-transform hover:scale-105 duration-300">
              <div className="flex items-center gap-2 group">
                <div className="w-8 h-8 flex items-center justify-center bg-[#1E293B] rounded-lg overflow-hidden shadow-sm group-hover:shadow-orange-500/20 transition-all">
                  <span className="text-white font-black text-sm italic tracking-tighter">S</span>
                </div>
                <div className="text-lg font-black tracking-tighter flex items-center gap-0.5">
                  <span className="text-[#1E293B]">Stitch</span>
                </div>
              </div>
            </Link>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-xs">
              The leading platform for fashion design and manufacturing.
              Bring your creativity to life with professional-grade tools.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <SocialLink href="#" icon={Twitter} />
              <SocialLink href="#" icon={Facebook} />
              <SocialLink href="#" icon={Instagram} />
              <SocialLink href="#" icon={Linkedin} />
            </div>
          </div>

          {/* Links Column 1 */}
          <div>
            <h4 className="font-bold text-[var(--text-primary)] mb-6 uppercase tracking-wider text-xs">Company</h4>
            <ul className="space-y-3">
              <FooterLink href="#">About Us</FooterLink>
              <FooterLink href="#">Careers</FooterLink>
              <FooterLink href="#">Press & Media</FooterLink>
              <FooterLink href="/customer/support">Contact Support</FooterLink>
            </ul>
          </div>

          {/* Links Column 2 */}
          <div>
            <h4 className="font-bold text-[var(--text-primary)] mb-6 uppercase tracking-wider text-xs">Resources</h4>
            <ul className="space-y-3">
              <FooterLink href="#">Blog</FooterLink>
              <FooterLink href="#">Documentation</FooterLink>
              <FooterLink href="#">Community</FooterLink>
              <FooterLink href="#">Design Academy</FooterLink>
            </ul>
          </div>

          {/* Links Column 3 */}
          <div>
            <h4 className="font-bold text-[var(--text-primary)] mb-6 uppercase tracking-wider text-xs">Legal</h4>
            <ul className="space-y-3">
              <FooterLink href="#">Privacy Policy</FooterLink>
              <FooterLink href="#">Terms of Service</FooterLink>
              <FooterLink href="#">Cookie Policy</FooterLink>
              <FooterLink href="#">Acceptable Use</FooterLink>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-50 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest">
            © {currentYear} Stitch Commerce, Inc. Crafted with excellence.
          </p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse"></span>
              All systems operational
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }) {
  return (
    <li>
      <Link
        href={href}
        className="text-[var(--text-secondary)] hover:text-[var(--color-accent-orange)] transition-all text-sm font-medium hover:pl-1"
      >
        {children}
      </Link>
    </li>
  );
}

function SocialLink({ href, icon: Icon }) {
  return (
    <a
      href={href}
      className="w-9 h-9 rounded-xl bg-[var(--bg-accent)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--color-accent-orange)] hover:text-white transition-all transform hover:-translate-y-1 shadow-sm"
    >
      <Icon className="w-4 h-4" />
    </a>
  );
}