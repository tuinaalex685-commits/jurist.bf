"use client"

import Link from "next/link";
import { use } from "react";
import { motion, type Variants } from "framer-motion";
import { ArrowLeft, FileText, CheckCircle2, Circle } from "lucide-react";
import { MOCK_LEGAL_CODES, MOCK_ARTICLE } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item: Variants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function CodePage(props: { params: Promise<{ codeId: string }> }) {
  const params = use(props.params);
  const code = MOCK_LEGAL_CODES.find((c) => c.id === params.codeId) || MOCK_LEGAL_CODES[0];
  
  // Dans un vrai cas, on filtrerait les articles par codeId
  // Ici on mock avec l'unique article de démo + un factice pour montrer l'état
  const articles = [
    { ...MOCK_ARTICLE, status: "in_progress" },
    { ...MOCK_ARTICLE, id: "art-1382", number: "1382", title: "Responsabilité civile", status: "completed" },
    { ...MOCK_ARTICLE, id: "art-227", number: "227", title: "Atteintes à l'administration publique", status: "pending" }
  ];

  return (
    <div className="space-y-8 pb-12">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-6 pt-4">
        <Button variant="outline" size="icon" asChild className="mt-1 bg-card/50 hover:bg-card">
          <Link href="/library">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <Badge className="mb-3 bg-primary/20 text-primary border-none uppercase tracking-wider font-bold">Code Juridique</Badge>
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">{code.name}</h1>
          <p className="text-muted-foreground mt-3 text-lg max-w-3xl leading-relaxed">{code.description}</p>
        </div>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-4 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Table des Matières</h2>
          <span className="text-sm font-medium text-muted-foreground">3 articles disponibles</span>
        </div>

        {articles.map((article) => (
          <motion.div variants={item} key={article.id}>
            <Link href={`/learn/${article.id}`}>
              <Card className="hover:border-primary/50 hover:shadow-md transition-all group cursor-pointer bg-card/50 backdrop-blur-sm">
                <CardContent className="p-0">
                  <div className="flex items-center p-6 gap-6">
                    <div className="flex-shrink-0">
                      {article.status === "completed" && <CheckCircle2 className="w-8 h-8 text-primary" />}
                      {article.status === "in_progress" && (
                        <div className="relative">
                          <Circle className="w-8 h-8 text-accent" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3 h-3 bg-accent rounded-full animate-pulse"></div>
                          </div>
                        </div>
                      )}
                      {article.status === "pending" && <Circle className="w-8 h-8 text-muted-foreground/30" />}
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-bold border-border bg-background">Art. {article.number}</Badge>
                        <CardTitle className="text-xl group-hover:text-primary transition-colors">{article.title}</CardTitle>
                      </div>
                      <CardDescription className="line-clamp-1 text-base mt-2">
                        {article.official_text}
                      </CardDescription>
                    </div>

                    <div className="flex-shrink-0 flex flex-col items-end gap-2">
                      <div className="bg-primary/10 p-3 rounded-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <FileText className="h-5 w-5" />
                      </div>
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
