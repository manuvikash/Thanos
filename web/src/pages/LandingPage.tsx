import { Link } from 'react-router-dom'
import { ROUTES } from '../routes'
import { Shield, Search, FileText, Settings, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Button } from '../components/ui/button'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-7 w-7 text-cyan-500" />
            <span className="text-xl font-semibold">Thanos</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to={ROUTES.REGISTER}>
              <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 py-20 md:py-28">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
            AWS Compliance Monitoring
            <span className="block text-cyan-500 mt-2">Simplified</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Continuous security scanning and compliance validation for your AWS infrastructure. 
            Define golden configurations, detect drift, and maintain security posture.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Link to={ROUTES.REGISTER}>
              <Button size="lg" className="bg-cyan-500 hover:bg-cyan-600">
                Start Monitoring
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline">
                View Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Search className="h-6 w-6 text-cyan-500" />
              </div>
              <h3 className="text-lg font-semibold">Continuous Scanning</h3>
              <p className="text-sm text-muted-foreground">
                Automated resource discovery and security evaluation across your AWS accounts and regions.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-cyan-500" />
              </div>
              <h3 className="text-lg font-semibold">Compliance Rules</h3>
              <p className="text-sm text-muted-foreground">
                Define security policies and golden configurations. Track violations and drift from desired state.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Settings className="h-6 w-6 text-cyan-500" />
              </div>
              <h3 className="text-lg font-semibold">Configuration Management</h3>
              <p className="text-sm text-muted-foreground">
                Hierarchical config system with base templates, resource groups, and tenant-specific overrides.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">How It Works</h2>
          
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center font-semibold text-sm">
                1
              </div>
              <div>
                <h3 className="font-semibold mb-1">Connect Your AWS Account</h3>
                <p className="text-sm text-muted-foreground">
                  Deploy a CloudFormation stack to grant read-only access. Thanos assumes a role to scan your resources.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center font-semibold text-sm">
                2
              </div>
              <div>
                <h3 className="font-semibold mb-1">Define Compliance Rules</h3>
                <p className="text-sm text-muted-foreground">
                  Configure security policies and golden configurations for your resource types. Use built-in rules or create custom ones.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center font-semibold text-sm">
                3
              </div>
              <div>
                <h3 className="font-semibold mb-1">Run Scans & Monitor</h3>
                <p className="text-sm text-muted-foreground">
                  Trigger scans to evaluate resources against your rules. View findings, track compliance metrics, and identify drift.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Capabilities */}
      <section className="px-6 py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">Key Capabilities</h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            {[
              'AWS resource inventory and discovery',
              'Security finding detection and tracking',
              'Configuration drift monitoring',
              'Compliance rule engine with custom policies',
              'Multi-tenant support for MSPs',
              'RESTful API for automation',
              'MCP integration for AI assistants',
              'Hierarchical configuration system'
            ].map((feature, index) => (
              <div key={index} className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-cyan-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">Start Monitoring Your AWS Infrastructure</h2>
          <p className="text-lg text-muted-foreground">
            Connect your AWS account and run your first compliance scan in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Link to={ROUTES.REGISTER}>
              <Button size="lg" className="bg-cyan-500 hover:bg-cyan-600">
                Get Started Free
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-cyan-500" />
            <span className="font-semibold">Thanos</span>
          </div>
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Thanos. AWS Compliance Monitoring Platform.
          </div>
        </div>
      </footer>
    </div>
  )
}
