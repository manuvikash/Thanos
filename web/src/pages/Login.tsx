import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Thanos</h1>
                    <p className="text-muted-foreground">AWS Configuration Drift Detector</p>
                </div>
                <LoginForm />
            </div>
        </div>
    );
}
