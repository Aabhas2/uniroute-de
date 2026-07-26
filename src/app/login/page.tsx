'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { User, Mail, Lock, ShieldAlert, LogIn, UserPlus, GraduationCap, BookOpen, Globe2, ArrowLeft } from 'lucide-react'
import { migrateLocalDataToCloud } from '@/lib/migration'
import { defaultSettings } from '@/contexts/ThemeContext'
import { auth } from '@/lib/firebase'

// Maps Firebase auth error codes to friendly messages
const getFriendlyError = (err: any): string => {
  const code: string = err?.code || ''
  if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential')
    return 'Incorrect email or password. Please try again.'
  if (code === 'auth/email-already-in-use')
    return 'An account with this email already exists. Try logging in instead.'
  if (code === 'auth/weak-password')
    return 'Password must be at least 6 characters long.'
  if (code === 'auth/invalid-email')
    return 'Please enter a valid email address.'
  if (code === 'auth/too-many-requests')
    return 'Too many failed attempts. Please wait a few minutes and try again.'
  if (code === 'auth/network-request-failed')
    return 'Network error. Please check your internet connection.'
  if (code === 'auth/popup-closed-by-user')
    return 'Google sign-in was cancelled. Please try again.'
  return err?.message || 'Authentication failed. Please try again.'
}

export default function LoginPage() {
  const router = useRouter()
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth()

  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  // Redirect if already logged in — wait until Firebase auth has resolved
  useEffect(() => {
    if (!loading) {
      if (user) {
        // Already authenticated — send straight to dashboard
        router.replace('/dashboard')
      } else {
        // Not logged in — safe to show the login form
        setAuthChecked(true)
      }
    }
  }, [user, loading, router])

  const triggerMigrationAfterLogin = async () => {
    const currentUser = auth.currentUser
    if (!currentUser) return
    try {
      await migrateLocalDataToCloud(currentUser.uid)
    } catch (err) {
      console.error('Error migrating local data to cloud:', err)
    }
  }

  // Show spinner while Firebase resolves auth state
  if (loading || !authChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Checking session…</p>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setAuthLoading(true)
    try {
      if (isSignUp) {
        if (!name.trim()) throw new Error('Please enter your name.')
        if (password.length < 6) throw new Error('Password must be at least 6 characters long.')
        await signUpWithEmail(email, password, name)
      } else {
        await signInWithEmail(email, password)
      }
      await triggerMigrationAfterLogin()
      router.replace('/dashboard')
    } catch (err: any) {
      setError(getFriendlyError(err))
    } finally {
      setAuthLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setAuthLoading(true)
    try {
      await signInWithGoogle()
      await triggerMigrationAfterLogin()
      router.replace('/dashboard')
    } catch (err: any) {
      setError(getFriendlyError(err))
    } finally {
      setAuthLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-accent/60 flex-col items-center justify-center p-12">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-black/10 rounded-full translate-y-40 -translate-x-20" />
        <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-accent/20 rounded-full blur-xl" />

        <div className="relative z-10 text-center space-y-8">
          {/* Logo area */}
          <div className="flex flex-col items-center -space-y-4">
            <Image 
              src="/uni_transparentbg.png" 
              alt="UniRoute DE" 
              width={600} 
              height={200} 
              className="h-52 sm:h-64 w-auto object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)] scale-110" 
              priority
            />
            <p className="text-white/90 text-xs font-bold tracking-widest uppercase bg-black/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 shadow-sm relative z-20">
              Study Abroad Planner 🇩🇪
            </p>
          </div>

          {/* Feature highlights */}
          <div className="space-y-4 text-left max-w-xs">
            {[
              { icon: BookOpen,  label: 'Track Applications',    desc: 'Manage university applications and deadlines' },
              { icon: Globe2,    label: 'Plan Your Journey',     desc: 'Visa, finance, exams — all in one place' },
              { icon: GraduationCap, label: 'Stay Organized',   desc: 'Tasks, notes, and scholarship tracking' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{label}</p>
                  <p className="text-white/60 text-xs leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-white/40 text-xs">Designed for international students worldwide.</p>
        </div>
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo + back link */}
          <div className="flex items-center justify-between">
            <div className="lg:hidden flex items-center gap-2">
              <Image
                src="/uni_transparentbg.png"
                alt="UniRoute DE"
                width={160}
                height={50}
                className="h-10 w-auto object-contain"
                priority
              />
            </div>
            <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors ml-auto">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to home
            </Link>
          </div>

          {/* Heading */}
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-muted-foreground text-sm mt-1.5">
              {isSignUp
                ? 'Start planning your study abroad journey'
                : 'Sign in to access your dashboard'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-danger/10 text-danger px-4 py-3 rounded-lg text-sm border border-danger/20">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1.5">
                <label className="input-label">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="input-field pl-10"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="input-label">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-field pl-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="input-label">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-10"
                />
              </div>
              {isSignUp && (
                <p className="text-xs text-muted-foreground">Must be at least 6 characters.</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={authLoading}
              className="w-full justify-center py-2.5 mt-2"
            >
              {authLoading ? (
                <div className="w-4 h-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              ) : isSignUp ? (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Account
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Log In
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          {/* Google Sign In */}
          <Button
            type="button"
            variant="outline"
            disabled={authLoading}
            onClick={handleGoogleSignIn}
            className="w-full justify-center py-2.5"
          >
            <svg className="h-4 w-4 mr-2.5" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5.04c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 1.74 14.96 1 12 1 7.42 1 3.53 3.63 1.67 7.43l3.86 3C6.46 7.37 9 5.04 12 5.04z" />
              <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.73 2.89c2.18-2.01 3.7-4.99 3.7-8.62z" />
              <path fill="#FBBC05" d="M5.53 14.28c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28L1.67 6.72C.61 8.87 0 11.36 0 14s.61 5.13 1.67 7.28l3.86-3z" />
              <path fill="#34A853" d="M12 23c3.24 0 5.97-1.09 7.96-2.93l-3.73-2.89c-1.1.74-2.5 1.18-4.23 1.18-3 0-5.54-2.33-6.47-5.39L1.67 16C3.53 19.8 7.42 22.4 12 22.4z" />
            </svg>
            Sign in with Google
          </Button>

          {/* Toggle sign-in / sign-up */}
          <p className="text-center text-sm text-muted-foreground">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError('') }}
              className="text-primary font-semibold hover:underline focus:outline-none"
            >
              {isSignUp ? 'Log In' : 'Sign Up'}
            </button>
          </p>

          {/* Guest link */}
          <div className="text-center">
            <Link
              href="/dashboard"
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
            >
              Continue without an account (data saved locally)
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
