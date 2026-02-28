'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';

function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className={`theme-toggle ${className}`} aria-label="Переключить тему">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
        </svg>
      </button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      className={`theme-toggle ${className}`}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Переключить тему"
    >
      {isDark ? (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
        </svg>
      )}
    </button>
  );
}

export default function NotFound() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/parallax/3.1.0/parallax.min.js';
    script.onload = () => {
      const scene = document.getElementById('scene');
      if (scene && (window as any).Parallax) {
        new (window as any).Parallax(scene);
      }
    };
    document.body.appendChild(script);
  }, []);

  const isDark = resolvedTheme === 'dark';

  if (!mounted) return null;

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;600;700;800;900&family=Barlow:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <style jsx global>{`
        :root {
          --font-01: "Barlow", sans-serif;
          --font-02: "Barlow Condensed", sans-serif;
          --m-01: #FB8A8A;
          --m-02: #FFEDC0;
          --bg-01: #695681;
          --bg-02: #36184F;
          --bg-03: #32243E;
          --g-01: linear-gradient(90deg, #FFEDC0 0%, #FF9D87 100%);
          --g-02: linear-gradient(90deg, #8077EA 13.7%, #EB73FF 94.65%);
          --font-body: var(--font-01);
          --font-heading: var(--font-02);
        }

        :root.light {
          --bg-02: #f5f5f5;
          --bg-01: #e0e0e0;
        }

        * {
          margin: 0;
          padding: 0;
          list-style: none;
          border: 0;
          -webkit-tap-highlight-color: transparent;
          text-decoration: none;
          color: inherit;
        }

        body {
          margin: 0;
          padding: 0;
          height: 100vh;
          overflow: hidden;
          font-family: var(--font-body);
          background: var(--bg-02);
          color: white;
        }

        .theme-toggle {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 100;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.3);
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }
        
        .theme-toggle:hover {
          background: rgba(255,255,255,0.2);
          transform: scale(1.1);
        }

        :root.light .theme-toggle {
          border: 1px solid rgba(0,0,0,0.2);
          background: rgba(0,0,0,0.1);
          color: #333;
        }

        :root.light .theme-toggle:hover {
          background: rgba(0,0,0,0.2);
        }

        :root.light body {
          background: #f0f0f0;
          color: #333;
        }

        :root.light .wrapper .container .p404 {
          color: #333;
        }

        :root.light .wrapper .container .p404:nth-of-type(2) {
          color: #999;
        }

        :root.light .wrapper .container .text article p {
          color: #333;
          text-shadow: none;
        }

        :root.light .wrapper .container .circle:before {
          background-color: rgba(0, 0, 0, 0.05);
        }

        .wrapper {
          display: grid;
          grid-template-columns: 1fr;
          justify-content: center;
          align-items: center;
          height: 100vh;
          overflow-x: hidden;
          position: relative;
          z-index: 1;
        }

        .wrapper .container {
          margin: 0 auto;
          transition: all 0.4s ease;
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
        }

        .wrapper .container .scene {
          position: absolute;
          width: 100vw;
          height: 100vh;
          vertical-align: middle;
        }

        .wrapper .container .one,
        .wrapper .container .two,
        .wrapper .container .three,
        .wrapper .container .circle,
        .wrapper .container .p404 {
          width: 60%;
          height: 60%;
          top: 20% !important;
          left: 20% !important;
          min-width: 400px;
          min-height: 400px;
        }

        .wrapper .container .one .content,
        .wrapper .container .two .content,
        .wrapper .container .three .content,
        .wrapper .container .circle .content,
        .wrapper .container .p404 .content {
          width: 600px;
          height: 600px;
          display: flex;
          justify-content: center;
          align-items: center;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: content 0.8s cubic-bezier(1, 0.06, 0.25, 1) backwards;
        }

        @keyframes content {
          0% { width: 0; }
        }

        .wrapper .container .text {
          width: 60%;
          height: 40%;
          min-width: 400px;
          min-height: 500px;
          position: absolute;
          margin: 40px 0;
          animation: text 0.6s 1.8s ease backwards;
        }

        @keyframes text {
          0% { opacity: 0; transform: translateY(40px); }
        }

        .wrapper .container .text article {
          width: 400px;
          position: absolute;
          bottom: 0;
          z-index: 4;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          left: 50%;
          transform: translateX(-50%);
        }

        .wrapper .container .text article p {
          color: white;
          font-family: var(--font-02);
          font-size: 24px;
          font-weight: 500;
          letter-spacing: 0.6px;
          margin-bottom: 40px;
          text-transform: uppercase;
        }

        .wrapper .container .text article button {
          height: 50px;
          padding: 0 40px;
          border-radius: 50px;
          cursor: pointer;
          box-shadow: 0px 15px 20px rgba(0, 0, 0, 0.2);
          z-index: 3;
          background: var(--g-02);
          color: white;
          font-family: var(--font-02);
          text-transform: uppercase;
          font-weight: 700;
          font-size: 16px;
          letter-spacing: 2px;
          transition: all 0.3s ease;
          border: none;
        }

        .wrapper .container .text article button:hover {
          box-shadow: 0px 10px 10px -10px rgba(0, 0, 0, 0.3);
          transform: translateY(5px);
        }

        .wrapper .container .p404 {
          font-family: var(--font-02);
          font-size: 200px;
          font-weight: 700;
          letter-spacing: 4px;
          color: white;
          display: flex !important;
          justify-content: center;
          align-items: center;
          position: absolute;
          z-index: 2;
          animation: anime404 0.6s cubic-bezier(0.3, 0.8, 1, 1.05) both;
          animation-delay: 1.2s;
        }

        @media screen and (max-width: 799px) {
          .wrapper .container .p404 { font-size: 100px; }
        }

        @keyframes anime404 {
          0% { opacity: 0; transform: scale(10) skew(20deg, 20deg); }
        }

        .wrapper .container .p404:nth-of-type(2) {
          color: var(--bg-01);
          z-index: 1;
          animation-delay: 1s;
          filter: blur(10px);
          opacity: 0.5;
        }

        .wrapper .container .circle {
          position: absolute;
        }

        .wrapper .container .circle:before {
          content: "";
          position: absolute;
          width: 800px;
          height: 800px;
          background-color: rgba(255, 255, 255, 0.03);
          border-radius: 100%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          box-shadow: inset 5px 20px 40px rgba(0, 0, 0, 0.2), 
                      inset 5px 0px 5px rgba(0, 0, 0, 0.1), 
                      inset 5px 5px 20px rgba(0, 0, 0, 0.1), 
                      2px 2px 5px rgba(255, 255, 255, 0.05);
          animation: circle 0.8s cubic-bezier(1, 0.06, 0.25, 1) backwards;
        }

        @keyframes circle {
          0% { width: 0; height: 0; }
        }

        .wrapper .container .one .content .piece {
          width: 80px;
          height: 80px;
          position: absolute;
          display: block;
          top: 0;
          bottom: 0;
          left: 0;
          right: 0;
          background: var(--g-01);
          border-radius: 50%;
          animation: jump 2s ease-in-out infinite;
        }

        .wrapper .container .one .content .piece:nth-child(1) { top: 15%; left: 20%; animation-delay: 0.25s; }
        .wrapper .container .one .content .piece:nth-child(2) { top: 55%; left: 55%; animation-delay: 0.5s; }
        .wrapper .container .one .content .piece:nth-child(3) { top: 35%; left: 70%; animation-delay: 0.75s; }

        .wrapper .container .two .content .piece {
          width: 80px;
          height: 80px;
          position: absolute;
          display: block;
          top: 0;
          bottom: 0;
          left: 0;
          right: 0;
          background: var(--g-02);
          border-radius: 50%;
          animation: jump 2s ease-in-out infinite;
        }

        .wrapper .container .two .content .piece:nth-child(1) { top: 10%; left: 55%; animation-delay: 0.25s; }
        .wrapper .container .two .content .piece:nth-child(2) { top: 50%; left: 15%; animation-delay: 0.5s; }
        .wrapper .container .two .content .piece:nth-child(3) { top: 70%; left: 60%; animation-delay: 0.75s; }

        .wrapper .container .three .content .piece {
          width: 80px;
          height: 80px;
          position: absolute;
          display: block;
          top: 0;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          border-radius: 50%;
          animation: jump 2s ease-in-out infinite;
          opacity: 0.3;
        }

        .wrapper .container .three .content .piece:nth-child(1) { top: 20%; left: 25%; animation-delay: 0.25s; }
        .wrapper .container .three .content .piece:nth-child(2) { top: 60%; left: 65%; animation-delay: 0.5s; }
        .wrapper .container .three .content .piece:nth-child(3) { top: 40%; left: 45%; animation-delay: 0.75s; }

        @keyframes jump {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }

        @media screen and (max-width: 799px) {
          .wrapper .container .one .content .piece,
          .wrapper .container .two .content .piece,
          .wrapper .container .three .content .piece {
            width: 50px;
            height: 50px;
          }
          .wrapper .container .text article p {
            font-size: 18px;
          }
        }
      `}</style>

      <ThemeToggle />

      <div className="wrapper">
        <div className="container">
          <div id="scene" className="scene">
            <div className="one" data-depth="0.2">
              <div className="content">
                <span className="piece"></span>
                <span className="piece"></span>
                <span className="piece"></span>
              </div>
            </div>
            <div className="two" data-depth="0.6">
              <div className="content">
                <span className="piece"></span>
                <span className="piece"></span>
                <span className="piece"></span>
              </div>
            </div>
            <div className="three" data-depth="0.1">
              <div className="content">
                <span className="piece"></span>
                <span className="piece"></span>
                <span className="piece"></span>
              </div>
            </div>
            <div className="circle" data-depth="0.4">
              <div className="content"></div>
            </div>
            <p className="p404" data-depth="0.2">404</p>
            <p className="p404" data-depth="0.1">404</p>
          </div>
          <div className="text">
            <article>
              <p>Ой! Похоже, ты заблудился.</p>
              <Link href="/">
                <button>Вернуться домой</button>
              </Link>
            </article>
          </div>
        </div>
      </div>
    </>
  );
}
