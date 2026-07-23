'use client';

import React, { useEffect, useRef } from 'react';
import Matter from 'matter-js';
import { QuestionOption } from '@/types/trilha';

type PhysicsKeywordSelectorProps = {
  options: QuestionOption[];
  selectedLabels: string[];
  onToggleSelect: (label: string) => void;
};

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = context.measureText(currentLine + ' ' + word).width;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

// Cores temáticas elegantes
const BUBBLE_PALETTES = [
  { from: '#60A5FA', to: '#3B82F6', shadow: 'rgba(59,130,246,0.25)', stroke: 'rgba(191,219,254,0.8)' },
  { from: '#A78BFA', to: '#7C3AED', shadow: 'rgba(124,58,237,0.25)', stroke: 'rgba(221,214,254,0.8)' },
  { from: '#34D399', to: '#059669', shadow: 'rgba(5,150,105,0.25)', stroke: 'rgba(167,243,208,0.8)' },
  { from: '#FB923C', to: '#EA580C', shadow: 'rgba(234,88,12,0.25)', stroke: 'rgba(254,215,170,0.8)' },
  { from: '#F472B6', to: '#DB2777', shadow: 'rgba(219,39,119,0.25)', stroke: 'rgba(251,207,232,0.8)' },
  { from: '#38BDF8', to: '#0284C7', shadow: 'rgba(2,132,199,0.25)', stroke: 'rgba(186,230,253,0.8)' },
  { from: '#FBBF24', to: '#D97706', shadow: 'rgba(217,119,6,0.25)', stroke: 'rgba(253,230,138,0.8)' },
];

