"use client"

import { useState } from 'react';

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false); // Reset success state on new submission
    
    // Simulate API call
    try {
      // In a real app, you would send the form data to your backend
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSubmitSuccess(true);
      setFormData({ // Clear form on success
        name: '',
        email: '',
        subject: '',
        message: ''
      });
    } catch (err) {
      setSubmitError('Det oppstod en feil ved sending av skjemaet. Vennligst prøv igjen senere.');
      console.error('Form submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {submitSuccess ? (
        // Adjusted dark mode success message styles
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center mb-6 dark:bg-green-900/30 dark:border-green-700"> 
          <h3 className="text-lg font-medium text-green-800 dark:text-green-200 mb-2">Takk for din henvendelse!</h3> 
          <p className="text-green-700 dark:text-green-300 mb-4"> 
            Vi har mottatt din melding og vil svare deg så snart som mulig.
          </p>
          {/* Button to allow sending another message - Adjusted dark styles */}
          <button
            onClick={() => setSubmitSuccess(false)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300 dark:focus:ring-gray-400 dark:focus:ring-offset-dark-main"
          >
            Send en ny melding
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {submitError && (
            // Adjusted dark mode error message styles
            <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/30"> 
              <div className="flex">
                <div className="flex-shrink-0">
                  {/* Adjusted dark mode icon color */}
                  <svg className="h-5 w-5 text-red-400 dark:text-red-500" viewBox="0 0 20 20" fill="currentColor"> 
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  {/* Adjusted dark mode text color */}
                  <p className="text-sm text-red-700 dark:text-red-300">{submitError}</p> 
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-8">
            <div>
              {/* Adjusted dark mode label text */}
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300"> 
                Navn
              </label>
              <div className="mt-1">
                {/* Adjusted dark mode input styles */}
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="py-3 px-4 block w-full shadow-sm rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-[#222222] dark:border-dark-border dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-blue-500 dark:focus:ring-blue-500"
                  placeholder="Ditt fulle navn"
                />
              </div>
            </div>
            
            <div>
              {/* Adjusted dark mode label text */}
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300"> 
                E-post
              </label>
              <div className="mt-1">
                {/* Adjusted dark mode input styles */}
                <input
                  type="email"
                  name="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="py-3 px-4 block w-full shadow-sm rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-[#222222] dark:border-dark-border dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-blue-500 dark:focus:ring-blue-500"
                  placeholder="din.epost@eksempel.no"
                />
              </div>
            </div>
            
            <div className="sm:col-span-2">
              {/* Adjusted dark mode label text */}
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300"> 
                Emne
              </label>
              <div className="mt-1">
                {/* Adjusted dark mode select styles */}
                {/* Note: Styling select dropdown arrows consistently across browsers is tricky. This provides basic dark mode styling. */}
                <select
                  id="subject"
                  name="subject"
                  required
                  value={formData.subject}
                  onChange={handleChange}
                  className="py-3 px-4 block w-full shadow-sm rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-[#222222] dark:border-dark-border dark:text-gray-100 dark:focus:border-blue-500 dark:focus:ring-blue-500"
                >
                  <option value="">Velg et emne</option>
                  <option value="general">Generell henvendelse</option>
                  <option value="support">Teknisk support</option>
                  <option value="feedback">Tilbakemelding</option>
                  <option value="partnership">Samarbeid</option>
                  <option value="other">Annet</option>
                </select>
              </div>
            </div>
            
            <div className="sm:col-span-2">
              {/* Adjusted dark mode label text */}
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300"> 
                Melding
              </label>
              <div className="mt-1">
                {/* Adjusted dark mode textarea styles */}
                <textarea
                  id="message"
                  name="message"
                  rows={6}
                  required
                  value={formData.message}
                  onChange={handleChange}
                  className="py-3 px-4 block w-full shadow-sm rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-[#222222] dark:border-dark-border dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-blue-500 dark:focus:ring-blue-500"
                  placeholder="Skriv din melding her..."
                />
              </div>
            </div>
          </div>
          
          <div className="sm:col-span-2">
            {/* Adjusted dark mode button styles */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium 
                          text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 
                          dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300 dark:focus:ring-gray-400 dark:focus:ring-offset-dark-main
                          disabled:opacity-50 dark:disabled:opacity-60 transition-colors duration-200 ${isSubmitting ? 'cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? (
                <>
                  {/* Adjusted spinner color for dark button */}
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> 
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sender...
                </>
              ) : (
                'Send melding'
              )}
            </button>
          </div>
        </form>
      )}
    </>
  );
} 