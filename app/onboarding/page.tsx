"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, User } from 'lucide-react';
import { useStackApp } from '@stackframe/stack';

interface UsernameCheck {
  available: boolean;
  message: string;
}

export default function OnboardingPage() {
  const [username, setUsername] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameCheck | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const app = useStackApp();

  const debouncedUsername = useDebounce(username, 500);

  // Check if user already has a username
  useEffect(() => {
    const checkExistingUsername = async () => {
      const user = await app.getUser();
      if (user) {
        const usernameInMetadata = user.clientMetadata?.username;
        if (usernameInMetadata && usernameInMetadata.trim() !== '') {
          // User already has a username, redirect to home
          router.push('/');
        }
      }
    };
    checkExistingUsername();
  }, [app, router]);

  // Check username availability when debounced value changes
  useEffect(() => {
    if (debouncedUsername && debouncedUsername.length >= 3) {
      checkUsernameAvailability(debouncedUsername);
    } else {
      setUsernameStatus(null);
    }
  }, [debouncedUsername]);

  const checkUsernameAvailability = async (usernameToCheck: string) => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/check-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: usernameToCheck }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setUsernameStatus(data);
      } else {
        setUsernameStatus({
          available: false,
          message: data.error || 'Error checking username'
        });
      }
    } catch (err) {
      setUsernameStatus({
        available: false,
        message: 'Error checking username'
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!usernameStatus?.available) {
      setError('Please choose an available username');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Get the current user from Stack
      const user = await app.getUser();
      if (!user) {
        setError('You must be logged in to create a username');
        return;
      }
      
      const response = await fetch('/api/create-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username: username,
          stackUserId: user.id
        }),
      });

      if (response.ok) {
        router.push('/');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create username. Please try again.');
      }
    } catch (err) {
      setError('Failed to create profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValidUsername = (username: string) => {
    const regex = /^[a-zA-Z0-9_-]{3,20}$/;
    return regex.test(username);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-primary rounded-full flex items-center justify-center mb-4">
            <User className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Choose Your Username</h1>
          <p className="mt-2 text-sm text-gray-600">
            This will be your unique identity in the Nollywood Film Club
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Your Profile</CardTitle>
            <CardDescription>
              Choose a username that represents you in the community
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`pr-10 ${
                      usernameStatus?.available === true
                        ? 'border-green-500 focus:border-green-500'
                        : usernameStatus?.available === false
                        ? 'border-red-500 focus:border-red-500'
                        : ''
                    }`}
                    disabled={isSubmitting}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {isChecking ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    ) : usernameStatus?.available === true ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : usernameStatus?.available === false ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : null}
                  </div>
                </div>

                {/* Username validation feedback */}
                {username && (
                  <div className="text-sm">
                    {!isValidUsername(username) && username.length > 0 && (
                      <p className="text-red-500">
                        Username must be 3-20 characters long and contain only letters, numbers, underscores, and hyphens
                      </p>
                    )}
                    {isValidUsername(username) && usernameStatus && (
                      <p className={usernameStatus.available ? 'text-green-500' : 'text-red-500'}>
                        {usernameStatus.message}
                      </p>
                    )}
                    {isValidUsername(username) && !usernameStatus && !isChecking && (
                      <p className="text-gray-500">Checking availability...</p>
                    )}
                  </div>
                )}

                {/* Username requirements */}
                <div className="text-xs text-gray-500 space-y-1">
                  <p>• 3-20 characters long</p>
                  <p>• Letters, numbers, underscores, and hyphens only</p>
                  <p>• Must be unique</p>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={!usernameStatus?.available || isSubmitting || isChecking}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Setup
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            You can change your username later in your profile settings
          </p>
        </div>
      </div>
    </div>
  );
}
