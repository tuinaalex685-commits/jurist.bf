"use client"

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { Book, ChevronRight, Search, Filter } from "lucide-react";
import { MOCK_LEGAL_CODES, MOCK_COUNTRY } from "@/lib/mock-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function LibraryPage() {
  return (
    <div className="space-y-8 pb-12">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="pt-4 space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight">Bibliothèque Juridique</h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Sélectionnez un code pour commencer ou reprendre votre apprentissage. Tout le droit burkinabè à portée de clic.
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input placeholder="Rechercher un code ou un article..." className="pl-10 h-12 text-base bg-card/50" />
        </div>
        <Button variant="outline" size="lg" className="h-12 gap-2 border-border/50 bg-card/50">
          <Filter className="h-4 w-4" />
          Filtrer par domaine
        </Button>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {MOCK_LEGAL_CODES.map((code) => (
          <motion.div variants={item} key={code.id}>
            <Link href={`/library/${code.id}`}>
              <Card className="h-full hover:border-accent/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer bg-card/50 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10 group-hover:bg-primary/10 transition-colors"></div>
                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-none font-semibold">
                      {MOCK_COUNTRY.name}
                    </Badge>
                    <Book className="h-5 w-5 text-muted-foreground group-hover:text-accent transition-colors" />
                  </div>
                  <CardTitle className="text-2xl font-bold leading-tight group-hover:text-primary transition-colors">{code.name}</CardTitle>
                  <CardDescription className="line-clamp-2 mt-2 text-base">
                    {code.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 mt-2">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-muted-foreground">Progression</span>
                        <span className="text-primary font-bold">12%</span>
                      </div>
                      <Progress value={12} className="h-2 bg-muted/50" />
                    </div>
                    
                    <div className="flex items-center text-sm font-bold text-accent uppercase tracking-wider pt-2 border-t border-border/50">
                      Explorer le code
                      <ChevronRight className="ml-1 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
