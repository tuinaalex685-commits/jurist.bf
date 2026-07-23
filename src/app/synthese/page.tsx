import { BrainCircuit, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function SynthesePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Synthèse Globale (Phase 4)</h1>
        <p className="text-muted-foreground mt-2">
          Testez votre capacité à mobiliser plusieurs concepts juridiques simultanément face à des cas complexes.
        </p>
      </div>

      <Card className="max-w-2xl mx-auto text-center py-12">
        <CardContent className="space-y-6">
          <div className="mx-auto bg-cat-violet/10 w-20 h-20 rounded-full flex items-center justify-center">
            <BrainCircuit className="h-10 w-10 text-cat-violet" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Examen de consolidation débloqué</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Vous avez maîtrisé suffisamment d&apos;articles (12) pour débloquer un examen de synthèse. Cet examen mélangera les notions pour tester vos réflexes réels.
            </p>
          </div>

          <Button size="lg" className="mt-4 gap-2 px-8 bg-cat-violet text-white hover:bg-cat-violet/90">
            <Play className="h-4 w-4" />
            Lancer l&apos;examen (20 min)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
