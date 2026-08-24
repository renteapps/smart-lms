'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { BarChart3, Award, RotateCcw, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProfileCategory } from '@/types/profileTest';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface ResultPayload {
  winner: ProfileCategory | null;
  percentages: Array<{ category: ProfileCategory; score: number; percentage: number }>;
}

export default function DiagnosticResultPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = React.use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ResultPayload | null>(null);
  const [testMeta, setTestMeta] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    async function processResult() {
      const storageKey = `pending_diagnostic_${resolvedParams.slug}`;
      const storedResult = localStorage.getItem(storageKey);
      
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Fluxo livre: as respostas já estão no navegador e só falta a conta
        // para liberar (e guardar) o diagnóstico.
        const target = encodeURIComponent(`/diagnostico/${resolvedParams.slug}/resultado`);
        if (storedResult) {
          toast.info('Crie sua conta gratuita para ver o seu diagnóstico.');
          router.push(`/criar-conta?redirect=${target}`);
        } else {
          router.push(`/acessar?redirect=${target}`);
        }
        return;
      }

      // If we have a pending result in localStorage, save it to the DB
      if (storedResult) {
        try {
          const parsedResult = JSON.parse(storedResult) as ResultPayload;
          setResult(parsedResult);
          
          const { data: testData } = await supabase
              .from('profile_tests')
              .select('id, title')
              .eq('slug', resolvedParams.slug)
              .single();

          if (testData) setTestMeta(testData);

          if (parsedResult.winner && testData) {
            // Save to DB
            const { saveProfileTestResult } = await import('@/app/actions/profile');
            
            const payload = {
              testId: testData.id,
              testTitle: testData.title,
              categoryId: parsedResult.winner.id,
              categoryName: parsedResult.winner.name,
              scores: parsedResult.percentages.map(p => ({
                categoryId: p.category.id,
                categoryName: p.category.name,
                score: p.score,
                percentage: p.percentage
              })),
              completedAt: new Date().toISOString()
            };
            
            await saveProfileTestResult(payload);
            // Clean up localStorage
            localStorage.removeItem(storageKey);
          }
        } catch (error) {
          console.error("Failed to parse or save result:", error);
          toast.error("Erro ao salvar resultado do teste.");
        } finally {
          setLoading(false);
        }
      } else {
        // If there's no pending result, check if the user already has a result in the DB
        try {
          const { data: testData } = await supabase
            .from('profile_tests')
            .select('id, title')
            .eq('slug', resolvedParams.slug)
            .single();

          if (testData) {
            setTestMeta(testData);
            const { data: existingResult } = await supabase
              .from('profile_test_results')
              .select('category_id, category_name, scores')
              .eq('user_id', user.id)
              .eq('test_id', testData.id)
              .single();
              
            if (existingResult) {
               // Map back to ResultPayload format for UI
               // We don't have the full category emoji/color in the result table,
               // so we need to either fetch the test definition or create a mock winner object.
               // We can fetch the test definition!
               const { data: fullTest } = await supabase.from('profile_tests').select('categories').eq('id', testData.id).single();
               
               if (fullTest) {
                  const categories = (fullTest.categories as ProfileCategory[]) || [];
                  const winnerCat = categories.find(c => c.id === existingResult.category_id) || {
                    id: existingResult.category_id,
                    name: existingResult.category_name,
                    description: '', emoji: '🏆', color: '#000'
                  };
                  
                  const mappedScores = (existingResult.scores as any[] || []).map(s => {
                     const cat = categories.find(c => c.id === s.categoryId) || {
                       id: s.categoryId, name: s.categoryName, description: '', emoji: '⭐', color: '#666'
                     };
                     return { category: cat, score: s.score, percentage: s.percentage };
                  });
                  
                  setResult({ winner: winnerCat as ProfileCategory, percentages: mappedScores });
               }
            } else {
               // No result found, redirect to test
               router.push(`/diagnostico/${resolvedParams.slug}`);
               return;
            }
          }
        } catch (error) {
           console.error("Failed to fetch existing result:", error);
        } finally {
           setLoading(false);
        }
      }
    }

    processResult();
  }, [resolvedParams.slug, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!result || !result.winner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg text-center">
        <div>
          <h1 className="text-xl font-bold mb-2">Resultado Indisponível</h1>
          <p className="text-muted">Não conseguimos carregar o seu resultado.</p>
          <Button className="mt-4" onClick={() => router.push(`/diagnostico/${resolvedParams.slug}`)}>
            Refazer Teste
          </Button>
        </div>
      </div>
    );
  }

  const { winner, percentages } = result;
  
  // Decide if we should show percentages based on data availability
  const hasPercentages = percentages && percentages.length > 0;

  return (
    <div className="min-h-screen bg-surface flex flex-col pt-12 pb-24 overflow-y-auto px-6">
      <div className="max-w-2xl mx-auto w-full flex flex-col items-center text-center space-y-8">
        
        <div className="space-y-4 w-full">
          <span className="text-xs font-bold text-muted uppercase tracking-widest block animate-pulse">
            Análise Concluída
          </span>
          
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
            className="w-28 h-28 mx-auto rounded-4xl flex items-center justify-center text-6xl shadow-xl border-4 border-surface"
            style={{ backgroundColor: `${winner.color}20`, color: winner.color, outline: `2px solid ${winner.color}` }}
          >
            {winner.emoji}
          </motion.div>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <span className="text-sm font-bold text-muted uppercase tracking-wider block mb-2">
            Seu Perfil Dominante é:
          </span>
          <h3 className="text-4xl sm:text-5xl font-display font-black leading-tight" style={{ color: winner.color }}>
            {winner.name}
          </h3>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="w-full space-y-6"
        >
          {/* PERCENTAGE DIAGNOSTIC SECTION */}
          {hasPercentages && (
            <div className="bg-background-secondary border border-border/50 rounded-3xl p-6 sm:p-8 space-y-5 text-left">
              <h4 className="font-bold text-sm text-foreground uppercase tracking-wide flex items-center justify-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5 text-accent" />
                Seu Diagnóstico Completo
              </h4>
              
              <div className="space-y-4">
                {percentages.map((item, index) => (
                  <div key={item.category.id} className="space-y-1.5 relative group">
                    <div className="flex justify-between items-end text-sm">
                      <span className="font-bold flex items-center gap-1.5" style={{ color: item.category.color }}>
                        <span>{item.category.emoji}</span>
                        <span>{item.category.name}</span>
                      </span>
                      <span className="font-black text-foreground">{item.percentage}%</span>
                    </div>
                    <div className="w-full bg-border/40 rounded-full h-2.5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percentage}%` }}
                        transition={{ duration: 1, delay: 0.8 + (index * 0.1), ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: item.category.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ALWAYS SHOW THE DOMINANT CATEGORY DETAILS */}
          <div className="bg-background-secondary border border-border/50 rounded-3xl p-6 sm:p-8 text-left space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: winner.color }} />
            <h4 className="font-bold text-sm text-muted uppercase tracking-wide flex items-center gap-2">
              <Award className="w-5 h-5" style={{ color: winner.color }} />
              Detalhes do seu perfil
            </h4>
            <p className="text-foreground leading-relaxed text-sm sm:text-base">
              {winner.description}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="pt-4 flex flex-col sm:flex-row gap-4 justify-center w-full"
        >
          <Button
            variant="default"
            size="lg"
            className="rounded-full px-8 py-4 shadow-xl shadow-accent/20 flex-1 sm:flex-none"
            onClick={() => router.push('/perfil')}
          >
            Ir para o meu Perfil
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="gap-2 rounded-full px-8 py-4 flex-1 sm:flex-none"
            onClick={async () => {
              const { sendProfileTestResultEmail } = await import('@/app/actions/profile');
              const toastId = toast.loading("Enviando e-mail...");
              
              const payload = {
                testId: testMeta?.id ?? '',
                testTitle: testMeta?.title ?? 'Teste de Perfil',
                categoryId: winner.id,
                categoryName: winner.name,
                scores: percentages.map(p => ({
                  categoryId: p.category.id,
                  categoryName: p.category.name,
                  score: p.score,
                  percentage: p.percentage
                })),
                completedAt: new Date().toISOString()
              };

              const res = await sendProfileTestResultEmail(payload);
              if (res.success) {
                toast.success("E-mail enviado com sucesso!", { id: toastId });
              } else {
                toast.error(res.message || "Erro ao enviar e-mail.", { id: toastId });
              }
            }}
          >
            <Mail className="size-4" aria-hidden="true" />
            Receber por E-mail
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="gap-2 rounded-full px-8 py-4 flex-1 sm:flex-none"
            onClick={() => router.push(`/diagnostico/${resolvedParams.slug}`)}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Refazer o Teste
          </Button>
        </motion.div>

      </div>
    </div>
  );
}
