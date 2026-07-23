import { History, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RevisionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Révisions (SRS)</h1>
        <p className="text-muted-foreground mt-2">
          La répétition espacée (Spaced Repetition System) garantit que vous n'oublierez jamais ce que vous avez appris.
        </p>
      </div>

      <Card className="max-w-2xl mx-auto text-center py-12">
        <CardContent className="space-y-6">
          <div className="mx-auto bg-cat-amber/10 w-20 h-20 rounded-full flex items-center justify-center">
            <History className="h-10 w-10 text-cat-amber" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold">4 cartes à réviser aujourd&apos;hui</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Ces éléments sont sur le point d&apos;être oubliés selon notre algorithme. Révisez-les maintenant pour consolider votre mémoire à long terme.
            </p>
          </div>

          <Button size="lg" className="mt-4 gap-2 px-8 bg-cat-amber text-white hover:bg-cat-amber/90">
            <Play className="h-4 w-4" />
            Démarrer la session de révision
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