export default function PhysicsKeywordSelector({
  options,
  selectedLabels,
  onToggleSelect
}: PhysicsKeywordSelectorProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);

  const bodyLabelMap = useRef<Map<number, string>>(new Map());
  const bodyOptionMap = useRef<Map<number, QuestionOption>>(new Map());
  const bodyPaletteMap = useRef<Map<number, number>>(new Map());
  const expandedBodies = useRef<Set<number>>(new Set());
  const subBodiesMap = useRef<Map<number, number>>(new Map());
  const parentIdMap = useRef<Map<number, number>>(new Map());

  const selectedLabelsRef = useRef<string[]>(selectedLabels);
  useEffect(() => {
    selectedLabelsRef.current = selectedLabels;
  }, [selectedLabels]);

  useEffect(() => {
    if (!sceneRef.current) return;

    const Engine = Matter.Engine,
          Render = Matter.Render,
          Runner = Matter.Runner,
          Bodies = Matter.Bodies,
          Composite = Matter.Composite,
          Mouse = Matter.Mouse,
          MouseConstraint = Matter.MouseConstraint,
          Events = Matter.Events,
          Body = Matter.Body,
          Constraint = Matter.Constraint;

    const engine = Engine.create();
    engineRef.current = engine;
    const world = engine.world;

    engine.gravity.y = 0;
    engine.gravity.x = 0;

    const width = sceneRef.current.clientWidth || 800;
    const height = sceneRef.current.clientHeight || 500;
    const centerX = width / 2;
    const centerY = height / 2;

    const render = Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width,
        height,
        background: 'transparent',
        wireframes: false,
        pixelRatio: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1
      }
    });
    renderRef.current = render;

    // Paredes invisíveis com fricção e ressalto suave
    const wallOpts = { isStatic: true, render: { visible: false }, restitution: 0.2, friction: 0.1 };
    Composite.add(world, [
      Bodies.rectangle(width / 2, height + 30, width + 100, 60, wallOpts),
      Bodies.rectangle(width / 2, -30, width + 100, 60, wallOpts),
      Bodies.rectangle(-30, height / 2, 60, height + 100, wallOpts),
      Bodies.rectangle(width + 30, height / 2, 60, height + 100, wallOpts),
    ]);

    const createBubble = (opt: QuestionOption, x: number, y: number, radius: number, paletteIdx: number, isSub: boolean) => {
      const body = Bodies.circle(x, y, radius, {
        restitution: 0.25,
        friction: 0.04,
        frictionAir: 0.09,
        render: { visible: false }
      });

      (body as any).circleRadius = radius;
      (body as any).initialRadius = radius;
      (body as any).targetRadius = radius;
      (body as any).radiusVelocity = 0;

      bodyLabelMap.current.set(body.id, opt.label);
      bodyOptionMap.current.set(body.id, opt);
      bodyPaletteMap.current.set(body.id, paletteIdx);
      if (isSub) subBodiesMap.current.set(body.id, paletteIdx);

      return body;
    };

    // Spawn inicial em espiral
    const count = options.length;
    const initialBodies = options.map((opt, i) => {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      const spiralR = count <= 3 ? 90 : 130;
      const x = centerX + Math.cos(angle) * spiralR + (Math.random() * 20 - 10);
      const y = centerY + Math.sin(angle) * spiralR + (Math.random() * 20 - 10);
      const radius = count <= 3 ? 72 : count <= 5 ? 65 : 58;
      return createBubble(opt, x, y, radius, i % BUBBLE_PALETTES.length, false);
    });

    Composite.add(world, initialBodies);

    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: { stiffness: 0.15, render: { visible: false } }
    });
    Composite.add(world, mouseConstraint);
    render.mouse = mouse;

    // Transições de escala físicas e forças no loop beforeUpdate
    Events.on(engine, 'beforeUpdate', () => {
      const allBodies = Composite.allBodies(world);
      allBodies.forEach(body => {
        if (body.isStatic) return;

        // 1. Animação de escala suavizada por mola física (Spring)
        const targetR = (body as any).targetRadius;
        const currentR = (body as any).circleRadius;
        if (targetR && Math.abs(targetR - currentR) > 0.05) {
          const k = 0.14; // Rigidez da mola
          const damping = 0.68; // Amortecimento
          
          (body as any).radiusVelocity = ((body as any).radiusVelocity || 0) + (targetR - currentR) * k;
          (body as any).radiusVelocity *= damping;
          
          const nextR = currentR + (body as any).radiusVelocity;
          const scaleFactor = nextR / currentR;
          
          // Aplica escala física no MatterJS
          if (scaleFactor > 0.01 && !isNaN(scaleFactor)) {
            Body.scale(body, scaleFactor, scaleFactor);
            (body as any).circleRadius = nextR;
          }
        }

        // 2. Gravidade central (atração suave para o centro)
        const dx = centerX - body.position.x;
        const dy = centerY - body.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 5) {
          const force = 0.000014 * body.mass * dist;
          Body.applyForce(body, body.position, {
            x: (dx / dist) * force,
            y: (dy / dist) * force
          });
        }
      });
    });

    Events.on(mouseConstraint, 'mousedown', function(event) {
      const pos = event.mouse.position;
      const allBodies = Composite.allBodies(world);
      const hit = Matter.Query.point(allBodies, pos);

      if (hit.length > 0) {
        const clicked = hit.find(b => !b.isStatic);
        if (!clicked) return;

        const label = bodyLabelMap.current.get(clicked.id);
        const opt = bodyOptionMap.current.get(clicked.id);
        const paletteIdx = bodyPaletteMap.current.get(clicked.id) ?? 0;
        const isSub = subBodiesMap.current.has(clicked.id);

        if (!label || !opt) return;

        onToggleSelect(label);

        // Se for sub-bolha, apenas aplica um leve impulso de toque
        if (isSub) {
          Body.applyForce(clicked, clicked.position, {
            x: (Math.random() - 0.5) * 0.02 * clicked.mass,
            y: (Math.random() - 0.5) * 0.02 * clicked.mass
          });
          return;
        }

        const isExpanded = expandedBodies.current.has(clicked.id);

        if (!isExpanded) {
          // Expandir
          expandedBodies.current.add(clicked.id);
          
          // Dispara crescimento suave via targetRadius
          (clicked as any).targetRadius = (clicked as any).initialRadius * 1.35;
          
          // Impulso de impacto para afastar vizinhos
          Body.applyForce(clicked, clicked.position, {
            x: (Math.random() - 0.5) * 0.01 * clicked.mass,
            y: -0.03 * clicked.mass
          });

          // Spawnar sub-bolhas
          if (opt.subOptions && opt.subOptions.length > 0) {
            const subCount = opt.subOptions.length;
            const parentRadius = (clicked as any).circleRadius;
            
            const subBodies = opt.subOptions.map((subOpt, idx) => {
              const a = (Math.PI * 2 / subCount) * idx - Math.PI / 2;
              
              // Nasce perto da borda do pai para "surgir de dentro" de forma fluida
              const spawnDist = parentRadius + 5;
              const sx = clicked.position.x + Math.cos(a) * spawnDist;
              const sy = clicked.position.y + Math.sin(a) * spawnDist;

              const sub = createBubble(subOpt, sx, sy, 42, paletteIdx, true);
              parentIdMap.current.set(sub.id, clicked.id);

              // Força propulsora para fora
              Body.applyForce(sub, sub.position, {
                x: Math.cos(a) * 0.032 * sub.mass,
                y: Math.sin(a) * 0.032 * sub.mass
              });

              // Mola de conexão invisível (Constraint) para manter em órbita dinâmica
              const orbitR = parentRadius * 1.35 + 45;
              const link = Constraint.create({
                bodyA: clicked,
                bodyB: sub,
                length: orbitR,
                stiffness: 0.022, // Mola super elástica e macia
                damping: 0.04,
                render: { visible: false }
              });

              // Registra a restrição no mundo
              Composite.add(world, link);

              return sub;
            });

            Composite.add(world, subBodies);
          }
        } else {
          // Colapsar
          expandedBodies.current.delete(clicked.id);
          (clicked as any).targetRadius = (clicked as any).initialRadius;

          // Remove sub-bolhas e suas molas
          const children = allBodies.filter(b => parentIdMap.current.get(b.id) === clicked.id);
          children.forEach(child => {
            // Remove restrições associadas
            const childLinks = world.constraints.filter(c => c.bodyB === child || c.bodyA === child);
            childLinks.forEach(c => Composite.remove(world, c));
            
            Composite.remove(world, child);
            bodyLabelMap.current.delete(child.id);
            bodyOptionMap.current.delete(child.id);
            bodyPaletteMap.current.delete(child.id);
            subBodiesMap.current.delete(child.id);
            parentIdMap.current.delete(child.id);
          });
        }
      }
    });

    // Custom render loop (Premium Visuals)
    Events.on(render, 'afterRender', () => {
      const context = render.context;
      if (!context) return;

      const allBodies = Composite.allBodies(world);
      
      allBodies.forEach((body) => {
        if (body.isStatic) return;

        const label = bodyLabelMap.current.get(body.id) || '';
        const isSelected = selectedLabelsRef.current.includes(label);
        const isExpanded = expandedBodies.current.has(body.id);
        const isSub = subBodiesMap.current.has(body.id);
        const paletteIdx = bodyPaletteMap.current.get(body.id) ?? 0;
        const palette = BUBBLE_PALETTES[paletteIdx % BUBBLE_PALETTES.length];
        const radius = (body as any).circleRadius || 60;
        const { x, y } = body.position;

        context.save();
        context.beginPath();
        context.arc(x, y, radius, 0, 2 * Math.PI);
        context.clip();

        // 1. Pintar gradiente radial estilo Vidro 3D
        if (isSelected) {
          const grad = context.createRadialGradient(
            x - radius * 0.35, y - radius * 0.35, radius * 0.05,
            x + radius * 0.1, y + radius * 0.1, radius * 1.05
          );
          grad.addColorStop(0, palette.from);
          grad.addColorStop(1, palette.to);
          context.fillStyle = grad;
        } else if (isSub) {
          const grad = context.createRadialGradient(
            x - radius * 0.3, y - radius * 0.3, 0,
            x, y, radius
          );
          grad.addColorStop(0, 'rgba(255,255,255,0.97)');
          grad.addColorStop(1, 'rgba(241,245,249,0.92)');
          context.fillStyle = grad;
        } else {
          const grad = context.createRadialGradient(
            x - radius * 0.3, y - radius * 0.3, 0,
            x, y, radius
          );
          if (isExpanded) {
            grad.addColorStop(0, 'rgba(239,246,255,1)');
            grad.addColorStop(1, 'rgba(219,234,254,1)');
          } else {
            grad.addColorStop(0, 'rgba(255,255,255,1)');
            grad.addColorStop(1, 'rgba(241,245,249,0.98)');
          }
          context.fillStyle = grad;
        }

        context.fill();
        context.restore();

        // 2. Traçar Borda e Sombras
        context.save();
        context.beginPath();
        context.arc(x, y, radius, 0, 2 * Math.PI);

        if (isSelected) {
          context.strokeStyle = 'rgba(255,255,255,0.6)';
          context.lineWidth = 2.5;
          context.shadowBlur = 22;
          context.shadowColor = palette.shadow;
        } else if (isSub) {
          context.strokeStyle = palette.stroke;
          context.lineWidth = 1.5;
          context.setLineDash([4, 4]);
        } else {
          context.strokeStyle = isExpanded ? palette.stroke : 'rgba(203,213,225,0.7)';
          context.lineWidth = 1.2;
          context.shadowBlur = isExpanded ? 16 : 8;
          context.shadowColor = isExpanded ? palette.shadow : 'rgba(0,0,0,0.03)';
        }

        context.stroke();
        context.restore();

        // 3. Efeito de brilho especular (lente de vidro)
        if (!isSub) {
          context.save();
          context.beginPath();
          context.arc(x - radius * 0.28, y - radius * 0.3, radius * 0.22, 0, 2 * Math.PI);
          context.fillStyle = isSelected
            ? 'rgba(255,255,255,0.22)'
            : 'rgba(255,255,255,0.75)';
          context.fill();
          context.restore();
        }

        // 4. Desenhar texto com quebra de linha inteligente
        context.save();
        const fontSize = radius < 44 ? 10 : radius < 58 ? 11 : 12;
        context.font = isSelected
          ? `700 ${fontSize}px Inter, -apple-system, sans-serif`
          : `500 ${fontSize}px Inter, -apple-system, sans-serif`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        if (isSelected) {
          context.fillStyle = '#FFFFFF';
          context.shadowBlur = 4;
          context.shadowColor = 'rgba(0,0,0,0.15)';
        } else if (isSub) {
          context.fillStyle = palette.to;
        } else {
          context.fillStyle = isExpanded ? palette.to : '#334155';
        }

        const maxWidth = radius * 1.55;
        const lines = wrapText(context, label, maxWidth);
        const lineH = fontSize + 5;
        const startY = y - ((lines.length - 1) * lineH) / 2;

        lines.forEach((line, i) => {
          context.fillText(line, x, startY + i * lineH);
        });

        context.restore();
      });
    });

    Render.run(render);
    const runner = Runner.create();
    runnerRef.current = runner;
    Runner.run(runner, engine);

    return () => {
      Render.stop(render);
      Runner.stop(runner);
      if (engineRef.current) Engine.clear(engineRef.current);
      if (render.canvas) render.canvas.remove();
      render.canvas = null as any;
      render.context = null as any;
      render.textures = {};
    };
  }, [options]);

  return (
    <div className="w-full overflow-hidden rounded-[28px] border border-border/40 bg-gradient-to-b from-[#F8FAFF] to-[#F1F5F9] relative shadow-[inset_0_1px_2px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.04)]" style={{ height: 'clamp(380px, 50vh, 520px)' }}>
      <div ref={sceneRef} className="h-full w-full touch-none" />
      <div className="absolute bottom-4 left-0 w-full pointer-events-none flex justify-center">
        <span className="px-4 py-1.5 rounded-full bg-white/80 backdrop-blur-sm text-[11px] font-semibold text-slate-400 border border-slate-200/80 uppercase tracking-wider shadow-sm select-none">
          Toque para expandir · selecione todos que se aplicam
        </span>
      </div>
    </div>
  );
}
