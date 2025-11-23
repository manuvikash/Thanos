import { useState } from 'react';
import { signIn, confirmSignIn } from 'aws-amplify/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/routes';

export function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [newPasswordRequired, setNewPasswordRequired] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (newPasswordRequired) {
                const { isSignedIn } = await confirmSignIn({ challengeResponse: newPassword });
                if (isSignedIn) {
                    navigate(ROUTES.DASHBOARD);
                }
            } else {
                const { isSignedIn, nextStep } = await signIn({ username: email, password });

                if (isSignedIn) {
                    navigate(ROUTES.DASHBOARD);
                } else if (nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
                    setNewPasswordRequired(true);
                    setError('');
                }
            }
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader>
                <CardTitle>{newPasswordRequired ? 'Set New Password' : 'Admin Login'}</CardTitle>
                <CardDescription>
                    {newPasswordRequired
                        ? 'Please set a new password for your account'
                        : 'Enter your credentials to access the dashboard'}
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {!newPasswordRequired ? (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="admin@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </>
                    ) : (
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                                id="newPassword"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={8}
                            />
                            <div className="text-xs text-muted-foreground">
                                Password requirements:
                                <ul className="list-disc list-inside mt-1 space-y-0.5">
                                    <li>At least 8 characters</li>
                                    <li>At least 1 number</li>
                                    <li>At least 1 special character</li>
                                    <li>At least 1 uppercase letter</li>
                                    <li>At least 1 lowercase letter</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {newPasswordRequired ? 'Set Password' : 'Sign In'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
