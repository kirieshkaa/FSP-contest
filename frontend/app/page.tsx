"use client";
import dynamic from 'next/dynamic';
const LoginWrapper = dynamic(() => import('./login/page'), { ssr: false });

export default function Page() {
  return <LoginWrapper />;
}
