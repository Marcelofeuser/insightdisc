import { sendToSynapsys } from "@/modules/synapsys/api/synapsysClient";
import { useEffect, useMemo, useRef, useState } from 'react';
import './synapsys-chat-experience.css';

const FALLBACK_RESPONSES = [
  'Seu perfil <strong>D/I</strong> combina velocidade de decisão com carisma. Em liderança, isso gera times que se movem rápido — o desafio é criar espaço para perfis S e C processarem antes de executar.',
  'Perfis <strong>C</strong> precisam de dados, não entusiasmo. Compartilhe contexto com antecedência, seja preciso nos números e dê tempo de análise. Isso constrói credibilidade duradoura.',
  'A <strong>sinapse D→S</strong> é a mais produtiva quando há respeito mútuo: D define a visão com urgência, S entrega com consistência. O conflito surge quando D pressiona sem escutar.',
  'Desenvolvimento DISC não é mudar quem você é — é <strong>expandir o repertório</strong>. Um D que aprende a pausar antes de decidir não perde força: ganha precisão.',
  'Equipes com <strong>diversidade de perfis</strong> são significativamente mais resilientes. Seu papel como D é criar clareza de direção — deixe o S sustentar o ritmo e o C garantir a qualidade.',
  'Em negociação, perfis D/I têm vantagem natural na abertura. O risco é fechar antes de ouvir — <strong>a pergunta certa vale mais que o argumento certo</strong>.',
];

const OVERLAP_DIST = 200;

function uid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function stripHtml(value = '') {
  return String(value || '').replace(/<[^>]+>/g, '').trim();
}

function escapeHtml(value = '') {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function textSide(y, size, height) {
  return y + size + 90 > height ? 'above' : 'below';
}

function toResponseHtml(value = '') {
  const safe = escapeHtml(String(value || '').trim());
  return safe.replace(/\n/g, '<br />');
}

function responseFromResult(result) {
  const candidates = [
    result?.output,
    result?.content,
    result?.text,
    result?.message,
    result?.analysis,
    result?.result,
    result?.data?.output,
    result?.data?.content,
    result?.data?.text,
  ];

  const first = candidates.find((item) => String(item || '').trim());
  if (first) return toResponseHtml(first);
  return '';
}

function buildUsageLabel(usageState, tier) {
  if (tier === 'premium') return 'uso contínuo';
  const remaining = Number(usageState?.remaining ?? 0);
  const limit = Number(usageState?.totalLimit ?? usageState?.limit ?? 0);
  return `${remaining}/${limit} livres hoje`;
}

function buildRecentSeed() {
  return [
    { id: uid(), name: 'Perfil D/I em liderança', date: 'hoje, 09:14' },
    { id: uid(), name: 'Comunicação com perfis C', date: 'ontem' },
    { id: uid(), name: 'Gestão de equipe diversa', date: '12 abr' },
    { id: uid(), name: 'Análise de candidatos', date: '10 abr' },
  ];
}

function applyOverlapFade(list) {
  const next = list.map((item) => ({ ...item }));
  for (let i = 0; i < next.length - 1; i += 1) {
    if (next[i].hidden) continue;
    for (let j = i + 1; j < next.length; j += 1) {
      const dx = next[i].x - next[j].x;
      const dy = next[i].y - next[j].y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < OVERLAP_DIST) {
        next[i].hidden = true;
        break;
      }
    }
  }
  return next;
}

