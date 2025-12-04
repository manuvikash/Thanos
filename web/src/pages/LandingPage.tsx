import { Link } from 'react-router-dom'
import { Shield, ArrowRight, Zap, Lock, BarChart3 } from 'lucide-react'
import { Button } from '../components/ui/button'
import { BackgroundSphere } from '../components/BackgroundSphere'

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-background overflow-hidden selection:bg-cyan-500/20">
      <BackgroundSphere />
      
      {/* Navigation */}
      <nav className="relative z-50 border-b border-border/40 bg-background/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500 blur-lg opacity-20 rounded-full"></div>
              <Shield className="relative h-6 w-6 text-cyan-500" />
            </div>
            <span className="text-lg font-bold tracking-tight">Thanos</span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10">
        <section className="pt-20 pb-32 md:pt-32 md:pb-48 px-6">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            
            {/* Badge */}
            <div className="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm font-medium text-cyan-500 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <span className="flex h-2 w-2 rounded-full bg-cyan-500 mr-2 animate-pulse"></span>
              v2.0 Now Available
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-foreground animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
              Cloud Security <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
                Reimagined
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
              Continuous compliance, drift detection, and automated remediation for your AWS infrastructure. 
              Stop chasing alerts. Start fixing problems.
            </p>

            <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
              <Link to="/login">
                <Button size="lg" className="h-14 px-8 text-lg bg-cyan-500 hover:bg-cyan-600 shadow-lg shadow-cyan-500/25 transition-all hover:scale-105">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>

            {/* Social Proof / Trust Indicators */}
            <div className="pt-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center opacity-60 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
              {[
                { label: 'Setup Time', value: '< 5 Mins' },
                { label: 'AWS Coverage', value: '100%' },
                { label: 'Drift Detection', value: 'Real-time' },
                { label: 'MCP Integration', value: 'AI Ready' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Grid (Minimal) */}
        <section className="px-6 pb-24">
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: "Real-time Scanning",
                description: "Detect misconfigurations and vulnerabilities instantly as they appear in your environment."
              },
              {
                icon: Lock,
                title: "Automated Compliance",
                description: "Map resources to compliance frameworks like SOC2, HIPAA, and PCI-DSS automatically."
              },
              {
                icon: BarChart3,
                title: "Drift Detection",
                description: "Track infrastructure changes over time and alert on unauthorized modifications."
              }
            ].map((feature, i) => (
              <div key={i} className="group p-8 rounded-2xl bg-card/30 border border-border/50 hover:bg-card/50 hover:border-cyan-500/30 transition-all duration-300">
                <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="h-6 w-6 text-cyan-500" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-background/50 backdrop-blur-sm py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 opacity-60">
            <Shield className="h-5 w-5" />
            <span className="font-semibold">Thanos</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 Thanos Security. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

