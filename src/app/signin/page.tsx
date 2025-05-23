"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import { CheckCircleIcon } from '@heroicons/react/24/solid'; // For benefits list

// Improved Google Icon component
const GoogleIcon = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 48 48" 
    width="20px" 
    height="20px" 
    className="mr-2"
  >
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
  </svg>
);

export default function SignInPage() {
  const { session, isLoading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Check for dark mode on initial load and when theme changes
  useEffect(() => {
    // Check initial dark mode state
    if (typeof window !== 'undefined') {
      // Check for dark class on html element (for Tailwind dark mode)
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
      
      // Set up an observer to detect theme changes
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'class') {
            const isDark = document.documentElement.classList.contains('dark');
            setIsDarkMode(isDark);
          }
        });
      });
      
      observer.observe(document.documentElement, { attributes: true });
      
      return () => observer.disconnect();
    }
  }, []);

  // Redirect if user is already logged in
  useEffect(() => {
    if (!isLoading && session) {
      router.push('/'); // Redirect to homepage or dashboard
    }
  }, [session, isLoading, router]);

  const handleGoogleSignIn = async () => {
    try {
      // Get the current hostname to use for redirect
      const redirectTo = typeof window !== 'undefined' 
        ? `${window.location.origin}/` 
        : 'https://viasport.no/';
        
      await signInWithGoogle({ redirectTo });
    } catch (error) {
      console.error("Google sign-in error:", error);
    }
  };

  // Prevent rendering the sign-in options while loading or if logged in
  if (isLoading || session) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)] bg-dark-main">
        {/* Optional: Add a spinner */}
        <p className="text-gray-200">Laster...</p>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-10rem)] bg-gray-50 dark:bg-dark-main py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-dark-nav p-8 md:p-10 rounded-lg shadow-md border dark:border-dark-border">
        <div>
          <Image
            className="mx-auto h-12 w-auto"
            src={isDarkMode ? "/whitelogo.svg" : "/blacklogo.svg"}
            alt="ViaSport Logo"
            width={192}
            height={48}
          />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Logg inn eller registrer deg
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-300">
            Få tilgang til flere funksjoner!
          </p>
        </div>

        {/* Benefits Section */}
        <div className="mt-8 space-y-4">
           <h3 className="text-lg font-medium text-gray-900 dark:text-white">Fordeler med konto:</h3>
           <ul className="space-y-2">
             <li className="flex items-start">
               <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500 mr-2 mt-0.5" />
               <span className="text-sm text-gray-700 dark:text-gray-300">Lagre favorittlag og ligaer (kommer snart!)</span>
             </li>
             <li className="flex items-start">
               <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500 mr-2 mt-0.5" />
               <span className="text-sm text-gray-700 dark:text-gray-300">Motta varsler om kampstart og mål (kommer snart!)</span>
             </li>
              <li className="flex items-start">
               <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500 mr-2 mt-0.5" />
               <span className="text-sm text-gray-700 dark:text-gray-300">Synkroniser innstillinger på tvers av enheter (kommer snart!)</span>
             </li>
           </ul>
        </div>

        {/* Sign In Options */}
        <div className="mt-8 space-y-6">
          {/* Add tabs here later if needed for email/password vs social */}
          <div>
            <button
              onClick={handleGoogleSignIn}
              type="button"
              className="w-full inline-flex justify-center items-center py-2 px-4 border border-gray-300 dark:border-dark-border rounded-md shadow-sm bg-white dark:bg-dark-nav text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 transition duration-150 ease-in-out"
            >
              <GoogleIcon />
              Fortsett med Google
            </button>
          </div>

          {/* Placeholder for Email/Password form */}
          {/*
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-2 bg-white text-sm text-gray-500">Eller</span>
            </div>
          </div>
          <div>
             <p className="text-center text-sm text-gray-600">
               E-post innlogging kommer snart.
             </p>
          </div>
          */}

        </div>
      </div>
    </div>
  );
} 