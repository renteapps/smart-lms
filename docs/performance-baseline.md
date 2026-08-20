# Baseline de performance

Medição inicial de 20/08/2026, obtida dos manifests de referência do cliente após build de produção:

| Rota | JS bruto | JS gzip | Meta desta revisão |
| --- | ---: | ---: | ---: |
| `/` | 1072,5 KiB | 329,7 KiB | no máximo 247,3 KiB gzip |
| `/blog` | 1000,5 KiB | 307,7 KiB | no máximo 184,6 KiB gzip |
| `/courses/[id]/lessons/[lessonId]` | 2135,5 KiB | 641,7 KiB | no máximo 417,1 KiB gzip |

Execute `npm run build && npm run perf:bundles` para comparar. O script soma uma única vez cada chunk referenciado pelo manifest da rota.

## Resultado desta revisão

| Rota | JS gzip final | Variação | Situação da meta |
| --- | ---: | ---: | --- |
| `/` | 287,1 KiB | -12,9% | melhoria confirmada; meta de -25% não atingida |
| `/blog` | 257,3 KiB | -16,4% | melhoria confirmada; meta de -40% não atingida |
| `/courses/[id]/lessons/[lessonId]` | 299,4 KiB | -53,3% | meta de -35% superada |

As funções autenticadas do header, notificações, áudio e assistente foram mantidas na home e no blog; removê-las reduziria mais o manifest, mas alteraria o comportamento atual. O blog passou de renderização dinâmica para conteúdo estático/SSG.
