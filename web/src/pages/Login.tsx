import { LoginForm } from '@/components/auth/LoginForm';
import { Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/routes';

export default function LoginPage() {
    return (
        <div className="relative min-h-screen flex items-center justify-center bg-background p-4 overflow-x-hidden">
            {/* Background Gradient */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                <div className="mb-8 text-center">
                    <Link to={ROUTES.ROOT} className="inline-flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity">
                        <Shield className="h-10 w-10 text-cyan-400" />
                        <h1 className="text-3xl font-bold tracking-tight font-mono-custom">Thanos</h1>
                    </Link>
                    <p className="text-muted-foreground">Cloud Security & Compliance Platform</p>
                </div>
                <LoginForm />
                <div className="mt-6 text-center">
                    <Link to={ROUTES.ROOT} className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                        ← Back to home
                    </Link>
                </div>
            </div>
        </div>
    );
}
