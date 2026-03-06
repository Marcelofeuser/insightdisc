import React, { useEffect } from 'react';
import { MessageCircle, RotateCcw, Send, X } from 'lucide-react';
import { useInsightChatbot } from '@/modules/chatbot/useInsightChatbot';
import { useToast } from '@/components/ui/use-toast';

function fieldInput(field, value, onChange, error) {
  const baseClass =
    'w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-indigo-200';
  const className = `${baseClass} ${error ? 'border-red-300' : 'border-slate-200'}`;

  if (field.type === 'textarea') {
    return (
      <textarea
        id={`chat-field-${field.name}`}
        className={className}
        rows={3}
        value={value}
        onChange={(event) => onChange(field.name, event.target.value)}
      />
    );
  }

  if (field.type === 'select') {
    return (
      <select
        id={`chat-field-${field.name}`}
        className={className}
        value={value}
        onChange={(event) => onChange(field.name, event.target.value)}
      >
        <option value="">Selecione...</option>
        {(field.options || []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      id={`chat-field-${field.name}`}
      className={className}
      type={field.type === 'email' ? 'email' : 'text'}
      value={value}
      onChange={(event) => onChange(field.name, event.target.value)}
    />
  );
}

export default function InsightChatWidget() {
  const { toast } = useToast();
  const {
    config,
    currentNode,
    currentFormValues,
    fieldErrors,
    history,
    isOpen,
    toggleChat,
    closeChat,
    selectOption,
    updateFormValue,
    submitLeadForm,
    resetConversation,
    submissionNotice,
    clearSubmissionNotice,
  } = useInsightChatbot();

  useEffect(() => {
    if (!submissionNotice?.message) return;
    toast({
      title: 'Lead registrado',
      description: submissionNotice.message,
    });
    clearSubmissionNotice();
  }, [clearSubmissionNotice, submissionNotice, toast]);

  if (!config?.settings?.showOnAllPages) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[45] flex flex-col items-end gap-3">
      {isOpen ? (
        <section className="w-[min(92vw,380px)] rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.22)] overflow-hidden">
          <header className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-white">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold">{config.name}</h3>
                <p className="text-xs text-indigo-100">Pré-atendimento automático</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={resetConversation}
                  className="rounded-lg p-1.5 text-indigo-100 hover:bg-white/15 hover:text-white transition"
                  title="Reiniciar conversa"
                  aria-label="Reiniciar conversa"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={closeChat}
                  className="rounded-lg p-1.5 text-indigo-100 hover:bg-white/15 hover:text-white transition"
                  title="Fechar chat"
                  aria-label="Fechar chat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </header>

          <div className="max-h-[52vh] overflow-y-auto bg-slate-50 px-4 py-4 space-y-3">
            {history.map((message) => (
              <div
                key={message.id}
                className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  message.role === 'user'
                    ? 'ml-auto bg-indigo-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-700'
                }`}
              >
                {message.text}
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 bg-white px-4 py-3 space-y-2">
            {currentNode?.type === 'message' ? (
              <>
                {(currentNode.options || []).map((option) => (
                  <button
                    key={`${option.label}-${option.next || option.action || ''}`}
                    type="button"
                    onClick={() => selectOption(option)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 transition"
                  >
                    {option.label}
                  </button>
                ))}
              </>
            ) : null}

            {currentNode?.type === 'lead_form' ? (
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitLeadForm();
                }}
              >
                {(currentNode.fields || []).map((field) => {
                  const value = currentFormValues[field.name] || '';
                  const error = fieldErrors[field.name];
                  return (
                    <div key={field.name}>
                      <label
                        htmlFor={`chat-field-${field.name}`}
                        className="mb-1 block text-xs font-semibold text-slate-600"
                      >
                        {field.label}
                        {field.required ? ' *' : ''}
                      </label>
                      {fieldInput(field, value, updateFormValue, error)}
                      {error ? (
                        <p className="mt-1 text-xs text-red-600">{error}</p>
                      ) : null}
                    </div>
                  );
                })}

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                >
                  <Send className="h-4 w-4" />
                  Enviar dados
                </button>
              </form>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="group flex items-center gap-2">
        {!isOpen ? (
          <div className="hidden rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-lg sm:block">
            Fale no WhatsApp
          </div>
        ) : null}
        <button
          type="button"
          onClick={toggleChat}
          className={`relative inline-flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_12px_30px_rgba(99,102,241,0.38)] transition ${
            isOpen
              ? 'bg-slate-800 hover:bg-slate-900'
              : 'bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700'
          }`}
          aria-label={isOpen ? 'Fechar assistente' : 'Abrir assistente'}
          data-testid="insight-chat-toggle"
          title={isOpen ? 'Fechar assistente' : 'Abrir assistente'}
        >
          {!isOpen ? (
            <span className="absolute -inset-1 -z-10 rounded-full bg-indigo-500/30 animate-ping" />
          ) : null}
          {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        </button>
      </div>
    </div>
  );
}