export default function SynapsysNeuralChat({
  tier = 'free',
  usageState = null,
  onConsumeMessage = null,
  onUpgradeRequest = null,
  onRewardedUnlock = null,
  rewardedReady = false,
  analyze = null,
}) {
  const centerRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(0);
  const stateRef = useRef({
    W: 0,
    H: 0,
    frontierAngle: Math.random() * Math.PI * 2,
    responseIndex: 0,
    activeInputNodeId: null,
    ambients: [],
    particles: [],
  });
  const nodesRef = useRef([]);
  const [leftInput, setLeftInput] = useState('');
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [history, setHistory] = useState([]);
  const [recents, setRecents] = useState(buildRecentSeed());
  const [flashList, setFlashList] = useState([]);
  const [thinkingList, setThinkingList] = useState([]);
  const [highlightNodeId, setHighlightNodeId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [feedPairs, setFeedPairs] = useState([]);
  const [loginMenuOpen, setLoginMenuOpen] = useState(false);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const usageLabel = useMemo(() => buildUsageLabel(usageState, tier), [usageState, tier]);

  function initAmbients() {
    const { W, H } = stateRef.current;
    stateRef.current.ambients = Array.from({ length: 20 }, () => ({
      x: Math.random() * Math.max(W, 1),
      y: Math.random() * Math.max(H, 1),
      r: Math.random() * 2 + 0.8,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      phase: Math.random() * Math.PI * 2,
      col: Math.random() > 0.5 ? '26,111,187' : '13,158,120',
    }));
  }

  function resize() {
    const center = centerRef.current;
    const canvas = canvasRef.current;
    if (!center || !canvas) return;
    const W = center.clientWidth;
    const H = center.clientHeight;
    stateRef.current.W = W;
    stateRef.current.H = H;
    canvas.width = W;
    canvas.height = H;
  }

  function directedPos(fromX, fromY, existingNodes) {
    const { W, H } = stateRef.current;
    const minDist = 190;
    const spreadAngle = Math.PI / 2.5;

    for (let a = 0; a < 100; a += 1) {
      const angle =
        stateRef.current.frontierAngle +
        (Math.random() - 0.5) * spreadAngle * (1 + a * 0.04);

      const dist = 180 + Math.random() * 120;
      const x = fromX + Math.cos(angle) * dist;
      const y = fromY + Math.sin(angle) * dist;
      const m = 90;

      if (x < m || x > W - m || y < m || y > H - m) continue;

      let ok = true;
      for (const n of existingNodes) {
        const dx = n.x - x;
        const dy = n.y - y;
        if (Math.sqrt(dx * dx + dy * dy) < minDist) {
          ok = false;
          break;
        }
      }

      if (ok) {
        const actualAngle = Math.atan2(y - fromY, x - fromX);
        stateRef.current.frontierAngle = actualAngle + (Math.random() - 0.5) * 0.3;
        return { x, y };
      }
    }

    stateRef.current.frontierAngle += Math.PI * 0.4;
    const m = 100;
    return {
      x: m + Math.random() * Math.max(W - m * 2, 1),
      y: m + Math.random() * Math.max(H - m * 2.5, 1),
    };
  }

  function fallbackResponse() {
    const idx = stateRef.current.responseIndex % FALLBACK_RESPONSES.length;
    stateRef.current.responseIndex += 1;
    return FALLBACK_RESPONSES[idx];
  }

  function newInputNode(x, y) {
    const id = uid();
    stateRef.current.activeInputNodeId = id;
    return {
      id,
      x,
      y,
      type: 'input',
      value: '',
      disabled: false,
      fading: false,
      hidden: false,
    };
  }

  function flash(x, y, color) {
    const id = uid();
    setFlashList((prev) => [...prev, { id, x, y, color }]);
    window.setTimeout(() => {
      setFlashList((prev) => prev.filter((item) => item.id !== id));
    }, 750);
  }

  function addThinking(x, y) {
    const id = uid();
    setThinkingList((prev) => [...prev, { id, x, y }]);
    return id;
  }

  function removeThinking(id) {
    setThinkingList((prev) => prev.filter((item) => item.id !== id));
  }

  function addHistory(question, nodeId) {
    setHistory((prev) => [...prev, { id: uid(), nodeId, text: question }]);
    setRecents((prev) => [
      {
        id: uid(),
        name: question.slice(0, 32) + (question.length > 32 ? '…' : ''),
        date: 'agora',
      },
      ...prev.slice(0, 7),
    ]);
  }

  function addFeedPair(question, answer) {
    const plain = answer.replace(/<[^>]+>/g, '');
    const preview = plain.length > 160 ? plain.slice(0, 160).trimEnd() : plain;
    setFeedPairs(prev => [{ id: uid(), question, answer: plain, preview, expanded: false }, ...prev]);
  }

 async function runAnalyze(question) {
  try {
    const result = await sendToSynapsys(question);
    return responseFromResult(result) || fallbackResponse();
  } catch {
    if (typeof analyze === 'function') {
      try {
        const result = await analyze({
          input: question,
          message: question,
          prompt: question,
          mode: 'builder',
        });
        return responseFromResult(result) || fallbackResponse();
      } catch {
        return fallbackResponse();
      }
    }

    return fallbackResponse();
  }
}

  function resetBrain() {
    resize();
    initAmbients();
    stateRef.current.frontierAngle = Math.random() * Math.PI * 2;
    stateRef.current.responseIndex = 0;
    stateRef.current.activeInputNodeId = null;
    setConnections([]);
    setHistory([]);
    setRecents(buildRecentSeed());
    setFlashList([]);
    setThinkingList([]);
    setBusy(false);
    const initNode = newInputNode(stateRef.current.W / 2, stateRef.current.H / 2);
    setNodes([initNode]);
  }

  useEffect(() => {
    resize();
    initAmbients();
    resetBrain();

    const onResize = () => {
      resize();
      initAmbients();
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      const { W, H, ambients, particles } = stateRef.current;
      ctx.clearRect(0, 0, W, H);
      frame += 1;

      ambients.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
      });

      for (let i = 0; i < ambients.length; i += 1) {
        for (let j = i + 1; j < ambients.length; j += 1) {
          const a = ambients[i];
          const b = ambients[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 100) {
            ctx.strokeStyle = `rgba(30,90,150,${(1 - d / 100) * 0.1})`;
            ctx.lineWidth = 0.4;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      ambients.forEach((n) => {
        const p = (Math.sin(frame * 0.04 + n.phase) + 1) / 2;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * (0.7 + p * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${n.col},${0.15 + p * 0.2})`;
        ctx.fill();
      });

      connections.forEach((c) => {
        ctx.strokeStyle = `rgba(${c.col},0.55)`;
        ctx.lineWidth = 0.9;
        ctx.setLineDash([7, 5]);
        ctx.beginPath();
        ctx.moveTo(c.x1, c.y1);
        ctx.lineTo(c.x2, c.y2);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i];
        if (p.done) {
          particles.splice(i, 1);
          continue;
        }
        p.delay -= 16;
        if (p.delay > 0) continue;

        p.t = Math.min(p.t + 0.038, 1);
        const t = p.t;
        const mt = 1 - t;
        const x = mt * mt * p.x + 2 * mt * t * p.mx + t * t * p.tx;
        const y = mt * mt * p.y + 2 * mt * t * p.my + t * t * p.ty;
        const alpha = t < 0.75 ? 1 : (1 - t) / 0.25;

        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.col;
        ctx.globalAlpha = alpha * 0.9;
        ctx.fill();
        ctx.globalAlpha = 1;

        if (p.t >= 1) p.done = true;
      }

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationRef.current);
  }, [connections]);

  function shoot(x1, y1, x2, y2, col) {
    const n = 14;
    for (let i = 0; i < n; i += 1) {
      const delay = i * (1100 / n);
      const jx = (Math.random() - 0.5) * 50;
      const jy = (Math.random() - 0.5) * 50;
      stateRef.current.particles.push({
        x: x1,
        y: y1,
        tx: x2,
        ty: y2,
        mx: (x1 + x2) / 2 + jx,
        my: (y1 + y2) / 2 + jy,
        col,
        t: 0,
        delay,
        size: Math.random() * 3 + 1.5,
        done: false,
      });
    }
  }

  async function handleSend(fromNodeId, rawQuestion) {
    const question = String(rawQuestion || '').trim();
    if (!question || busy) return;

    const sourceNode = nodesRef.current.find((item) => item.id === fromNodeId);
    if (!sourceNode) return;

    setBusy(true);

    if (tier !== 'premium' && typeof onConsumeMessage === 'function') {
      const permission = onConsumeMessage();
      if (!permission?.allowed) {
        const limitText = rewardedReady
          ? 'Seu limite gratuito acabou por hoje. Faça upgrade para continuar ou use o bônus disponível.'
          : 'Seu limite gratuito acabou por hoje. Faça upgrade para liberar uso contínuo da Synapsys.';
        const qPos = directedPos(sourceNode.x, sourceNode.y, nodesRef.current);
        const aPos = directedPos(qPos.x, qPos.y, [...nodesRef.current, { x: qPos.x, y: qPos.y }]);
        const nextPos = directedPos(aPos.x, aPos.y, [
          ...nodesRef.current,
          { x: qPos.x, y: qPos.y },
          { x: aPos.x, y: aPos.y },
        ]);

        setNodes((prev) => {
          const disabled = prev.map((item) =>
            item.id === fromNodeId ? { ...item, disabled: true, fading: true } : item
          );
          const qNode = { id: uid(), x: qPos.x, y: qPos.y, type: 'question', questionText: question, hidden: false };
          const aNode = {
            id: uid(),
            x: aPos.x,
            y: aPos.y,
            type: 'answer',
            text: `<strong>Limite atingido.</strong><br />${escapeHtml(limitText)}`,
            hidden: false,
          };
          const nNode = newInputNode(nextPos.x, nextPos.y);
          addHistory(question, qNode.id);
          return applyOverlapFade([...disabled, qNode, aNode, nNode]);
        });

        setConnections((prev) => [
          ...prev,
          { id: uid(), x1: sourceNode.x, y1: sourceNode.y, x2: qPos.x, y2: qPos.y, col: '26,111,187' },
          { id: uid(), x1: qPos.x, y1: qPos.y, x2: aPos.x, y2: aPos.y, col: '13,158,120' },
          { id: uid(), x1: aPos.x, y1: aPos.y, x2: nextPos.x, y2: nextPos.y, col: '26,111,187' },
        ]);

        shoot(sourceNode.x, sourceNode.y, qPos.x, qPos.y, '#50c8ff');
        shoot(qPos.x, qPos.y, aPos.x, aPos.y, '#30f0c0');
        shoot(aPos.x, aPos.y, nextPos.x, nextPos.y, '#50c8ff');
        flash(sourceNode.x, sourceNode.y, '#50c8ff');
        flash(qPos.x, qPos.y, '#50c8ff');
        flash(aPos.x, aPos.y, '#30f0c0');
        flash(nextPos.x, nextPos.y, '#50c8ff');
        setBusy(false);
        return;
      }
    }

    const currentNodes = nodesRef.current;
    const qPos = directedPos(sourceNode.x, sourceNode.y, currentNodes);
    const aPos = directedPos(qPos.x, qPos.y, [...currentNodes, { x: qPos.x, y: qPos.y }]);
    const nextPos = directedPos(aPos.x, aPos.y, [
      ...currentNodes,
      { x: qPos.x, y: qPos.y },
      { x: aPos.x, y: aPos.y },
    ]);

    const qNode = {
      id: uid(),
      x: qPos.x,
      y: qPos.y,
      type: 'question',
      questionText: question,
      hidden: false,
    };

    addHistory(question, qNode.id);

    setNodes((prev) =>
      prev.map((item) =>
        item.id === fromNodeId ? { ...item, disabled: true, fading: true } : item
      )
    );

    setConnections((prev) => [
      ...prev,
      { id: uid(), x1: sourceNode.x, y1: sourceNode.y, x2: qPos.x, y2: qPos.y, col: '26,111,187' },
    ]);

    shoot(sourceNode.x, sourceNode.y, qPos.x, qPos.y, '#50c8ff');
    flash(sourceNode.x, sourceNode.y, '#50c8ff');

    window.setTimeout(() => {
      setNodes((prev) => applyOverlapFade([...prev, qNode]));
      flash(qPos.x, qPos.y, '#50c8ff');
    }, 350);

    const thinkingId = addThinking(qPos.x, qPos.y);
    const startAt = Date.now();
    const answerHtml = await runAnalyze(question);
    const elapsed = Date.now() - startAt;
    const waitMore = Math.max(0, 850 - elapsed);

    window.setTimeout(() => {
      removeThinking(thinkingId);

      const answerNode = {
        id: uid(),
        x: aPos.x,
        y: aPos.y,
        type: 'answer',
        text: answerHtml,
        hidden: false,
      };
      const nextInput = newInputNode(nextPos.x, nextPos.y);

      addFeedPair(question, answerHtml);
      setConnections((prev) => [
        ...prev,
        { id: uid(), x1: qPos.x, y1: qPos.y, x2: aPos.x, y2: aPos.y, col: '13,158,120' },
        { id: uid(), x1: aPos.x, y1: aPos.y, x2: nextPos.x, y2: nextPos.y, col: '26,111,187' },
      ]);

      shoot(qPos.x, qPos.y, aPos.x, aPos.y, '#30f0c0');
      shoot(aPos.x, aPos.y, nextPos.x, nextPos.y, '#50c8ff');

      setNodes((prev) => applyOverlapFade([...prev, answerNode, nextInput]));
      flash(aPos.x, aPos.y, '#30f0c0');
      window.setTimeout(() => flash(nextPos.x, nextPos.y, '#50c8ff'), 180);
      setBusy(false);
    }, waitMore);
  }

  function copyText(text) {
    const plain = stripHtml(text);
    navigator.clipboard?.writeText(plain).catch(() => {});
  }

  function retryAnswer(nodeId) {
    setNodes((prev) =>
      prev.map((item) =>
        item.id === nodeId && item.type === 'answer'
          ? { ...item, text: fallbackResponse() }
          : item
      )
    );
  }

  function focusNode(nodeId) {
    setHighlightNodeId(nodeId);
    window.setTimeout(() => setHighlightNodeId(null), 900);
  }

  return (
    <div className="synapsys-neural-root">
      <div className="left-sidebar">
        <div className="ls-header">
          <div className="ls-title">FLUXO DE CONVERSA</div>
          <div className="ls-input-wrap">
            <textarea
              className="ls-textarea"
              id="ls-input"
              placeholder="digite sua pergunta aqui..."
              value={leftInput}
              onChange={(e) => setLeftInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  const active = stateRef.current.activeInputNodeId;
                  if (active) {
                    handleSend(active, leftInput);
                    setLeftInput('');
                  }
                }
              }}
            />
            <button
              className="ls-send"
              id="ls-send-btn"
              disabled={busy}
              onClick={() => {
                const active = stateRef.current.activeInputNodeId;
                if (!active) return;
                handleSend(active, leftInput);
                setLeftInput('');
              }}
            >
              disparar sinapse ↗
            </button>
          </div>
        </div>

        <div className="ls-feed" id="ls-feed">
          {feedPairs.map((pair) => (
            <div className="feed-pair" key={pair.id}>
              <div className="feed-item q">{pair.question}</div>
              <div className="feed-item a">
                {pair.expanded ? pair.answer : pair.preview}
                {pair.answer.length > 160 && (
                  <button className="feed-expand" onClick={() =>
                    setFeedPairs(prev => prev.map(p => p.id === pair.id ? {...p, expanded: !p.expanded} : p))
                  }>{pair.expanded ? 'recolher' : 'ver tudo'}</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="center" id="center" ref={centerRef}>
        <canvas id="neural-canvas" ref={canvasRef} />
        <div id="nodes-layer">
          {nodes.map((node) => {
            const size = node.type === 'input' ? 24 : 19;
            const side = textSide(node.y, size, stateRef.current.H || 900);
            const highlighted = highlightNodeId === node.id;
            const isInput = node.type === 'input';
            const isQuestion = node.type === 'question';
            const isAnswer = node.type === 'answer';
            const bubbleStyle = {
              left: `${node.x}px`,
              top: `${node.y}px`,
              opacity: node.hidden ? 0 : node.fading ? 0.35 : 1,
              boxShadow: highlighted ? '0 0 36px 12px rgba(80,200,255,0.28)' : 'none',
            };

            return (
              <div className="node-bubble" key={node.id} style={bubbleStyle}>
                <div
                  className="node-glow"
                  style={{
                    width: `${size * 2}px`,
                    height: `${size * 2}px`,
                    background: isAnswer ? 'rgba(13,158,120,0.18)' : 'rgba(26,111,187,0.2)',
                    boxShadow: isAnswer
                      ? '0 0 20px 7px rgba(48,240,192,0.8)'
                      : '0 0 34px 14px rgba(80,200,255,0.55)',
                  }}
                >
                  <div
                    className="node-core"
                    style={{
                      width: `${size * 0.65}px`,
                      height: `${size * 0.65}px`,
                      background: isAnswer ? '#0d9e78' : '#1a6fbb',
                      boxShadow: isAnswer
                        ? '0 0 14px 5px rgba(48,240,192,0.95)'
                        : '0 0 14px 5px rgba(80,200,255,0.95)',
                    }}
                  />
                </div>

                {isQuestion && (
                  <div className={`node-q-text ${side}`}>
                    {node.questionText}
                  </div>
                )}

                {isInput && (
                  <div className={`node-input-wrap ${side}`}>
                    <textarea
                      className="node-input"
                      placeholder="próxima pergunta..."
                      value={node.value}
                      disabled={node.disabled || busy}
                      onChange={(e) => {
                        const value = e.target.value;
                        setNodes((prev) =>
                          prev.map((item) =>
                            item.id === node.id ? { ...item, value } : item
                          )
                        );
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend(node.id, node.value);
                        }
                      }}
                    />
                    <button
                      className="node-send"
                      disabled={node.disabled || busy}
                      onClick={() => handleSend(node.id, node.value)}
                    >
                      disparar sinapse ↗
                    </button>
                  </div>
                )}

                {isAnswer && (
                  <div className={`node-text ${side}`}>
                    <div dangerouslySetInnerHTML={{ __html: node.text }} />
                    <div className="node-actions">
                      <button
                        type="button"
                        className="na-btn"
                        onClick={() => copyText(node.text)}
                      >
                        copiar
                      </button>
                      <button
                        type="button"
                        className="na-btn"
                        onClick={() => retryAnswer(node.id)}
                      >
                        ↺ refazer
                      </button>
                      <button type="button" className="na-btn">👍</button>
                      <button type="button" className="na-btn">👎</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {flashList.map((item) => (
            <div
              key={item.id}
              className="synapse-flash"
              style={{
                left: `${item.x}px`,
                top: `${item.y}px`,
                width: '52px',
                height: '52px',
                background: `radial-gradient(circle, ${item.color} 0%, transparent 70%)`,
              }}
            />
          ))}

          {thinkingList.flatMap((item) => [
            <div
              key={`${item.id}-1`}
              className="thinking-ring"
              style={{ left: `${item.x}px`, top: `${item.y}px`, width: '44px', height: '44px', animationDelay: '0s' }}
            />,
            <div
              key={`${item.id}-2`}
              className="thinking-ring"
              style={{ left: `${item.x}px`, top: `${item.y}px`, width: '44px', height: '44px', animationDelay: '0.38s' }}
            />,
            <div
              key={`${item.id}-3`}
              className="thinking-ring"
              style={{ left: `${item.x}px`, top: `${item.y}px`, width: '44px', height: '44px', animationDelay: '0.76s' }}
            />,
          ])}
        </div>

        <div className="hint">sinapses crescem sempre para frente</div>
      </div>

      <div className="right-sidebar">
        <button type="button" className="new-brain-btn" onClick={resetBrain}>
          <div className="brain-icon-wrap"><div className="brain-dot" /></div>
          <div>
            <div className="nb-label">Novo Cérebro</div>
            <div className="nb-sub">iniciar nova sessão</div>
          </div>
        </button>

        <div className="rs-section">NAVEGAÇÃO</div>
        <button type="button" className="rs-item">
          <span className="rs-icon">💬</span>
          <span className="rs-label">Conversas</span>
        </button>
        <button type="button" className="rs-item">
          <span className="rs-icon">📁</span>
          <span className="rs-label">Projetos</span>
        </button>
        <button type="button" className="rs-item">
          <span className="rs-icon">🔍</span>
          <span className="rs-label">Procurar</span>
        </button>

        <div className="rs-divider" />

        <div className="rs-section">STATUS</div>
        <div className="recent-item">
          <div className="ri-name">{tier === 'premium' ? 'camada premium ativa' : 'camada gratuita ativa'}</div>
          <div className="ri-date">{usageLabel}</div>
        </div>

        {tier !== 'premium' && (
          <button type="button" className="recent-item recent-action" onClick={onUpgradeRequest || (() => {})}>
            <div className="ri-name">destravar premium</div>
            <div className="ri-date">contexto maior + uso contínuo</div>
          </button>
        )}

        {tier !== 'premium' && rewardedReady && typeof onRewardedUnlock === 'function' && (
          <button type="button" className="recent-item recent-action" onClick={onRewardedUnlock}>
            <div className="ri-name">liberar bônus</div>
            <div className="ri-date">adicionar mensagens extras</div>
          </button>
        )}

        <div className="rs-divider" />

        <div className="rs-section">CÉREBROS RECENTES</div>
        <div id="recent-list">
          {recents.map((item) => (
            <div className="recent-item" key={item.id}>
              <div className="ri-name">{item.name}</div>
              <div className="ri-date">{item.date}</div>
            </div>
          ))}
        </div>

        <div className="rs-spacer" />

        <div className="login-area">
          <div className={`login-menu${loginMenuOpen ? ' open' : ''}`}>
            <div className="lm-user">
              <div className="lm-name">{user?.name || user?.full_name || 'Usuário'}</div>
              <div className="lm-email">{user?.email || ''}</div>
            </div>
            <button type="button" className="lm-item"><span className="lm-icon">⚙️</span>Configurações</button>
            <button type="button" className="lm-item"><span className="lm-icon">❓</span>Receber ajuda</button>
            <div className="lm-divider" />
            <button type="button" className="lm-item" onClick={onUpgradeRequest || (() => {})}>
              <span className="lm-icon">📋</span>Ver planos
            </button>
            <div className="lm-divider" />
            <button type="button" className="lm-item danger" onClick={() => { setLoginMenuOpen(false); }}>
              <span className="lm-icon">↪</span>Sair
            </button>
          </div>
          <button type="button" className="login-btn" onClick={() => setLoginMenuOpen(v => !v)}>
            <div className="login-avatar">
              {(user?.name || user?.full_name || 'U').slice(0,2).toUpperCase()}
            </div>
            <div className="login-info">
              <div className="login-name">{user?.name || user?.full_name || 'Usuário'}</div>
              <div className="login-email">{user?.email || ''}</div>
            </div>
            <span className="login-arrow">⌃</span>
          </button>
        </div>
      </div>
    </div>
  );
}
