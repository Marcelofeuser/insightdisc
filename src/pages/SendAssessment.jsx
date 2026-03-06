import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Send, 
  Mail, 
  Copy, 
  Check, 
  Plus, 
  X,
  Users,
  Link as LinkIcon,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { generateInviteToken, hashInviteToken } from '@/modules/invites/invite-token';

export default function SendAssessment() {
  const [workspace, setWorkspace] = useState(null);
  const [emails, setEmails] = useState(['']);
  const [customMessage, setCustomMessage] = useState('');
  const [generatedLinks, setGeneratedLinks] = useState([]);
  const [linkCount, setLinkCount] = useState(1);
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadWorkspace();
  }, []);

  const loadWorkspace = async () => {
    try {
      const user = await base44.auth.me();
      if (user.active_workspace_id) {
        const workspaces = await base44.entities.Workspace.filter({ 
          id: user.active_workspace_id 
        });
        if (workspaces.length > 0) {
          setWorkspace(workspaces[0]);
        }
      }
    } catch (error) {
      console.error('Error loading workspace:', error);
    }
  };

  const addEmailField = () => {
    setEmails([...emails, '']);
  };

  const removeEmailField = (index) => {
    const newEmails = emails.filter((_, i) => i !== index);
    setEmails(newEmails.length ? newEmails : ['']);
  };

  const updateEmail = (index, value) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const handleSendEmails = async () => {
    const validEmails = emails.filter(e => e && e.includes('@'));
    if (validEmails.length === 0) {
      setError('Por favor, insira pelo menos um email válido');
      return;
    }

    if (workspace && workspace.credits_balance < validEmails.length) {
      setError(`Créditos insuficientes. Você tem ${workspace.credits_balance} créditos e precisa de ${validEmails.length}.`);
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const user = await base44.auth.me();
      const baseUrl = window.location.origin;

      for (const email of validEmails) {
        const token = generateInviteToken();
        const tokenHash = await hashInviteToken(token);
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
        
        // Create pending assessment
        const created = await base44.entities.Assessment.create({
          user_id: email,
          type: 'premium',
          status: 'pending',
          professional_id: user.id,
          workspace_id: workspace?.id,
          access_token: token,
          access_token_hash: tokenHash,
          invite_status: 'active',
          invite_expires_at: expiresAt,
        });

        if (!created?.id) {
          throw new Error('Falha ao criar assessment para convite');
        }
        console.log('[SendAssessment] invite created', { assessmentId: created.id, email, expiresAt });

        // Send email
        const assessmentUrl = `${baseUrl}/c/invite?token=${encodeURIComponent(token)}`;
        
        await base44.integrations.Core.SendEmail({
          to: email,
          subject: 'Você foi convidado para uma Avaliação DISC',
          body: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4f46e5;">Avaliação Comportamental DISC</h2>
              <p>Olá,</p>
              <p>Você foi convidado(a) para realizar uma avaliação comportamental DISC.</p>
              ${customMessage ? `<p><em>"${customMessage}"</em></p>` : ''}
              <p>Clique no botão abaixo para iniciar:</p>
              <a href="${assessmentUrl}" style="display: inline-block; background: linear-gradient(to right, #4f46e5, #7c3aed); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                Iniciar Avaliação
              </a>
              <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
                O teste leva aproximadamente 15 minutos para ser concluído.
              </p>
            </div>
          `
        });
      }

      // Update workspace credits
      if (workspace) {
        await base44.entities.Workspace.update(workspace.id, {
          credits_balance: (workspace.credits_balance || 0) - validEmails.length
        });
      }

      setEmails(['']);
      setCustomMessage('');
      alert(`${validEmails.length} convite(s) enviado(s) com sucesso!`);
    } catch (error) {
      console.error('Error sending invites:', error);
      setError('Erro ao enviar convites. Tente novamente.');
    } finally {
      setIsSending(false);
    }
  };

  const handleGenerateLinks = async () => {
    if (workspace && workspace.credits_balance < linkCount) {
      setError(`Créditos insuficientes. Você tem ${workspace.credits_balance} créditos.`);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const user = await base44.auth.me();
      const baseUrl = window.location.origin;
      const newLinks = [];

      for (let i = 0; i < linkCount; i++) {
        const token = generateInviteToken();
        const tokenHash = await hashInviteToken(token);
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
        
        const created = await base44.entities.Assessment.create({
          user_id: 'pending',
          type: 'premium',
          status: 'pending',
          professional_id: user.id,
          workspace_id: workspace?.id,
          access_token: token,
          access_token_hash: tokenHash,
          invite_status: 'active',
          invite_expires_at: expiresAt,
        });

        if (!created?.id) {
          throw new Error('Falha ao criar assessment para link');
        }
        console.log('[SendAssessment] link created', { assessmentId: created.id, expiresAt });

        newLinks.push({
          token,
          url: `${baseUrl}/c/invite?token=${encodeURIComponent(token)}`,
          created_at: new Date().toISOString()
        });
      }

      // Update workspace credits
      if (workspace) {
        await base44.entities.Workspace.update(workspace.id, {
          credits_balance: (workspace.credits_balance || 0) - linkCount
        });
        setWorkspace({
          ...workspace,
          credits_balance: (workspace.credits_balance || 0) - linkCount
        });
      }

      setGeneratedLinks([...newLinks, ...generatedLinks]);
    } catch (error) {
      console.error('Error generating links:', error);
      setError('Erro ao gerar links. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Enviar Avaliação</h1>
              <p className="text-sm text-slate-500">
                Créditos disponíveis: <span className="font-semibold text-indigo-600">{workspace?.credits_balance || 0}</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4 text-red-500" />
            </button>
          </motion.div>
        )}

        <Tabs defaultValue="email" className="space-y-6">
          <TabsList className="bg-slate-100 p-1 rounded-xl">
            <TabsTrigger value="email" className="rounded-lg flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Enviar por Email
            </TabsTrigger>
            <TabsTrigger value="link" className="rounded-lg flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              Gerar Links
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Convidar por Email
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Emails dos participantes</Label>
                  {emails.map((email, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="email@exemplo.com"
                        value={email}
                        onChange={(e) => updateEmail(index, e.target.value)}
                        className="rounded-xl"
                      />
                      {emails.length > 1 && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => removeEmailField(index)}
                          className="rounded-xl"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={addEmailField}
                    className="rounded-xl"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar outro email
                  </Button>
                </div>

                <div className="space-y-3">
                  <Label>Mensagem personalizada (opcional)</Label>
                  <Textarea
                    placeholder="Adicione uma mensagem para os participantes..."
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="rounded-xl min-h-[100px]"
                  />
                </div>

                <Button
                  onClick={handleSendEmails}
                  disabled={isSending || !emails.some(e => e.includes('@'))}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl h-12"
                >
                  {isSending ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                      />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Convites
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="link">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="w-5 h-5" />
                  Gerar Links de Acesso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Quantidade de links</Label>
                  <div className="flex gap-3">
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={linkCount}
                      onChange={(e) => setLinkCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="rounded-xl w-32"
                    />
                    <Button
                      onClick={handleGenerateLinks}
                      disabled={isGenerating}
                      className="bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                    >
                      {isGenerating ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                          />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Gerar Links
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {generatedLinks.length > 0 && (
                  <div className="space-y-3">
                    <Label>Links gerados</Label>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {generatedLinks.map((link, index) => (
                        <motion.div
                          key={link.token}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl"
                        >
                          <Input
                            value={link.url}
                            readOnly
                            className="text-sm bg-white rounded-lg"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => copyToClipboard(link.url, index)}
                            className="rounded-lg flex-shrink-0"
                          >
                            {copied === index ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
