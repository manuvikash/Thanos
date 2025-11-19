import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ScanProgressProps {
  progress: number;
  description?: string;
}

export function ScanProgress({ progress, description }: ScanProgressProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Scanning Resources</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Progress value={progress} className="h-2" />
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {description || `${Math.round(progress)}% complete`}
          </p>
          <span className="text-sm font-medium">{Math.round(progress)}%</span>
        </div>
      </CardContent>
    </Card>
  );
}
