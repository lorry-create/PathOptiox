
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Headset, User, Send, Zap } from 'lucide-react';
import type { ChatMessage } from '@services';
import { chatApi } from '@services';
import { useGlobalStore } from '@stores/useGlobalStore';

type ExtendedMessage = ChatMessage & { type?: 'chat' | 'system' };

interface AIChatPanelProps {
  orderContext?: string;
  agentTrigger?: number;
  orderId?: string;
}

const AGENT_PROMPT_TEMPLATE = (orderId: string) =>
  `用户点击了重路由诊断按钮。请你以系统底层 AI 调度引擎的身份，输出一份简短、硬核的重路由执行报告。包含以下三点：1. 正在扫描路网拓扑... 2. 发现原航线（海运）存在严重拥堵和天气风险；3. 已生成 PPO 备选方案：建议在【洛杉矶】节点截断，转为【空运】直飞【法兰克福】。预计增加成本 $240，挽回延误 3 天。请用极简的、带有科技感和终端输出风格的语言回答。当前诊断订单：${orderId}`;

const AIChatPanel: React.FC<AIChatPanelProps> = ({ orderContext, agentTrigger = 0, orderId = '' }) => {
  const [messages, setMessages] = useState<ExtendedMessage[]>([
    {
      id: '1',
      sender: 'bot',
      text: '您好！我是您的智能物流管家，您可以输入订单号查询物流状态，或咨询运费、时效、清关等问题。',
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      type: 'chat',
    },
    {
      id: '2',
      sender: 'user',
      text: 'CN82991022 现在到哪了',
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      type: 'chat',
    },
    {
      id: '3',
      sender: 'bot',
      text: '该订单当前运输至鹿特丹港清关中，预计2天后完成派送，途经区域存在恶劣天气预警，可能延误1-2天。',
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      type: 'chat',
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const prevTriggerRef = useRef(agentTrigger);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [messages]);

  // S1-T04 修复：使用 chatApi.streamMessage 调用 /api/chat/stream 真实 SSE 端点
  // 每个 chunk 增量追加到目标消息文本，实现逐 token 流式渲染
  const streamLLMResponse = useCallback(async (
    prompt: string,
    assistantId: string,
    context?: string,
    isAgentCall = false
  ) => {
    const history = messages
      .filter(m => m.id !== '1' && m.type !== 'system')
      .map(m => ({
        role: m.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: m.text,
      }));

    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);

    let accumulated = '';
    try {
      const ragEnabled = useGlobalStore.getState().ragEnabled;

      await chatApi.streamMessage(
        prompt,
        (chunk: string) => {
          // 增量追加文本，触发组件重渲染
          accumulated += chunk;
          setMessages(prev =>
            prev.map(m => m.id === assistantId ? { ...m, text: accumulated } : m)
          );
        },
        controller.signal,
        {
          history,
          context: isAgentCall ? undefined : context,
          rag_enabled: ragEnabled,
        }
      );
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        const errorMsg = err instanceof Error ? err.message : '未知通信错误';
        console.error('[Chat] SSE 请求失败:', errorMsg);
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId && m.text === ''
              ? { ...m, text: `[通信异常] ${errorMsg}` }
              : m
          )
        );
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [messages]);

  useEffect(() => {
    if (agentTrigger <= 0 || agentTrigger === prevTriggerRef.current) return;
    prevTriggerRef.current = agentTrigger;

    const currentOrderId = orderId;
    const systemMsgId = `sys-${Date.now()}`;
    const assistantId = `agent-${Date.now()}`;

    setMessages(prev => [
      ...prev,
      {
        id: systemMsgId,
        sender: 'bot',
        text: `⚡ 接收到管理员指令：正在唤醒 PPO 强化学习引擎，评估订单 ${currentOrderId} 的重路由方案...`,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        type: 'system',
      },
      {
        id: assistantId,
        sender: 'bot',
        text: '',
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        type: 'chat',
      }
    ]);

    setTimeout(() => {
      streamLLMResponse(AGENT_PROMPT_TEMPLATE(currentOrderId), assistantId, undefined, true);
    }, 50);
  }, [agentTrigger, orderId, streamLLMResponse]);

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userText = inputText.trim();
    const userMessage: ExtendedMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      type: 'chat',
    };

    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [
      ...prev,
      userMessage,
      {
        id: assistantId,
        sender: 'bot',
        text: '',
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        type: 'chat',
      }
    ]);
    setInputText('');
    // 走真实后端 SSE：streamLLMResponse 内部会设置 isLoading，完成后自动复位
    streamLLMResponse(userText, assistantId, orderContext, false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="bg-bg-tertiary rounded-2xl md:rounded-[32px] border border-border-default p-4 md:p-8 flex flex-col h-[500px] md:h-[600px] shadow-2xl relative overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 md:mb-8">
        <div className="flex items-center gap-2 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600/20 rounded-xl md:rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/20">
            <Headset size={20} className="md:hidden" />
            <Headset size={24} className="hidden md:block" />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-black text-text-primary tracking-tight">7×24h 智能在线</h3>
            <p className="text-[10px] md:text-xs text-text-muted font-bold">
              {isLoading ? 'AI 正在思考...' : 'AI 已就绪，为您实时解答'}
            </p>
          </div>
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-6 pr-2 scrollbar-hide">
        {messages.map((message) => {
          if (message.type === 'system') {
            return (
              <div key={message.id} className="flex justify-center">
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-2.5 flex items-center gap-2 max-w-lg">
                  <Zap size={12} className="text-amber-400 animate-pulse shrink-0" />
                  <p className="text-[11px] text-amber-400/90 font-mono font-bold leading-relaxed">{message.text}</p>
                </div>
              </div>
            );
          }

          return (
            <div key={message.id} className={`flex gap-4 items-start ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${message.sender === 'user' ? 'bg-bg-tertiary text-text-muted' : 'bg-blue-600/20 border border-blue-500/20 text-blue-400'}`}>
                {message.sender === 'user' ? <User size={16} /> : <Headset size={16} />}
              </div>
              <div className={`space-y-1 ${message.sender === 'user' ? 'text-right' : ''}`}>
                <div className={`p-4 rounded-2xl max-w-lg text-sm leading-relaxed whitespace-pre-wrap ${message.sender === 'user' ? 'bg-brand-primary/10 text-text-primary font-medium shadow-lg shadow-blue-600/20 rounded-tr-none inline-block' : 'bg-bg-secondary border border-border-default rounded-tl-none'}`}>
                  {message.text || (
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  )}
                </div>
                <div className={`text-[10px] text-text-muted font-bold ${message.sender === 'user' ? 'mr-1' : 'ml-1'}`}>
                  {message.timestamp}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="mt-4 md:mt-8 relative">
        <input
          type="text"
          placeholder="输入您的问题..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={isLoading}
          className="w-full bg-bg-elevated border border-border-input rounded-2xl pl-6 pr-16 py-5 text-sm text-text-secondary focus:outline-none focus:border-blue-500 transition-all duration-300 shadow-inner disabled:opacity-50"
        />
        <button
          onClick={(e) => { e.preventDefault(); sendMessage(); }}
          disabled={isLoading || !inputText.trim()}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default AIChatPanel;
