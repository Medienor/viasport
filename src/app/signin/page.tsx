"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import { CheckCircleIcon } from '@heroicons/react/24/solid'; // For benefits list

// Example Google Icon SVG component (replace with your preferred icon library or SVG)
const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-2" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
    <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 109.8 512 0 402.2 0 256S109.8 0 244 0c73 0 135.3 29.7 181.4 78.6l-62.8 61.7c-23.4-22-54-35.7-90.6-35.7-69.7 0-126.6 56.9-126.6 127s56.9 127 126.6 127c76.1 0 104.4-54.7 108.1-82.7H244v-77h236.1c2.3 12.7 3.9 26.4 3.9 40.8z"></path>
  </svg>
);


export default function SignInPage() {
  const { session, isLoading, signInWithGoogle } = useAuth();
  const router = useRouter();

  // Redirect if user is already logged in
  useEffect(() => {
    if (!isLoading && session) {
      router.push('/'); // Redirect to homepage or dashboard
    }
  }, [session, isLoading, router]);

  const handleGoogleSignIn = async () => {
    // No need to check isLoading here, signInWithGoogle handles it
    await signInWithGoogle();
    // Supabase handles the redirect flow
  };

  // Prevent rendering the sign-in options while loading or if logged in
  if (isLoading || session) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        {/* Optional: Add a spinner */}
        <p>Laster...</p>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-10rem)] bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 md:p-10 rounded-lg shadow-md">
        <div>
          <Image
            className="mx-auto h-12 w-auto"
            src="/blacklogo.svg" // Make sure this path is correct
            alt="ViaSport Logo"
            width={192} // Adjust width as needed
            height={48} // Adjust height as needed
          />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Logg inn eller registrer deg
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Få tilgang til flere funksjoner!
          </p>
        </div>

        {/* Benefits Section */}
        <div className="mt-8 space-y-4">
           <h3 className="text-lg font-medium text-gray-900">Fordeler med konto:</h3>
           <ul className="space-y-2">
             <li className="flex items-start">
               <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500 mr-2 mt-0.5" />
               <span className="text-sm text-gray-700">Lagre favorittlag og ligaer (kommer snart!)</span>
             </li>
             <li className="flex items-start">
               <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500 mr-2 mt-0.5" />
               <span className="text-sm text-gray-700">Motta varsler om kampstart og mål (kommer snart!)</span>
             </li>
              <li className="flex items-start">
               <CheckCircleIcon className="flex-shrink-0 h-5 w-5 text-green-500 mr-2 mt-0.5" />
               <span className="text-sm text-gray-700">Synkroniser innstillinger på tvers av enheter (kommer snart!)</span>
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
              className="w-full inline-flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
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